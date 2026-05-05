-- Add onboarding_completed flag to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false;

-- Existing users are already onboarded
UPDATE public.profiles
SET onboarding_completed = true
WHERE created_at < now() - interval '5 minutes';

-- Update the new-user trigger to explicitly set it false
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
    credits_remaining,
    onboarding_completed
  )
  VALUES (
    new.id,
    new.email,
    now() + interval '14 days',
    500,
    false
  );
  RETURN new;
END;
$$;
