import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { normalizeLocalPhone } from '@/lib/phone';

type PhoneLoginStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'used';

function phoneLoginEmail(phone: string): string {
  return `phone-${phone}@bekastore.local`;
}

const MAX_REQUESTS_PER_WINDOW = 20;
const WINDOW_MINUTES = 10;

function randomCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String((values[0] ?? 0) % 1_000_000).padStart(6, '0');
}

async function adminDb() {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  return supabaseAdmin;
}

/** Creates a pending phone sign-in request and returns the code the customer sends on WhatsApp. */
export const startPhoneLogin = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ phone: z.string().max(30) }).parse(input))
  .handler(async ({ data }) => {
    const phone = normalizeLocalPhone(data.phone);
    if (!phone) {
      return { ok: false as const, error: 'invalid_phone' };
    }

    const db = await adminDb();

    const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
    const { count, error: counterError } = await db
      .from('phone_login_requests')
      .select('id', { count: 'exact', head: true })
      .eq('phone', phone)
      .gte('created_at', since);

    if (counterError) {
      return { ok: false as const, error: `counter_error: ${counterError.message}` };
    }

    if ((count ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
      return { ok: false as const, error: 'too_many_requests' };
    }

    const code = randomCode();
    const { data: row, error } = await db
      .from('phone_login_requests')
      .insert({ phone, code })
      .select('id, expires_at')
      .single();

    if (error || !row) {
      return { ok: false as const, error: `insert_error: ${error?.message ?? 'insert_failed'}` };
    }

    return {
      ok: true as const,
      requestId: row.id,
      phone,
      code,
      expiresAt: row.expires_at,
    };
  });

async function findOrCreatePhoneUser(phone: string): Promise<string> {
  const db = await adminDb();
  const email = phoneLoginEmail(phone);

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (profileError) throw new Error(profileError.message);

  if (profile) {
    const { data: existing, error } = await db.auth.admin.getUserById(profile.id);
    if (error) throw new Error(error.message);
    if (existing.user?.email) return existing.user.email;
    // Older phone-only accounts get the internal address so they can sign in this way.
    const { error: updateError } = await db.auth.admin.updateUserById(profile.id, {
      email,
      email_confirm: true,
    });
    if (updateError) throw new Error(updateError.message);
    return email;
  }

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { phone_login: true },
  });

  if (createError && !/already\s*registered|exists/i.test(createError.message)) {
    throw new Error(createError.message);
  }

  const userId = created?.user?.id;
  if (userId) {
    const { error: phoneError } = await db
      .from('profiles')
      .update({ phone, email: null })
      .eq('id', userId);
    if (phoneError) throw new Error(phoneError.message);
  }

  return email;
}

/** Polled by the customer's browser; once the store approves, returns a one-time sign-in token. */
export const checkPhoneLogin = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ requestId: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<{ status: PhoneLoginStatus; tokenHash?: string }> => {
    const db = await adminDb();
    const { data: row, error } = await db
      .from('phone_login_requests')
      .select('id, phone, status, expires_at')
      .eq('id', data.requestId)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!row || row.status === 'used') return { status: 'expired' };
    if (row.status === 'rejected') return { status: 'rejected' };
    if (row.status === 'pending') {
      return { status: new Date(row.expires_at).getTime() <= Date.now() ? 'expired' : 'pending' };
    }

    // Approved: claim it once so the same approval cannot sign in twice.
    const { data: claimed, error: claimError } = await db
      .from('phone_login_requests')
      .update({ status: 'used' })
      .eq('id', row.id)
      .eq('status', 'approved')
      .select('id')
      .maybeSingle();

    if (claimError) throw new Error(claimError.message);
    if (!claimed) return { status: 'expired' };

    try {
      const email = await findOrCreatePhoneUser(row.phone);
      const { data: link, error: linkError } = await db.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
      if (linkError || !link.properties?.hashed_token) {
        throw new Error(linkError?.message ?? 'link_failed');
      }
      return { status: 'approved', tokenHash: link.properties.hashed_token };
    } catch (err) {
      await db.from('phone_login_requests').update({ status: 'approved' }).eq('id', row.id);
      throw err;
    }
  });
