-- Reconcile live DB with the v2 schema the code expects.
-- The v2 master migration (20260527000001) was only partially applied to
-- production: several tables kept their pre-v2 shape and four tables were
-- never created. All changes here are additive — orphan columns from the
-- old schema (jobs.followup_at, evaluations.salary_match/legitimacy,
-- application_sessions.completed_at) are left in place; no code reads them.

-- ── extension_tokens (already applied manually 2026-07-02, kept for parity) ──
ALTER TABLE public.extension_tokens
  ADD COLUMN IF NOT EXISTS name       text NOT NULL DEFAULT 'Browser Extension',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- ── jobs ─────────────────────────────────────────────────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS archetype        text,
  ADD COLUMN IF NOT EXISTS last_response_at timestamptz,
  ADD COLUMN IF NOT EXISTS followup_due_at  timestamptz,
  ADD COLUMN IF NOT EXISTS followup_state   text DEFAULT 'pending';

-- Carry over any existing follow-up dates from the pre-v2 column.
UPDATE public.jobs
SET followup_due_at = followup_at
WHERE followup_at IS NOT NULL AND followup_due_at IS NULL;

-- ── evaluations ──────────────────────────────────────────────────────
ALTER TABLE public.evaluations
  ADD COLUMN IF NOT EXISTS compensation_analysis    jsonb,
  ADD COLUMN IF NOT EXISTS cv_match                 jsonb,
  ADD COLUMN IF NOT EXISTS personalization_guidance jsonb,
  ADD COLUMN IF NOT EXISTS legitimacy_check         jsonb,
  ADD COLUMN IF NOT EXISTS level_strategy           jsonb,
  ADD COLUMN IF NOT EXISTS raw_output               text,
  ADD COLUMN IF NOT EXISTS provider                 text,
  ADD COLUMN IF NOT EXISTS updated_at               timestamptz NOT NULL DEFAULT now();

-- ── application_sessions ─────────────────────────────────────────────
ALTER TABLE public.application_sessions
  ADD COLUMN IF NOT EXISTS source_tab_id   integer,
  ADD COLUMN IF NOT EXISTS source_url      text,
  ADD COLUMN IF NOT EXISTS target_url      text,
  ADD COLUMN IF NOT EXISTS fill_started_at timestamptz,
  ADD COLUMN IF NOT EXISTS submitted_at    timestamptz,
  ADD COLUMN IF NOT EXISTS last_seen_at    timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS created_at      timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT now();

-- Carry over completion timestamps from the pre-v2 column.
UPDATE public.application_sessions
SET submitted_at = completed_at
WHERE completed_at IS NOT NULL AND submitted_at IS NULL;

-- ── job_events ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  job_id      uuid        NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  event_type  text        NOT NULL,
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_events_job_idx ON public.job_events (job_id, created_at DESC);
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS job_events_select_own ON public.job_events;
CREATE POLICY job_events_select_own ON public.job_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS job_events_insert_own ON public.job_events;
CREATE POLICY job_events_insert_own ON public.job_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- ── extension_feedback ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.extension_feedback (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users ON DELETE SET NULL,
  url         text        NOT NULL,
  page_title  text,
  action      text        NOT NULL,
  source      text,
  confidence  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS extension_feedback_created_idx ON public.extension_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS extension_feedback_action_idx  ON public.extension_feedback (action);
ALTER TABLE public.extension_feedback ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS service_role_all ON public.extension_feedback;
CREATE POLICY service_role_all ON public.extension_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ── reports ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.reports (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  job_id        uuid        REFERENCES public.jobs ON DELETE SET NULL,
  evaluation_id uuid        REFERENCES public.evaluations ON DELETE SET NULL,
  title         text        NOT NULL,
  content       jsonb       NOT NULL DEFAULT '{}',
  type          text        NOT NULL DEFAULT 'evaluation',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS reports_user_idx ON public.reports (user_id, created_at DESC);
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS reports_select_own ON public.reports;
CREATE POLICY reports_select_own ON public.reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS reports_insert_own ON public.reports;
CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS reports_update_own ON public.reports;
CREATE POLICY reports_update_own ON public.reports
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
DROP POLICY IF EXISTS reports_delete_own ON public.reports;
CREATE POLICY reports_delete_own ON public.reports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- ── invites ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  invited_by  text,
  tier        text        NOT NULL DEFAULT 'pro',
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at     timestamptz,
  invite_code uuid        NOT NULL DEFAULT gen_random_uuid()
);
CREATE UNIQUE INDEX IF NOT EXISTS invites_email_idx ON public.invites (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS invites_code_idx  ON public.invites (invite_code);
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS users_read_own_invite ON public.invites;
CREATE POLICY users_read_own_invite ON public.invites
  FOR SELECT TO authenticated USING (lower(email) = lower(auth.email()));
