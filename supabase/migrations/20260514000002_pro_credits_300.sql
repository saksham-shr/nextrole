-- Daily credit allowances: free=10, starter=100, pro=300

CREATE OR REPLACE FUNCTION public.reset_credits_for_tier(
  p_user_id uuid,
  p_tier    text
) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.profiles
  SET
    credits_remaining = CASE
      WHEN p_tier = 'pro'     THEN 300
      WHEN p_tier = 'starter' THEN 100
      ELSE 10
    END,
    credits_reset_at = (current_date + interval '1 day')::timestamptz,
    updated_at       = now()
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_daily_credits() RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  UPDATE public.profiles
  SET
    credits_remaining = CASE
      WHEN tier = 'pro'     THEN 300
      WHEN tier = 'starter' THEN 100
      ELSE 10
    END,
    credits_reset_at = (current_date + interval '1 day')::timestamptz,
    updated_at       = now()
  WHERE credits_reset_at <= now();
END;
$$;

-- Backfill existing pro users to 300 and starter users to 100.
UPDATE public.profiles SET credits_remaining = 300 WHERE tier = 'pro'     AND credits_remaining < 300;
UPDATE public.profiles SET credits_remaining = 100 WHERE tier = 'starter' AND credits_remaining < 100;
