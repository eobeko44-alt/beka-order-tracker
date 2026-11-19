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