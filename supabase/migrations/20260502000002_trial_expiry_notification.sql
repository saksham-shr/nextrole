-- Mark users who were already notified about trial expiry.
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS trial_expiry_notified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_profiles_trial_expiry_notified
ON public.profiles (subscription_ends_at, trial_expiry_notified_at);
