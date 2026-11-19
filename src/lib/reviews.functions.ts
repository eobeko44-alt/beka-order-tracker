import { createServerFn } from '@tanstack/react-start';
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import type { PublicReviews } from '@/types';

const SHOWN_REVIEWS = 12;

/** Published customer reviews for the home page, plus the overall rating summary. */
export const getPublicReviews = createServerFn({ method: 'GET' }).handler(
  async (): Promise<PublicReviews> => {
    const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
    const db = createClient<Database>(process.env['SUPABASE_URL']!, key, {
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

    const [latest, ratings] = await Promise.all([
      db
        .from('reviews')
        .select('id, customer_name, rating, comment, created_at, game:games(name_ar)')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(SHOWN_REVIEWS),
      db.from('reviews').select('rating').eq('status', 'approved'),
    ]);

    // Reviews are a nice-to-have; never let them break the home page.
    if (latest.error || ratings.error) {
      console.error('getPublicReviews failed', latest.error?.message ?? ratings.error?.message);
      return { total: 0, average: 0, reviews: [] };
    }

    const all = (ratings.data ?? []).map((row) => row.rating);
    const average = all.length ? all.reduce((sum, value) => sum + value, 0) / all.length : 0;

    return {
      total: all.length,
      average: Math.round(average * 10) / 10,
      reviews: (latest.data ?? []).map((row) => ({
        id: row.id,
        customerName: row.customer_name,
        gameName: (row.game as { name_ar: string } | null)?.name_ar ?? null,
        rating: row.rating,
        comment: row.comment,
        createdAt: row.created_at,
      })),
    };
  },
);
