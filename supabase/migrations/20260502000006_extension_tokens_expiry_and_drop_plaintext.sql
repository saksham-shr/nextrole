-- ============================================================
-- Extension token lifecycle hardening
-- - add expiry
-- - remove plaintext token storage
-- ============================================================

ALTER TABLE public.extension_tokens
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- Default existing tokens to 90 days from migration time if unset
UPDATE public.extension_tokens
SET expires_at = now() + interval '90 days'
WHERE expires_at IS NULL;

ALTER TABLE public.extension_tokens
  ALTER COLUMN expires_at SET NOT NULL;

-- Plaintext token column is no longer needed after hash rollout.
ALTER TABLE public.extension_tokens
  DROP COLUMN IF EXISTS token;
