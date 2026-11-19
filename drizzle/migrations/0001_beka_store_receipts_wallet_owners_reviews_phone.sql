CREATE POLICY "public_upload_receipts" ON storage.objects FOR INSERT
  TO anon, authenticated WITH CHECK (bucket_id = 'receipts');

CREATE POLICY "owner_read_receipts" ON storage.objects FOR SELECT
  TO authenticated USING (bucket_id = 'receipts' AND public.is_owner());

-- Price is always filled in by the orders_set_amount trigger; the default only lets the app omit it.
ALTER TABLE public.orders ALTER COLUMN amount_sdg SET DEFAULT 0;

INSERT INTO public.payment_methods (id, name_ar, account_label_ar, account_value, instructions_ar, sort_order, is_active)
VALUES ('wallet', 'رصيد المحفظة', 'المحفظة', '-', 'يتم الخصم من رصيد محفظتك مباشرة.', 0, false)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.set_order_amount()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  SELECT p.price_sdg INTO NEW.amount_sdg
  FROM public.packages p
  WHERE p.id = NEW.package_id AND p.game_id = NEW.game_id AND p.is_active;
  IF NEW.amount_sdg IS NULL THEN
    RAISE EXCEPTION 'Package does not match the selected game';
  END IF;
  IF NEW.payment_method_id = 'wallet' AND coalesce(current_setting('app.wallet_order', true), '') <> 'on' THEN
    RAISE EXCEPTION 'WALLET_ORDER_VIA_RPC_ONLY';
  END IF;
  NEW.status := 'pending';
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.place_wallet_order(
  p_game_id text, p_package_id text, p_player_id text, p_whatsapp text, p_customer_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_price integer;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN' USING ERRCODE = '42501'; END IF;
  SELECT price_sdg INTO v_price FROM public.packages
    WHERE id = p_package_id AND game_id = p_game_id AND is_active;
  IF v_price IS NULL THEN RAISE EXCEPTION 'Package does not match the selected game'; END IF;
  UPDATE public.profiles SET balance = balance - v_price
    WHERE id = v_uid AND balance >= v_price;
  IF NOT FOUND THEN RAISE EXCEPTION 'INSUFFICIENT_BALANCE'; END IF;
  PERFORM set_config('app.wallet_order', 'on', true);
  INSERT INTO public.orders (game_id, package_id, player_id, whatsapp, payment_method_id, customer_name, user_id)
  VALUES (p_game_id, p_package_id, p_player_id, p_whatsapp, 'wallet', NULLIF(p_customer_name, ''), v_uid)
  RETURNING id INTO v_id;
  PERFORM set_config('app.wallet_order', 'off', true);
  RETURN v_id;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.place_wallet_order(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_wallet_order(text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_order(p_order_id uuid, p_approve boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_row public.orders%ROWTYPE;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'NOT_OWNER' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.orders WHERE id = p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'ALREADY_REVIEWED'; END IF;
  IF p_approve THEN
    UPDATE public.orders SET status = 'completed', reviewed_at = now() WHERE id = p_order_id;
  ELSE
    IF v_row.payment_method_id = 'wallet' AND v_row.user_id IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance + v_row.amount_sdg WHERE id = v_row.user_id;
    END IF;
    UPDATE public.orders SET status = 'rejected', reviewed_at = now() WHERE id = p_order_id;
  END IF;
END;
$$;

CREATE TABLE public.owner_email_allowlist (
  email text PRIMARY KEY CHECK (email = lower(email)),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.owner_email_allowlist TO service_role;
ALTER TABLE public.owner_email_allowlist ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.grant_owner_from_allowlist()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email IS NOT NULL
     AND NEW.email_confirmed_at IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.owner_email_allowlist a WHERE a.email = lower(NEW.email))
     AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = NEW.id AND r.role = 'owner')
  THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.grant_owner_from_allowlist() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_owner_allowlist
AFTER INSERT OR UPDATE OF email_confirmed_at, email ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.grant_owner_from_allowlist();

CREATE OR REPLACE FUNCTION public.apply_owner_allowlist_to_existing()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  SELECT u.id, 'owner'
  FROM auth.users u
  WHERE lower(u.email) = NEW.email
    AND u.email_confirmed_at IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'owner');
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.apply_owner_allowlist_to_existing() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER owner_allowlist_apply_existing
AFTER INSERT ON public.owner_email_allowlist
FOR EACH ROW EXECUTE FUNCTION public.apply_owner_allowlist_to_existing();

CREATE TABLE public.reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid UNIQUE REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  customer_name text NOT NULL CHECK (char_length(btrim(customer_name)) BETWEEN 2 AND 40),
  game_id text REFERENCES public.games(id) ON DELETE SET NULL,
  rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text NOT NULL CHECK (char_length(btrim(comment)) BETWEEN 3 AND 400),
  source text NOT NULL DEFAULT 'customer' CHECK (source IN ('customer', 'owner')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);

CREATE INDEX reviews_status_created_idx ON public.reviews (status, created_at DESC);

GRANT SELECT (id, customer_name, game_id, rating, comment, source, status, created_at) ON public.reviews TO anon;
GRANT SELECT ON public.reviews TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
GRANT ALL ON public.reviews TO service_role;

ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY public_read_approved_reviews ON public.reviews
  FOR SELECT TO anon, authenticated USING (status = 'approved');
CREATE POLICY read_own_reviews ON public.reviews
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY owner_read_all_reviews ON public.reviews
  FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY owner_insert_reviews ON public.reviews
  FOR INSERT TO authenticated WITH CHECK (public.is_owner() AND source = 'owner');
CREATE POLICY owner_update_reviews ON public.reviews
  FOR UPDATE TO authenticated USING (public.is_owner()) WITH CHECK (public.is_owner());
CREATE POLICY owner_delete_reviews ON public.reviews
  FOR DELETE TO authenticated USING (public.is_owner());

-- Customers review their own completed orders through this function only.
CREATE OR REPLACE FUNCTION public.submit_review(p_order_id uuid, p_rating integer, p_comment text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_order public.orders%ROWTYPE;
  v_name text;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_SIGNED_IN'; END IF;
  SELECT * INTO v_order FROM public.orders WHERE id = p_order_id;
  IF NOT FOUND OR v_order.user_id IS DISTINCT FROM v_uid THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_order.status NOT IN ('completed', 'confirmed') THEN RAISE EXCEPTION 'ORDER_NOT_COMPLETED'; END IF;
  IF EXISTS (SELECT 1 FROM public.reviews WHERE order_id = p_order_id) THEN RAISE EXCEPTION 'ALREADY_REVIEWED'; END IF;

  SELECT COALESCE(NULLIF(btrim(v_order.customer_name), ''), NULLIF(btrim(p.name), ''), 'عميل بيكا ستور')
    INTO v_name FROM public.profiles p WHERE p.id = v_uid;
  v_name := left(COALESCE(v_name, 'عميل بيكا ستور'), 40);

  INSERT INTO public.reviews (order_id, user_id, customer_name, game_id, rating, comment, source, status)
  VALUES (p_order_id, v_uid, v_name, v_order.game_id, p_rating, btrim(p_comment), 'customer', 'pending')
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.submit_review(uuid, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_review(uuid, integer, text) TO authenticated;

CREATE TABLE public.phone_login_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL CHECK (phone ~ '^0[0-9]{9}$'),
  code text NOT NULL CHECK (code ~ '^[0-9]{6}$'),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','used')),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT now() + interval '15 minutes',
  reviewed_at timestamptz,
  reviewed_by uuid
);
CREATE INDEX phone_login_requests_phone_idx ON public.phone_login_requests (phone, created_at DESC);
CREATE INDEX phone_login_requests_status_idx ON public.phone_login_requests (status, created_at DESC);

ALTER TABLE public.phone_login_requests ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.phone_login_requests FROM anon, authenticated;
GRANT SELECT ON public.phone_login_requests TO authenticated;
GRANT ALL ON public.phone_login_requests TO service_role;

CREATE POLICY "Owners read phone login requests" ON public.phone_login_requests
  FOR SELECT TO authenticated USING (public.is_owner());

CREATE OR REPLACE FUNCTION public.review_phone_login(p_request_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'not allowed' USING ERRCODE = '42501';
  END IF;
  UPDATE public.phone_login_requests
     SET status = CASE WHEN p_approve THEN 'approved' ELSE 'rejected' END,
         reviewed_at = now(),
         reviewed_by = auth.uid()
   WHERE id = p_request_id AND status = 'pending' AND expires_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'request not pending' USING ERRCODE = 'P0002';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.review_phone_login(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_phone_login(uuid, boolean) TO authenticated;