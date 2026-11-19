ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS points_awarded integer NOT NULL DEFAULT 0 CHECK (points_awarded >= 0);

-- Single place that decides how many loyalty points an order price earns.
CREATE OR REPLACE FUNCTION public.loyalty_points_for(p_amount_sdg integer)
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT GREATEST(COALESCE(p_amount_sdg, 0), 0) / 1000
$$;
GRANT EXECUTE ON FUNCTION public.loyalty_points_for(integer) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.review_order(p_order_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_row public.orders%ROWTYPE;
  v_points integer := 0;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'NOT_OWNER' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'ALREADY_REVIEWED'; END IF;
  IF p_approve THEN
    IF v_row.user_id IS NOT NULL THEN
      v_points := public.loyalty_points_for(v_row.amount_sdg);
      IF v_points > 0 THEN
        UPDATE public.profiles SET points = points + v_points WHERE id = v_row.user_id;
      END IF;
    END IF;
    UPDATE public.orders
       SET status = 'completed', reviewed_at = now(), points_awarded = v_points
     WHERE id = p_order_id;
  ELSE
    IF v_row.payment_method_id = 'wallet' AND v_row.user_id IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + v_row.amount_sdg WHERE id = v_row.user_id;
    END IF;
    UPDATE public.orders SET status = 'rejected', reviewed_at = now() WHERE id = p_order_id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_order(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_order(uuid, boolean) TO authenticated;