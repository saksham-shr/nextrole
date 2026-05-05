-- ============================================================
-- Trial setup: give new signups a 14-day trial with 500 credits
-- Backfill existing free users who have no trial set yet
-- ============================================================

-- Backfill existing users: set trial window from account creation date
-- and give them 500 credits if they haven't been touched yet
UPDATE public.profiles
SET
  subscription_ends_at = created_at + interval '14 days',
  credits_remaining    = GREATEST(credits_remaining, 500)
WHERE subscription_ends_at IS NULL;

-- Update signup trigger to seed trial + credits for new users
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    subscription_ends_at,
    credits_remaining
  )
  VALUES (
    new.id,
    new.email,
    now() + interval '14 days',
    500
  );
  RETURN new;
END;
$$;
