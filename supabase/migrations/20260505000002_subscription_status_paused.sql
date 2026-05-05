-- Add 'paused' to the subscription_status check constraint on profiles.
-- subscription_status is a text column with a CHECK constraint (not a PG enum),
-- so we drop and recreate the constraint.

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_subscription_status_check;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_subscription_status_check
  CHECK (subscription_status = ANY (ARRAY[
    'active'::text,
    'cancelled'::text,
    'past_due'::text,
    'expired'::text,
    'paused'::text
  ]));
