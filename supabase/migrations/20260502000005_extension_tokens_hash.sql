-- ============================================================
-- Extension token hardening: store only token hashes
-- ============================================================

ALTER TABLE public.extension_tokens
  ADD COLUMN IF NOT EXISTS token_hash text;

-- Backfill hash for existing plaintext tokens
UPDATE public.extension_tokens
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL
  AND token IS NOT NULL;

-- Enforce hash presence for all rows
ALTER TABLE public.extension_tokens
  ALTER COLUMN token_hash SET NOT NULL;

-- Uniqueness/index on hash instead of plaintext token
DROP INDEX IF EXISTS extension_tokens_token_idx;
CREATE UNIQUE INDEX IF NOT EXISTS extension_tokens_token_hash_idx
  ON public.extension_tokens (token_hash);

-- Plaintext token is kept temporarily for backward-compatible lookups during rollout.
-- Safe cleanup later:
-- 1) remove plaintext fallback in API routes
-- 2) ALTER TABLE public.extension_tokens DROP COLUMN token;
