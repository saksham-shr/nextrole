-- Fix handle_new_user: explicitly set tier='free', no auto-trial, no credits (free tier uses daily limits not credits)
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    tier,
    credits_remaining,
    subscription_ends_at,
    subscription_status,
    onboarding_completed
  )
  VALUES (
    new.id,
    new.email,
    'free',
    0,
    NULL,
    NULL,
    false
  );
  RETURN new;
END;
$$;

-- Fix existing accounts that landed on 'byok' without a real subscription
UPDATE public.profiles
SET
  tier               = 'free',
  credits_remaining  = 0,
  subscription_ends_at = NULL,
  subscription_status  = NULL
WHERE
  tier IN ('byok', 'team')
  AND lemon_squeezy_subscription_id IS NULL
  AND (subscription_status IS NULL OR subscription_status NOT IN ('active', 'cancelled', 'past_due'));

-- Clear the auto-trial window from free-tier accounts (the 14-day backfill was wrong for them)
UPDATE public.profiles
SET subscription_ends_at = NULL
WHERE tier = 'free'
  AND subscription_status IS NULL
  AND lemon_squeezy_subscription_id IS NULL;
