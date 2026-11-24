import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';
import { normalizeLocalPhone } from '@/lib/phone';

type PhoneLoginStatus = 'pending' | 'approved' | 'rejected' | 'expired' | 'used';

function phoneLoginEmail(phone: string): string {
  return `phone-${phone}@bekastore.local`;
}

const MAX_REQUESTS_PER_WINDOW = 10;
const WINDOW_MINUTES = 10;

function randomCode(): string {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String((values[0] ?? 0) % 1_000_000).padStart(6, '0');
}

function getEnv(name: string): string {
  const val = process.env[name];
  return typeof val === 'string' ? val.trim() : '';
}

function formatErr(err: unknown): string {
  if (!err) return 'empty_error';
  if (err instanceof Error) {
    const causeMsg = err.cause instanceof Error ? err.cause.message : err.cause ? String(err.cause) : '';
    return `${err.name}: ${err.message}${causeMsg ? ` (cause: ${causeMsg})` : ''}`;
  }
  if (typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    const parts = [obj.code, obj.message, obj.details, obj.hint].filter(Boolean);
    if (parts.length > 0) return parts.join(' | ');
    try {
      return JSON.stringify(err);
    } catch {
      return 'unserializable_object';
    }
  }
  return String(err);
}

function adminDb() {
  const url =
    getEnv('SUPABASE_URL') ||
    getEnv('VITE_SUPABASE_URL') ||
    getEnv('PUBLIC_SUPABASE_URL');
  const serviceKey =
    getEnv('SUPABASE_SERVICE_ROLE_KEY') ||
    getEnv('SUPABASE_SECRET_KEY') ||
    getEnv('SERVICE_ROLE_KEY');

  if (!url) {
    throw new Error('missing_supabase_url');
  }
  if (!serviceKey) {
    throw new Error('missing_service_role_key');
  }

  return createClient(url, serviceKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Creates a pending phone sign-in request and returns the code the customer sends on WhatsApp. */
export const startPhoneLogin = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => z.object({ phone: z.string().max(30) }).parse(input))
  .handler(async ({ data }) => {
    try {
      const phone = normalizeLocalPhone(data.phone);
      if (!phone) {
        return { ok: false as const, error: 'invalid_phone' };
      }

      const db = adminDb();

      const since = new Date(Date.now() - WINDOW_MINUTES * 60_000).toISOString();
      const { data: recentRows } = await db
        .from('phone_login_requests')
        .select('id')
        .eq('phone', phone)
        .gte('created_at', since)
        .limit(MAX_REQUESTS_PER_WINDOW + 1);

      if ((recentRows?.length ?? 0) >= MAX_REQUESTS_PER_WINDOW) {
        return { ok: false as const, error: 'too_many_requests' };
      }

      const code = randomCode();
      const { data: row, error } = await db
        .from('phone_login_requests')
        .insert({ phone, code })
        .select('id, expires_at')
        .single();

      if (error || !row) {
        return {
          ok: false as const,
          error: `insert_error: ${formatErr(error) || 'insert_failed'}`,
        };
      }

      return {
        ok: true as const,
        requestId: String(row.id),
        phone,
        code,
        expiresAt: row.expires_at,
      };
    } catch (err) {
      return { ok: false as const, error: `server_error: ${formatErr(err)}` };
    }
  });

async function findOrCreatePhoneUser(phone: string): Promise<string> {
  const db = adminDb();
  const email = phoneLoginEmail(phone);

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('id')
    .eq('phone', phone)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (profileError) throw new Error(`profiles_select: ${formatErr(profileError)}`);

  if (profile) {
    const { data: existing, error } = await db.auth.admin.getUserById(profile.id);
    if (error) throw new Error(`get_user: ${formatErr(error)}`);
    if (existing.user?.email) return existing.user.email;
    const { error: updateError } = await db.auth.admin.updateUserById(profile.id, {
      email,
      email_confirm: true,
    });
    if (updateError) throw new Error(`update_user: ${formatErr(updateError)}`);
    return email;
  }

  const { data: created, error: createError } = await db.auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { phone_login: true },
  });

  if (createError && !/already\s*registered|exists/i.test(createError.message)) {
    throw new Error(`create_user: ${formatErr(createError)}`);
  }

  const userId = created?.user?.id;
  if (userId) {
    const { error: phoneError } = await db
      .from('profiles')
      .update({ phone, email: null })
      .eq('id', userId);
    if (phoneError) throw new Error(`profiles_update: ${formatErr(phoneError)}`);
  }

  return email;
}

/** Polled by the customer's browser; once the store approves, returns a one-time sign-in token. */
export const checkPhoneLogin = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) =>
    z.object({ requestId: z.union([z.string().min(1), z.number()]).transform(String) }).parse(input),
  )
  .handler(async ({ data }): Promise<{ status: PhoneLoginStatus; tokenHash?: string }> => {
    const db = adminDb();

    const { data: rows, error } = await db
      .from('phone_login_requests')
      .select('id, phone, status, expires_at')
      .limit(100);

    if (error) throw new Error(`request_select: ${formatErr(error)}`);

    const row = (rows ?? []).find((r) => String(r.id) === String(data.requestId));

    if (!row || row.status === 'used') return { status: 'expired' };
    if (row.status === 'rejected') return { status: 'rejected' };
    if (row.status === 'pending') {
      return { status: new Date(row.expires_at).getTime() <= Date.now() ? 'expired' : 'pending' };
    }

    const { data: claimed, error: claimError } = await db
      .from('phone_login_requests')
      .update({ status: 'used' })
      .eq('id', row.id)
      .eq('status', 'approved')
      .select('id')
      .maybeSingle();

    if (claimError) throw new Error(`claim_update: ${formatErr(claimError)}`);
    if (!claimed) return { status: 'expired' };

    try {
      const email = await findOrCreatePhoneUser(row.phone);
      const { data: link, error: linkError } = await db.auth.admin.generateLink({
        type: 'magiclink',
        email,
      });
      if (linkError || !link.properties?.hashed_token) {
        throw new Error(`generate_link: ${formatErr(linkError) || 'link_failed'}`);
      }
      return { status: 'approved', tokenHash: link.properties.hashed_token };
    } catch (err) {
      await db.from('phone_login_requests').update({ status: 'approved' }).eq('id', row.id);
      throw new Error(`auth_flow: ${formatErr(err)}`);
    }
  });
