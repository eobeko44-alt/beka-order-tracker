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