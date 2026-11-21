import { afterEach, describe, expect, it, vi } from 'vitest';

async function configWith(env: Record<string, string>) {
  vi.resetModules();
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v);
  const mod = await import('@/integrations/supabase/env');
  return mod.getSupabaseConfig();
}

afterEach(() => vi.unstubAllEnvs());

describe('own Supabase project on Vercel', () => {
  it('uses VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY when the anon key is set', async () => {
    const cfg = await configWith({
      VITE_SUPABASE_URL: 'https://mbohrdrbhcylylkdkogx.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
    });
    expect(cfg).toEqual({ url: 'https://mbohrdrbhcylylkdkogx.supabase.co', key: 'sb_publishable_test' });
  });

  it('never falls back to the built-in lovable.cloud address in own-project mode', async () => {
    const cfg = await configWith({
      VITE_SUPABASE_URL: 'https://c--abc-prod.lovable.cloud',
      VITE_SUPABASE_ANON_KEY: 'sb_publishable_test',
    });
    expect(cfg.url).toBe('https://mbohrdrbhcylylkdkogx.supabase.co');
  });
});
