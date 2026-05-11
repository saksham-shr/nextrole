-- Extension feedback table: stores "not a job" / "confirmed" signals
-- from the floating detection card to improve the heuristic detector.

CREATE TABLE IF NOT EXISTS public.extension_feedback (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  url         text        NOT NULL,
  page_title  text,
  action      text        NOT NULL CHECK (action IN ('not_a_job', 'confirmed')),
  source      text,       -- extractor that fired: "heuristic", "linkedin", etc.
  confidence  text,       -- "high", "medium", "low"
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index for analytics queries
CREATE INDEX IF NOT EXISTS extension_feedback_action_idx  ON public.extension_feedback (action);
CREATE INDEX IF NOT EXISTS extension_feedback_source_idx  ON public.extension_feedback (source);
CREATE INDEX IF NOT EXISTS extension_feedback_created_idx ON public.extension_feedback (created_at DESC);

-- RLS: only service-role (admin client) can read/write; users can't browse each other's reports
ALTER TABLE public.extension_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON public.extension_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);
