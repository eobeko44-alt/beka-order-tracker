import { supabase } from '@/lib/supabase';
import { lovable } from '@/integrations/lovable/index';

export async function signInWithGoogle(): Promise<void> {
  const result = await lovable.auth.signInWithOAuth('google', {
    redirect_uri: window.location.origin,
  });

  if (result.error) throw result.error;
  // When redirected, the browser is leaving for Google; otherwise the session is already set.
}

/** Finishes a WhatsApp phone sign-in once the store has approved the request. */
export async function completePhoneLogin(tokenHash: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: 'magiclink',
  });
  if (error) throw error;
}

export async function signInWithEmail(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

/** Returns true when the account is signed in right away, false when the email must be confirmed first. */
export async function signUpWithEmail(
  email: string,
  password: string,
  name: string,
): Promise<boolean> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
      emailRedirectTo: `${window.location.origin}/account`,
    },
  });
  if (error) throw error;
  return data.session !== null;
}

export async function signOutUser(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
