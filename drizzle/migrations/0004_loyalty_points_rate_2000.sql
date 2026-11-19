CREATE OR REPLACE FUNCTION public.loyalty_points_for(p_amount_sdg integer)
RETURNS integer
LANGUAGE sql IMMUTABLE SET search_path = ''
AS $$
  SELECT GREATEST(COALESCE(p_amount_sdg, 0), 0) / 2000
$$;