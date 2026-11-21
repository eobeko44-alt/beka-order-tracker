-- Beka Store: full database setup for your own project (run once in its SQL editor, in order).
-- Generated from drizzle/migrations; re-generate if new migrations are added.

-- ===== drizzle/migrations/0000_beka_store_core.sql =====
-- ============ Catalog ============
CREATE TABLE public.games (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text NOT NULL,
  accent_color text NOT NULL DEFAULT '#a78bfa',
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.games TO anon, authenticated;
GRANT ALL ON public.games TO service_role;
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.packages (
  id text PRIMARY KEY,
  game_id text NOT NULL REFERENCES public.games(id) ON DELETE CASCADE,
  label_ar text NOT NULL,
  price_sdg integer NOT NULL CHECK (price_sdg > 0),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX packages_game_id_idx ON public.packages (game_id);
GRANT SELECT ON public.packages TO anon, authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payment_methods (
  id text PRIMARY KEY,
  name_ar text NOT NULL,
  account_label_ar text NOT NULL,
  account_value text NOT NULL,
  instructions_ar text,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_methods TO anon, authenticated;
GRANT UPDATE (account_value, is_active) ON public.payment_methods TO authenticated;
GRANT ALL ON public.payment_methods TO service_role;
ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

-- ============ Profiles & roles ============
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text,
  phone text CHECK (phone IS NULL OR phone ~ '^\+?[0-9]{7,15}$'),
  avatar_url text,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  points integer NOT NULL DEFAULT 0 CHECK (points >= 0),
  legacy_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (name, phone, avatar_url) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TYPE public.app_role AS ENUM ('owner');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_owner()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT public.has_role(auth.uid(), 'owner')
$$;

REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.is_owner() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_owner() TO authenticated;

CREATE POLICY "read_own_or_owner_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_owner());

CREATE POLICY "read_own_or_owner_profiles" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_owner());
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, avatar_url)
  VALUES (
    NEW.id,
    NULLIF(COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''), ''),
    NEW.email,
    CASE WHEN NEW.phone LIKE '249%' THEN '0' || substr(NEW.phone, 4)
         WHEN NEW.phone LIKE '+249%' THEN '0' || substr(NEW.phone, 5)
         ELSE NULL END,
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();

-- Catalog policies
CREATE POLICY "public_read_active_games" ON public.games FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "owner_read_all_games" ON public.games FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "public_read_active_packages" ON public.packages FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "owner_read_all_packages" ON public.packages FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "public_read_active_payment_methods" ON public.payment_methods FOR SELECT TO anon, authenticated USING (is_active);
CREATE POLICY "owner_read_all_payment_methods" ON public.payment_methods FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "owner_update_payment_methods" ON public.payment_methods FOR UPDATE TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());

-- ============ Orders ============
CREATE TABLE public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id text NOT NULL REFERENCES public.games(id),
  package_id text NOT NULL REFERENCES public.packages(id),
  player_id text NOT NULL CHECK (char_length(player_id) BETWEEN 3 AND 50),
  whatsapp text NOT NULL CHECK (whatsapp ~ '^\+?[0-9]{7,15}$'),
  payment_method_id text NOT NULL REFERENCES public.payment_methods(id),
  amount_sdg integer NOT NULL CHECK (amount_sdg > 0),
  receipt_path text CHECK (receipt_path IS NULL OR char_length(receipt_path) BETWEEN 1 AND 300),
  customer_name text CHECK (customer_name IS NULL OR char_length(customer_name) BETWEEN 2 AND 80),
  payer_account text CHECK (payer_account IS NULL OR char_length(payer_account) BETWEEN 3 AND 30),
  user_id uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX orders_created_at_idx ON public.orders (created_at DESC);
CREATE INDEX orders_user_id_idx ON public.orders (user_id);

GRANT INSERT (game_id, package_id, player_id, whatsapp, payment_method_id, receipt_path, customer_name, payer_account)
  ON public.orders TO anon, authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT UPDATE (status, reviewed_at) ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_create_orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "read_own_orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "owner_read_all_orders" ON public.orders FOR SELECT TO authenticated USING (public.is_owner());
CREATE POLICY "owner_update_orders" ON public.orders FOR UPDATE TO authenticated
  USING (public.is_owner()) WITH CHECK (public.is_owner());

CREATE OR REPLACE FUNCTION public.set_order_amount()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  SELECT p.price_sdg INTO NEW.amount_sdg
  FROM public.packages p
  WHERE p.id = NEW.package_id AND p.game_id = NEW.game_id;

  IF NEW.amount_sdg IS NULL THEN
    RAISE EXCEPTION 'Package does not match the selected game';
  END IF;

  NEW.status := 'pending';
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.set_order_amount() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER orders_set_amount
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_amount();

-- ============ Wallet top-ups ============
CREATE TABLE public.topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_sdg integer NOT NULL CHECK (amount_sdg BETWEEN 1 AND 1000000),
  method text NOT NULL CHECK (method IN ('fawry', 'mycashi')),
  transaction_number text NOT NULL CHECK (char_length(transaction_number) BETWEEN 3 AND 60),
  receipt_path text NOT NULL CHECK (char_length(receipt_path) BETWEEN 1 AND 300),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz
);
CREATE INDEX topups_user_id_idx ON public.topups (user_id);
CREATE INDEX topups_status_created_idx ON public.topups (status, created_at DESC);

GRANT SELECT ON public.topups TO authenticated;
GRANT INSERT (amount_sdg, method, transaction_number, receipt_path) ON public.topups TO authenticated;
GRANT ALL ON public.topups TO service_role;
ALTER TABLE public.topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read_own_or_owner_topups" ON public.topups FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.is_owner());
CREATE POLICY "insert_own_pending_topups" ON public.topups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pending');

CREATE OR REPLACE FUNCTION public.review_topup(p_topup_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_row public.topups%ROWTYPE;
BEGIN
  IF NOT public.is_owner() THEN
    RAISE EXCEPTION 'NOT_OWNER' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_row FROM public.topups WHERE id = p_topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF v_row.status <> 'pending' THEN RAISE EXCEPTION 'ALREADY_REVIEWED'; END IF;

  IF p_approve THEN
    UPDATE public.profiles SET balance = balance + v_row.amount_sdg WHERE id = v_row.user_id;
    UPDATE public.topups SET status = 'approved', reviewed_at = now() WHERE id = p_topup_id;
  ELSE
    UPDATE public.topups SET status = 'rejected', reviewed_at = now() WHERE id = p_topup_id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_topup(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_topup(uuid, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_order(p_order_id uuid, p_approve boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
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
    IF v_row.user_id IS NOT NULL THEN
      UPDATE public.profiles SET balance = balance - v_row.amount_sdg WHERE id = v_row.user_id;
    END IF;
    UPDATE public.orders SET status = 'completed', reviewed_at = now() WHERE id = p_order_id;
  ELSE
    UPDATE public.orders SET status = 'rejected', reviewed_at = now() WHERE id = p_order_id;
  END IF;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.review_order(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.review_order(uuid, boolean) TO authenticated;

-- ============ Seed catalog (final state from source) ============
INSERT INTO public.games (id, name_ar, name_en, accent_color, sort_order, is_active) VALUES
  ('pubg-mobile', 'ببجي موبايل', 'PUBG Mobile', '#a78bfa', 1, true),
  ('free-fire', 'فري فاير', 'Free Fire', '#60a5fa', 2, true),
  ('ludo', 'يلا لودو', 'Yalla Ludo', '#7dd3fc', 3, true),
  ('us-visa', 'فيزا أمريكية', 'US Visa', '#c4b5fd', 4, true),
  ('mobile-legends', 'موبايل ليجندز', 'Mobile Legends', '#c084fc', 3, false),
  ('call-of-duty', 'كول أوف ديوتي', 'Call of Duty Mobile', '#38bdf8', 4, false),
  ('fortnite', 'فورتنايت', 'Fortnite', '#818cf8', 5, false);

INSERT INTO public.packages (id, game_id, label_ar, price_sdg, sort_order, is_active) VALUES
  ('ff-110', 'free-fire', '100 + 10 جوهرة', 11000, 1, true),
  ('ff-221', 'free-fire', '210 + 21 جوهرة', 21200, 2, true),
  ('ff-584', 'free-fire', '530 + 53 جوهرة', 53200, 3, true),
  ('ff-1188', 'free-fire', '1080 + 108 جوهرة', 106400, 4, true),
  ('ff-2420', 'free-fire', '2200 + 220 جوهرة', 215000, 5, true),
  ('pubg-60', 'pubg-mobile', '60 شدة', 10000, 1, true),
  ('pubg-300', 'pubg-mobile', '300 + 30 شدة', 50200, 2, true),
  ('pubg-600', 'pubg-mobile', '600 + 60 شدة', 100600, 3, true),
  ('pubg-1500', 'pubg-mobile', '1500 + 300 شدة', 251500, 4, true),
  ('pubg-3000', 'pubg-mobile', '3000 + 850 شدة', 503100, 5, true),
  ('ludo-2', 'ludo', '2 دولار', 23000, 1, true),
  ('ludo-5', 'ludo', '5 دولار', 57000, 2, true),
  ('ludo-10', 'ludo', '10 دولار', 113000, 3, true),
  ('visa-0', 'us-visa', 'فيزا 0 دولار', 2000, 1, true),
  ('pubg-325', 'pubg-mobile', '325 شدة', 17000, 2, false),
  ('pubg-660', 'pubg-mobile', '660 شدة', 33000, 3, false),
  ('pubg-1800', 'pubg-mobile', '1800 شدة', 85000, 4, false),
  ('ff-100', 'free-fire', '100 جوهرة', 3000, 1, false),
  ('ff-310', 'free-fire', '310 جوهرة', 9000, 2, false),
  ('ff-520', 'free-fire', '520 جوهرة', 14500, 3, false),
  ('ff-1060', 'free-fire', '1060 جوهرة', 28000, 4, false),
  ('ml-86', 'mobile-legends', '86 ألماسة', 4000, 1, false),
  ('ml-172', 'mobile-legends', '172 ألماسة', 8000, 2, false),
  ('ml-257', 'mobile-legends', '257 ألماسة', 12000, 3, false),
  ('ml-514', 'mobile-legends', '514 ألماسة', 23000, 4, false),
  ('cod-80', 'call-of-duty', '80 CP', 3500, 1, false),
  ('cod-400', 'call-of-duty', '400 CP', 15000, 2, false),
  ('cod-800', 'call-of-duty', '800 CP', 28000, 3, false),
  ('cod-2000', 'call-of-duty', '2000 CP', 65000, 4, false),
  ('fn-1000', 'fortnite', '1000 V-Bucks', 12000, 1, false),
  ('fn-2800', 'fortnite', '2800 V-Bucks', 30000, 2, false),
  ('fn-5000', 'fortnite', '5000 V-Bucks', 50000, 3, false),
  ('fn-13500', 'fortnite', '13500 V-Bucks', 120000, 4, false);

INSERT INTO public.payment_methods (id, name_ar, account_label_ar, account_value, instructions_ar, sort_order, is_active) VALUES
  ('fawry', 'فوري', 'رقم حساب فوري', '52113932', 'حوّل المبلغ إلى رقم فوري ثم ارفع صورة إشعار التحويل.', 1, true),
  ('mycashi', 'ماي كاشي', 'رقم حساب ماي كاشي', '400294324', 'حوّل المبلغ إلى رقم ماي كاشي ثم ارفع صورة إشعار التحويل.', 2, true),
  ('bankak', 'بنكك', 'رقم الحساب', 'PLACEHOLDER-BANKAK', 'حوّل المبلغ إلى رقم الحساب أعلاه ثم ارفع صورة إشعار التحويل.', 3, false),
  ('ocash', 'أوكاش', 'رقم أوكاش', 'PLACEHOLDER-OCASH', 'حوّل المبلغ إلى رقم أوكاش أعلاه ثم ارفع صورة إشعار التحويل.', 4, false),
  ('usdt', 'USDT', 'عنوان المحفظة (TRC20)', 'PLACEHOLDER-USDT', 'أرسل المبلغ بعملة USDT إلى العنوان أعلاه ثم ارفع صورة إشعار التحويل.', 5, false);
-- ===== drizzle/migrations/0001_beka_store_receipts_wallet_owners_reviews_phone.sql =====
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
-- ===== drizzle/migrations/0002_order_tracking_lookup.sql =====
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
-- ===== drizzle/migrations/0003_loyalty_points_on_completed_orders.sql =====
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
-- ===== drizzle/migrations/0004_loyalty_points_rate_2000.sql =====
CREATE OR REPLACE FUNCTION public.loyalty_points_for(p_amount_sdg integer)
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT GREATEST(COALESCE(p_amount_sdg, 0), 0) / 2000
$$;
-- ===== drizzle/migrations/0005_tighten_table_permissions.sql =====
REVOKE ALL ON public.games, public.packages, public.payment_methods, public.profiles, public.user_roles,
  public.orders, public.topups, public.owner_email_allowlist, public.reviews
  FROM anon, authenticated;

GRANT SELECT ON public.games TO anon, authenticated;
GRANT SELECT ON public.packages TO anon, authenticated;

GRANT SELECT ON public.payment_methods TO anon, authenticated;
GRANT UPDATE (account_value, is_active) ON public.payment_methods TO authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (name, phone, avatar_url) ON public.profiles TO authenticated;

GRANT SELECT ON public.user_roles TO authenticated;

GRANT INSERT (id, game_id, package_id, player_id, whatsapp, payment_method_id, receipt_path, customer_name, payer_account)
  ON public.orders TO anon, authenticated;
GRANT SELECT ON public.orders TO authenticated;
GRANT UPDATE (status, reviewed_at) ON public.orders TO authenticated;

GRANT SELECT ON public.topups TO authenticated;
GRANT INSERT (amount_sdg, method, transaction_number, receipt_path) ON public.topups TO authenticated;

GRANT SELECT (id, customer_name, game_id, rating, comment, source, status, created_at) ON public.reviews TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.reviews TO authenticated;
-- Private bucket for payment receipts (5 MB max).
INSERT INTO storage.buckets (id, name, public, file_size_limit) VALUES ('receipts', 'receipts', false, 5242880) ON CONFLICT (id) DO NOTHING;

-- Store owner account (gets admin access automatically after signing in).
INSERT INTO public.owner_email_allowlist (email) VALUES ('abobaker096605@gmail.com') ON CONFLICT DO NOTHING;
