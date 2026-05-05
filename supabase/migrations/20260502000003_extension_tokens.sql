-- ============================================================
-- Extension personal access tokens
-- Used by the browser extension to authenticate API calls
-- ============================================================

CREATE TABLE IF NOT EXISTS public.extension_tokens (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token       text NOT NULL UNIQUE,
  name        text NOT NULL DEFAULT 'Browser Extension',
  last_used_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extension_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "extension_tokens_own"
  ON public.extension_tokens
  FOR ALL
  USING (auth.uid() = user_id);

CREATE INDEX extension_tokens_user_idx ON public.extension_tokens (user_id);
CREATE INDEX extension_tokens_token_idx ON public.extension_tokens (token);
