import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import { getSupabaseConfig } from '@/integrations/supabase/env';
import type { Catalog } from '@/types';

/** Public store catalog: active games, packages and payment methods. */
export const getCatalog = createServerFn({ method: 'GET' }).handler(async (): Promise<Catalog> => {
  const { url, key } = getSupabaseConfig();
  const db = createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        if (key.startsWith('sb_') && headers.get('Authorization') === `Bearer ${key}`) {
          headers.delete('Authorization');
        }
        headers.set('apikey', key);
        return fetch(input, { ...init, headers });
      },
    },
  });

  const [games, packages, paymentMethods] = await Promise.all([
    db
      .from('games')
      .select('id, name_ar, name_en, accent_color, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    db
      .from('packages')
      .select('id, game_id, label_ar, price_sdg, sort_order')
      .eq('is_active', true)
      .order('sort_order'),
    db
      .from('payment_methods')
      .select('id, name_ar, account_label_ar, account_value, instructions_ar, sort_order, is_active')
      .eq('is_active', true)
      .order('sort_order'),
  ]);

  for (const result of [games, packages, paymentMethods]) {
    if (result.error) throw new Error(result.error.message);
  }

  return {
    games: games.data ?? [],
    packages: packages.data ?? [],
    paymentMethods: paymentMethods.data ?? [],
  };
});
