import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { getSupabaseConfig } from '@/integrations/supabase/env';
import { brokeredPreviewStorage } from '@/integrations/supabase/previewAuthStorage';

/**
 * Browser database client for the whole store.
 * It reads VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY first (set these in Vercel to use your own
 * project), and falls back to the built-in project only when they are missing.
 */
function createStoreClient() {
  const { url, key } = getSupabaseConfig();
  return createClient<Database>(url, key, {
    global: {
      fetch: (input, init) => {
        const headers = new Headers(
          typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
        );
        if (init?.headers) new Headers(init.headers).forEach((value, name) => headers.set(name, value));
        // New-style keys are opaque strings, not bearer tokens.
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) {
          headers.delete('Authorization');
        }
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  });
}

let client: ReturnType<typeof createStoreClient> | undefined;

export const supabase = new Proxy({} as ReturnType<typeof createStoreClient>, {
  get(_, prop, receiver) {
    if (!client) client = createStoreClient();
    return Reflect.get(client, prop, receiver);
  },
});
