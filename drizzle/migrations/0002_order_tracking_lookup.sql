-- The checkout generates the order id itself so it can show the order number to guests.
GRANT INSERT (id) ON public.orders TO anon, authenticated;

CREATE INDEX IF NOT EXISTS orders_player_id_idx ON public.orders (lower(player_id), created_at DESC);

-- Public status lookup: by order number (first 8 chars of the id, or the full id) or by player ID.
-- Returns only non-sensitive fields and at most 10 orders.
CREATE OR REPLACE FUNCTION public.track_orders(p_query text)
RETURNS TABLE (
  order_code text,
  game_name text,
  package_label text,
  player_id text,
  status text,
  created_at timestamptz,
  reviewed_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_q text := btrim(coalesce(p_query, ''));
  v_code text;
BEGIN
  IF char_length(v_q) < 3 OR char_length(v_q) > 60 THEN
    RETURN;
  END IF;

  v_code := lower(regexp_replace(v_q, '^(bk|BK|Bk|bK)[-#\s]*', ''));
  v_code := replace(v_code, '#', '');

  RETURN QUERY
  SELECT upper(left(o.id::text, 8)),
         g.name_ar,
         p.label_ar,
         o.player_id,
         CASE WHEN o.status IN ('completed', 'confirmed') THEN 'completed'
              WHEN o.status = 'rejected' THEN 'rejected'
              ELSE 'pending' END,
         o.created_at,
         o.reviewed_at
  FROM public.orders o
  LEFT JOIN public.games g ON g.id = o.game_id
  LEFT JOIN public.packages p ON p.id = o.package_id
  WHERE (v_code ~ '^[0-9a-f]{8}$' AND left(o.id::text, 8) = v_code)
     OR (v_code ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' AND o.id::text = v_code)
     OR lower(o.player_id) = lower(v_q)
  ORDER BY o.created_at DESC
  LIMIT 10;
END;
$$;
REVOKE ALL ON FUNCTION public.track_orders(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_orders(text) TO anon, authenticated;