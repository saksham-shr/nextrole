-- ============================================================
-- NextRole — Master Schema v2
-- Generated: 2026-05-27
--
-- Clean schema for fresh Supabase project.
-- Changes from v1:
--   • Removed tables: task_runs, scan_sources, scan_runs,
--     scan_discoveries, story_bank_entries, interview_prep_packs,
--     team_members, waitlist, profile_files
--   • Removed enums: task_status, task_type
--   • Removed tier: byok (removed from user_tier enum + handle_new_user)
--   • Removed column: usage_log.byok
--   • Removed functions: revoke_team_members,
--     profile_files_ensure_single_default, expire_byok_trials
--   • Removed: profile-files storage bucket
--   • Removed columns: profiles.lemon_squeezy_customer_id,
--     profiles.lemon_squeezy_subscription_id
--   • Folded in: resume_source migration (resumes.source, template_id)
--   • Folded in: profile_canonical migration (17-section profile)
--   • CV is parsed on upload → text stored in profiles.base_cv only
--   • New users start as free tier with 10 credits
--
-- 16 tables · 3 enums · 10 functions · 1 trigger · no storage bucket
-- Safe to apply on a brand-new Supabase project.
-- ============================================================


-- ── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;


-- ── Enums ────────────────────────────────────────────────────

CREATE TYPE public.job_status AS ENUM (
  'pending', 'evaluated', 'applied', 'interview',
  'offer', 'rejected', 'archived', 'withdrawn'
);

CREATE TYPE public.provider_type AS ENUM (
  'anthropic', 'openai', 'manual', 'gemini'
);

CREATE TYPE public.user_tier AS ENUM (
  'free', 'starter', 'pro', 'team'
);


-- ── Tables ───────────────────────────────────────────────────

-- ── profiles ─────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id                            uuid          PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email                         text          NOT NULL,
  full_name                     text,
  first_name                    text,
  last_name                     text,
  preferred_name                text,
  name_prefix                   text,
  middle_name                   text,
  fathers_name                  text,
  local_given_name              text,
  local_family_name             text,
  target_roles                  text[],
  target_locations              text[],
  target_archetypes             text[],
  preferred_company_types       text[],
  work_mode                     text,
  seniority                     text,
  comp_min                      integer,
  comp_max                      integer,
  current_comp                  integer,
  expected_salary               integer,
  expected_salary_min           numeric,
  expected_salary_max           numeric,
  ctc_fixed                     numeric,
  ctc_variable                  numeric,
  ctc_note                      text,
  salary_currency               text          NOT NULL DEFAULT 'INR',
  available_from                date,
  years_experience              integer,
  base_cv                       text,
  phone                         text,
  phone_country_code            text          DEFAULT '+91',
  alternate_phone               text,
  phone_device_type             text,
  linkedin_url                  text,
  github_url                    text,
  portfolio_url                 text,
  naukri_url                    text,
  publications_url              text,
  other_url                     text,
  country                       text          DEFAULT 'India',
  city                          text,
  state_province                text,
  zip_postal                    text,
  street_address                text,
  address_line2                 text,
  permanent_address_same        boolean       NOT NULL DEFAULT true,
  permanent_address             text,
  notice_period                 text,
  notice_period_note            text,
  willing_to_relocate           boolean       DEFAULT true,
  sponsorship_needed            boolean       DEFAULT false,
  work_authorization            text,
  authorized_countries          text[]        NOT NULL DEFAULT '{}',
  open_to_hybrid                boolean       NOT NULL DEFAULT false,
  govt_military_member          boolean,
  signed_non_compete            boolean,
  nationality                   text          DEFAULT 'Indian',
  gender                        text,
  pronouns                      text,
  race_ethnicity                text,
  veteran_status                text,
  disability_status             text,
  marital_status                text,
  category                      text,
  dob                           date,
  government_ids                jsonb         NOT NULL DEFAULT '{}',
  hispanic_or_latino            boolean,
  lgbtq_member                  boolean,
  accommodation_needed          text,
  indian_army_veteran           boolean,
  referral_source               text,
  referrals                     jsonb         NOT NULL DEFAULT '{}',
  qa_library                    jsonb         NOT NULL DEFAULT '[]',
  consents                      jsonb         NOT NULL DEFAULT '{}',
  work_experience               jsonb         DEFAULT '[]',
  education                     jsonb         DEFAULT '[]',
  certifications                jsonb         DEFAULT '[]',
  skills                        text[]        DEFAULT '{}',
  projects                      jsonb         NOT NULL DEFAULT '[]',
  languages                     text[],
  preferred_language            text          DEFAULT 'en',
  communication_level           text,
  eval_score_apply              numeric(3,1)  DEFAULT 3.5,
  eval_score_watch              numeric(3,1)  DEFAULT 2.5,
  custom_eval_focus             text,
  custom_archetypes             text[],
  onboarding_completed          boolean       NOT NULL DEFAULT false,
  tier                          user_tier     NOT NULL DEFAULT 'free',
  credits_remaining             integer       NOT NULL DEFAULT 0,
  credits_reset_at              timestamptz   NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  subscription_status           text,
  subscription_ends_at          timestamptz,
  billing_period_start          timestamptz,
  subscription_period           text,
  trial_expiry_notified_at      timestamptz,
  created_at                    timestamptz   NOT NULL DEFAULT now(),
  updated_at                    timestamptz   NOT NULL DEFAULT now(),

  CONSTRAINT profiles_expected_salary_range_chk
    CHECK (expected_salary_min IS NULL OR expected_salary_max IS NULL
           OR expected_salary_max >= expected_salary_min),
  CONSTRAINT profiles_expected_salary_min_nonneg_chk
    CHECK (expected_salary_min IS NULL OR expected_salary_min >= 0),
  CONSTRAINT profiles_expected_salary_max_nonneg_chk
    CHECK (expected_salary_max IS NULL OR expected_salary_max >= 0),
  CONSTRAINT profiles_ctc_fixed_nonneg_chk
    CHECK (ctc_fixed IS NULL OR ctc_fixed >= 0),
  CONSTRAINT profiles_ctc_variable_nonneg_chk
    CHECK (ctc_variable IS NULL OR ctc_variable >= 0)
);

COMMENT ON COLUMN public.profiles.government_ids IS
  'India govt IDs. Store aadhaar_masked (last 4 only), never full 12-digit Aadhaar.';
COMMENT ON COLUMN public.profiles.consents IS
  'Marketing + data-consent toggles. Legal attestations are excluded — always user-confirmed.';

-- ── jobs ─────────────────────────────────────────────────────
CREATE TABLE public.jobs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title            text        NOT NULL,
  company          text        NOT NULL,
  url              text,
  canonical_url    text,
  description      text,
  status           job_status  NOT NULL DEFAULT 'pending',
  source           text,
  archetype        text,
  ats_family       text,
  notes            text,
  applied_at       timestamptz,
  last_response_at timestamptz,
  followup_due_at  timestamptz,
  followup_state   text        DEFAULT 'pending',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── evaluations ──────────────────────────────────────────────
CREATE TABLE public.evaluations (
  id                       uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                  uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  job_id                   uuid        NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  score                    numeric,
  decision                 text,
  role_fit                 jsonb,
  compensation_analysis    jsonb,
  cv_match                 jsonb,
  personalization_guidance jsonb,
  interview_signals        jsonb,
  legitimacy_check         jsonb,
  level_strategy           jsonb,
  raw_output               text,
  provider                 text,
  model                    text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now()
);

-- ── resumes ──────────────────────────────────────────────────
CREATE TABLE public.resumes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  job_id      uuid        REFERENCES public.jobs ON DELETE SET NULL,
  title       text        NOT NULL,
  content     text,
  html        text,
  pdf_url     text,
  coverage    integer,
  status      text        NOT NULL DEFAULT 'draft',
  version     integer     NOT NULL DEFAULT 1,
  source      text        NOT NULL DEFAULT 'ai' CHECK (source IN ('ai', 'custom')),
  template_id text        NOT NULL DEFAULT 'classic' CHECK (template_id IN ('classic', 'modern')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── usage_log ────────────────────────────────────────────────
CREATE TABLE public.usage_log (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  task_type           text        NOT NULL,
  model               text        NOT NULL,
  credits_used        integer     NOT NULL DEFAULT 1,
  razorpay_payment_id text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ── provider_credentials ─────────────────────────────────────
CREATE TABLE public.provider_credentials (
  id            uuid          PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid          NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  provider      provider_type NOT NULL,
  encrypted_key text,
  model         text,
  is_active     boolean       NOT NULL DEFAULT true,
  last_used_at  timestamptz,
  created_at    timestamptz   NOT NULL DEFAULT now(),
  updated_at    timestamptz   NOT NULL DEFAULT now(),
  CONSTRAINT provider_credentials_user_id_provider_key UNIQUE (user_id, provider)
);

-- ── extension_tokens ─────────────────────────────────────────
CREATE TABLE public.extension_tokens (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  token_hash   text        NOT NULL,
  name         text        NOT NULL DEFAULT 'Browser Extension',
  last_used_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  expires_at   timestamptz NOT NULL
);

-- ── job_events ───────────────────────────────────────────────
CREATE TABLE public.job_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  job_id      uuid        NOT NULL REFERENCES public.jobs ON DELETE CASCADE,
  event_type  text        NOT NULL,
  payload     jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── prompt_templates ─────────────────────────────────────────
CREATE TABLE public.prompt_templates (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  name        text        NOT NULL,
  description text,
  workflow    text        NOT NULL DEFAULT 'evaluate',
  template    text        NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- ── reports ──────────────────────────────────────────────────
CREATE TABLE public.reports (
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

-- ── daily_usage ──────────────────────────────────────────────
CREATE TABLE public.daily_usage (
  user_id               uuid    NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  date                  date    NOT NULL DEFAULT CURRENT_DATE,
  evaluations           integer NOT NULL DEFAULT 0,
  resumes               integer NOT NULL DEFAULT 0,
  autofills             integer NOT NULL DEFAULT 0,
  autofill_credits_used integer NOT NULL DEFAULT 0,
  tailor_sessions       integer NOT NULL DEFAULT 0,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

-- ── extension_feedback ───────────────────────────────────────
CREATE TABLE public.extension_feedback (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES auth.users ON DELETE SET NULL,
  url         text        NOT NULL,
  page_title  text,
  action      text        NOT NULL,
  source      text,
  confidence  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── application_sessions ─────────────────────────────────────
CREATE TABLE public.application_sessions (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  job_id          uuid        REFERENCES public.jobs ON DELETE SET NULL,
  source_tab_id   integer,
  source_url      text,
  target_url      text,
  ats_family      text,
  status          text        NOT NULL DEFAULT 'intent',
  started_at      timestamptz NOT NULL DEFAULT now(),
  fill_started_at timestamptz,
  submitted_at    timestamptz,
  failure_reason  text,
  last_seen_at    timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ── invites ──────────────────────────────────────────────────
CREATE TABLE public.invites (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  email       text        NOT NULL,
  invited_by  text,
  tier        text        NOT NULL DEFAULT 'pro',
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  used_at     timestamptz,
  invite_code uuid        NOT NULL DEFAULT gen_random_uuid()
);

-- ── admin_audit_log ──────────────────────────────────────────
CREATE TABLE public.admin_audit_log (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id    uuid,
  actor_email text        NOT NULL,
  action      text        NOT NULL,
  target_type text        NOT NULL,
  target_id   text,
  before      jsonb,
  after       jsonb,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ── commerce_config ──────────────────────────────────────────
-- Singleton row (id always = 1) — service-role only
CREATE TABLE public.commerce_config (
  id         integer     NOT NULL DEFAULT 1 CHECK (id = 1),
  overrides  jsonb       NOT NULL DEFAULT '{}',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (id)
);


-- ── Indexes ──────────────────────────────────────────────────

-- profiles
CREATE INDEX profiles_tier_idx                   ON public.profiles (tier);
CREATE INDEX idx_profiles_trial_expiry_notified  ON public.profiles (subscription_ends_at, trial_expiry_notified_at);
CREATE INDEX profiles_name_idx                   ON public.profiles (lower(first_name), lower(last_name));

-- jobs
CREATE INDEX        jobs_user_created_idx        ON public.jobs (user_id, created_at DESC);
CREATE INDEX        jobs_user_status_idx          ON public.jobs (user_id, status);
CREATE INDEX        jobs_user_followup_due_idx    ON public.jobs (user_id, followup_due_at DESC);
CREATE UNIQUE INDEX jobs_user_canonical_url_idx   ON public.jobs (user_id, canonical_url) WHERE canonical_url IS NOT NULL;

-- evaluations
CREATE INDEX evaluations_user_idx                ON public.evaluations (user_id, created_at DESC);
CREATE INDEX evaluations_job_idx                 ON public.evaluations (job_id);

-- resumes
CREATE INDEX resumes_user_idx                    ON public.resumes (user_id, created_at DESC);
CREATE INDEX resumes_source_idx                  ON public.resumes (user_id, source, created_at DESC);

-- usage_log
CREATE INDEX usage_log_user_idx                  ON public.usage_log (user_id, created_at DESC);
CREATE INDEX usage_log_created_idx               ON public.usage_log (created_at DESC);
CREATE UNIQUE INDEX usage_log_razorpay_payment_id_idx
  ON public.usage_log (razorpay_payment_id)
  WHERE razorpay_payment_id IS NOT NULL;

-- extension_tokens
CREATE UNIQUE INDEX extension_tokens_token_hash_idx ON public.extension_tokens (token_hash);
CREATE INDEX        extension_tokens_user_idx       ON public.extension_tokens (user_id);

-- job_events
CREATE INDEX job_events_job_idx                  ON public.job_events (job_id, created_at DESC);

-- prompt_templates
CREATE INDEX prompt_templates_user_id_idx        ON public.prompt_templates (user_id);

-- reports
CREATE INDEX reports_user_idx                    ON public.reports (user_id, created_at DESC);

-- daily_usage
CREATE INDEX daily_usage_user_date_idx           ON public.daily_usage (user_id, date DESC);

-- extension_feedback
CREATE INDEX extension_feedback_created_idx      ON public.extension_feedback (created_at DESC);
CREATE INDEX extension_feedback_action_idx       ON public.extension_feedback (action);

-- application_sessions
CREATE INDEX application_sessions_user_job_idx    ON public.application_sessions (user_id, job_id, created_at DESC);
CREATE INDEX application_sessions_user_status_idx ON public.application_sessions (user_id, status, created_at DESC);
CREATE INDEX application_sessions_user_tab_idx    ON public.application_sessions (user_id, source_tab_id, created_at DESC);

-- invites
CREATE UNIQUE INDEX invites_email_idx            ON public.invites (lower(email));
CREATE UNIQUE INDEX invites_code_idx             ON public.invites (invite_code);

-- admin_audit_log
CREATE INDEX admin_audit_log_actor_idx           ON public.admin_audit_log (actor_id, created_at DESC);
CREATE INDEX admin_audit_log_created_idx         ON public.admin_audit_log (created_at DESC);
CREATE INDEX admin_audit_log_target_idx          ON public.admin_audit_log (target_type, target_id, created_at DESC);


-- ── Row Level Security ────────────────────────────────────────

ALTER TABLE public.profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evaluations          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resumes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_tokens     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prompt_templates     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_usage          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.extension_feedback   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.application_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commerce_config      ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY profiles_insert_own ON public.profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- jobs
CREATE POLICY jobs_select_own ON public.jobs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY jobs_insert_own ON public.jobs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY jobs_update_own ON public.jobs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY jobs_delete_own ON public.jobs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- evaluations
CREATE POLICY evaluations_select_own ON public.evaluations
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY evaluations_insert_own ON public.evaluations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY evaluations_update_own ON public.evaluations
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY evaluations_delete_own ON public.evaluations
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- resumes
CREATE POLICY resumes_select_own ON public.resumes
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY resumes_insert_own ON public.resumes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY resumes_update_own ON public.resumes
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY resumes_delete_own ON public.resumes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- usage_log
CREATE POLICY usage_log_select_own ON public.usage_log
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY usage_log_insert_own ON public.usage_log
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- provider_credentials
CREATE POLICY provider_credentials_select_own ON public.provider_credentials
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY provider_credentials_insert_own ON public.provider_credentials
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY provider_credentials_update_own ON public.provider_credentials
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY provider_credentials_delete_own ON public.provider_credentials
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- extension_tokens
CREATE POLICY extension_tokens_own ON public.extension_tokens
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- job_events
CREATE POLICY job_events_select_own ON public.job_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY job_events_insert_own ON public.job_events
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- prompt_templates
CREATE POLICY prompt_templates_own ON public.prompt_templates
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- reports
CREATE POLICY reports_select_own ON public.reports
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY reports_insert_own ON public.reports
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY reports_update_own ON public.reports
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY reports_delete_own ON public.reports
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- daily_usage
CREATE POLICY "Users can read own daily usage" ON public.daily_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Service role can upsert daily usage" ON public.daily_usage
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- extension_feedback (telemetry — service_role only)
CREATE POLICY service_role_all ON public.extension_feedback
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- application_sessions
CREATE POLICY application_sessions_select_own ON public.application_sessions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY application_sessions_insert_own ON public.application_sessions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY application_sessions_update_own ON public.application_sessions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- invites (users can only read their own invite)
CREATE POLICY users_read_own_invite ON public.invites
  FOR SELECT TO authenticated USING (lower(email) = lower(auth.email()));

-- admin_audit_log: RLS enabled, no user policies → service_role only
-- commerce_config:  RLS enabled, no user policies → service_role only


-- ── Functions ────────────────────────────────────────────────

-- handle_new_user ─────────────────────────────────────────────
-- Auto-creates a profile on every new auth.users INSERT.
-- New users start as free tier with 10 credits.
CREATE OR REPLACE FUNCTION public.handle_new_user()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id, email, tier, credits_remaining
  ) VALUES (
    NEW.id,
    NEW.email,
    'free',
    10
  );
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC;

-- deduct_credit ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.deduct_credit(p_user_id uuid, p_amount integer DEFAULT 1)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  v_remaining integer;
BEGIN
  SELECT credits_remaining INTO v_remaining
  FROM public.profiles
  WHERE id = p_user_id
  FOR UPDATE;

  IF v_remaining IS NULL OR v_remaining < p_amount THEN
    RETURN false;
  END IF;

  UPDATE public.profiles
  SET credits_remaining = credits_remaining - p_amount
  WHERE id = p_user_id;

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.deduct_credit(uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.deduct_credit(uuid, integer) TO service_role;

-- add_credits ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_new integer;
BEGIN
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'add_credits requires positive amount; got %', p_amount
      USING ERRCODE = 'check_violation';
  END IF;

  UPDATE public.profiles
  SET credits_remaining = COALESCE(credits_remaining, 0) + p_amount
  WHERE id = p_user_id
  RETURNING credits_remaining INTO v_new;

  IF v_new IS NULL THEN
    RAISE EXCEPTION 'add_credits: profile % not found', p_user_id
      USING ERRCODE = 'no_data_found';
  END IF;

  RETURN v_new;
END;
$$;
REVOKE ALL ON FUNCTION public.add_credits(uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.add_credits(uuid, integer) TO service_role;

-- increment_daily_usage ───────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_daily_usage(p_field text, p_user uuid)
  RETURNS integer
  LANGUAGE plpgsql
  SECURITY DEFINER
AS $$
DECLARE
  v_val integer;
BEGIN
  INSERT INTO public.daily_usage (user_id, date)
  VALUES (p_user, current_date)
  ON CONFLICT (user_id, date) DO NOTHING;

  IF p_field = 'evaluations' THEN
    UPDATE public.daily_usage
    SET evaluations = evaluations + 1, updated_at = now()
    WHERE user_id = p_user AND date = current_date
    RETURNING evaluations INTO v_val;
  ELSIF p_field = 'resumes' THEN
    UPDATE public.daily_usage
    SET resumes = resumes + 1, updated_at = now()
    WHERE user_id = p_user AND date = current_date
    RETURNING resumes INTO v_val;
  ELSIF p_field = 'autofills' THEN
    UPDATE public.daily_usage
    SET autofills = autofills + 1, updated_at = now()
    WHERE user_id = p_user AND date = current_date
    RETURNING autofills INTO v_val;
  ELSE
    RAISE EXCEPTION 'unknown field: %', p_field;
  END IF;

  RETURN v_val;
END;
$$;
REVOKE ALL ON FUNCTION public.increment_daily_usage(text, uuid) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.increment_daily_usage(text, uuid) TO service_role;

-- reset_credits_for_tier (text overload — webhook path) ───────
CREATE OR REPLACE FUNCTION public.reset_credits_for_tier(p_user_id uuid, p_tier text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    credits_remaining = CASE
      WHEN p_tier = 'pro'     THEN 300
      WHEN p_tier = 'starter' THEN 100
      ELSE 0
    END,
    credits_reset_at = (current_date + interval '1 day')::timestamptz,
    updated_at       = now()
  WHERE id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_credits_for_tier(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reset_credits_for_tier(uuid, text) TO service_role;

-- reset_credits_for_tier (user_tier overload — admin panel) ───
CREATE OR REPLACE FUNCTION public.reset_credits_for_tier(p_user_id uuid, p_tier user_tier)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_credits integer;
BEGIN
  v_credits := CASE p_tier
    WHEN 'free'    THEN 10
    WHEN 'starter' THEN 100
    WHEN 'pro'     THEN 300
    WHEN 'team'    THEN 2000
    ELSE 10
  END;

  UPDATE public.profiles SET
    tier              = p_tier,
    credits_remaining = v_credits,
    credits_reset_at  = date_trunc('month', now()) + interval '1 month',
    updated_at        = now()
  WHERE id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_credits_for_tier(uuid, user_tier) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reset_credits_for_tier(uuid, user_tier) TO service_role;

-- reset_daily_credits ─────────────────────────────────────────
-- Cron-triggered — resets users whose credits_reset_at has passed.
CREATE OR REPLACE FUNCTION public.reset_daily_credits()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    credits_remaining = CASE
      WHEN tier = 'pro'     THEN 300
      WHEN tier = 'starter' THEN 100
      ELSE credits_remaining
    END,
    credits_reset_at = (current_date + interval '1 day')::timestamptz,
    updated_at       = now()
  WHERE tier IN ('starter', 'pro')
    AND subscription_status = 'active'
    AND credits_reset_at <= now();
END;
$$;
REVOKE ALL ON FUNCTION public.reset_daily_credits() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reset_daily_credits() TO service_role;

-- reset_paid_credits_batch ────────────────────────────────────
-- Monthly billing reset: expires past-due subs, resets starter/pro credits
-- with pro topup carry-over calculation.
CREATE OR REPLACE FUNCTION public.reset_paid_credits_batch()
  RETURNS TABLE(reset_count integer, expired_count integer)
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_reset   integer := 0;
  v_expired integer := 0;
BEGIN
  -- 1. Expire subscriptions past their end date
  WITH expired AS (
    UPDATE public.profiles
    SET
      tier                 = 'free',
      credits_remaining    = 0,
      subscription_status  = 'expired',
      subscription_ends_at = NULL,
      billing_period_start = NULL,
      subscription_period  = NULL
    WHERE tier IN ('starter', 'pro')
      AND subscription_status IN ('active', 'past_due', 'cancelled')
      AND subscription_ends_at IS NOT NULL
      AND subscription_ends_at < now()
    RETURNING 1
  ) SELECT count(*)::integer INTO v_expired FROM expired;

  -- 2. Reset starter (flat 100) and pro (300 + unspent topups)
  WITH starter_reset AS (
    UPDATE public.profiles SET credits_remaining = 100
    WHERE tier = 'starter'
      AND subscription_status IN ('active', 'past_due', 'cancelled')
    RETURNING 1
  ),
  pro_users AS (
    SELECT id, billing_period_start
    FROM public.profiles
    WHERE tier = 'pro'
      AND subscription_status IN ('active', 'past_due', 'cancelled')
  ),
  pro_topups AS (
    SELECT
      u.id,
      COALESCE(SUM(ABS(ul.credits_used)) FILTER (WHERE ul.task_type = 'topup'), 0)::integer          AS topup_purchased,
      COALESCE(SUM(GREATEST(ul.credits_used, 0)) FILTER (WHERE ul.task_type <> 'topup'), 0)::integer AS total_spent,
      GREATEST(1,
        EXTRACT(EPOCH FROM (now() - COALESCE(u.billing_period_start, now() - interval '30 days'))) / 86400
      )::integer AS days_elapsed
    FROM pro_users u
    LEFT JOIN public.usage_log ul
      ON ul.user_id = u.id
      AND ul.created_at >= COALESCE(u.billing_period_start, now() - interval '30 days')
    GROUP BY u.id, u.billing_period_start
  ),
  pro_reset AS (
    UPDATE public.profiles p
    SET credits_remaining = 300 + GREATEST(0,
          pt.topup_purchased - GREATEST(0, pt.total_spent - (300 * pt.days_elapsed)))
    FROM pro_topups pt
    WHERE p.id = pt.id
    RETURNING 1
  )
  SELECT
    (SELECT count(*) FROM starter_reset)::integer +
    (SELECT count(*) FROM pro_reset)::integer
  INTO v_reset;

  RETURN QUERY SELECT v_reset, v_expired;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_paid_credits_batch() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reset_paid_credits_batch() TO service_role;

-- apply_topup_payment ─────────────────────────────────────────
-- Atomic dedup + credit grant for Razorpay topup payments.
CREATE OR REPLACE FUNCTION public.apply_topup_payment(
  p_user_id    uuid,
  p_payment_id text,
  p_credits    integer
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_sentinel_id uuid;
  v_new_credits integer;
BEGIN
  INSERT INTO public.usage_log (user_id, task_type, model, credits_used, razorpay_payment_id)
  VALUES (p_user_id, 'topup', 'razorpay', -p_credits, p_payment_id)
  ON CONFLICT (razorpay_payment_id) DO NOTHING
  RETURNING id INTO v_sentinel_id;

  IF v_sentinel_id IS NULL THEN
    RETURN 'already_processed';
  END IF;

  UPDATE public.profiles
  SET
    credits_remaining = COALESCE(credits_remaining, 0) + p_credits,
    updated_at        = now()
  WHERE id = p_user_id
  RETURNING credits_remaining INTO v_new_credits;

  IF v_new_credits IS NULL THEN
    RAISE EXCEPTION 'apply_topup_payment: profile % not found', p_user_id
      USING ERRCODE = 'no_data_found';
  END IF;

  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.apply_topup_payment(uuid, text, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.apply_topup_payment(uuid, text, integer) TO service_role;

-- apply_subscription_payment ──────────────────────────────────
-- Atomic dedup + subscription activation for Razorpay subscription payments.
CREATE OR REPLACE FUNCTION public.apply_subscription_payment(
  p_user_id       uuid,
  p_payment_id    text,
  p_plan          text,
  p_period        text,
  p_daily_credits integer
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_sentinel_id uuid;
  v_ends_at     timestamptz;
BEGIN
  INSERT INTO public.usage_log (user_id, task_type, model, credits_used, razorpay_payment_id)
  VALUES (p_user_id, 'subscription', 'razorpay', 0, p_payment_id)
  ON CONFLICT (razorpay_payment_id) DO NOTHING
  RETURNING id INTO v_sentinel_id;

  IF v_sentinel_id IS NULL THEN
    RETURN 'already_processed';
  END IF;

  v_ends_at := CASE p_period
    WHEN 'yearly'  THEN now() + interval '1 year'
    ELSE                now() + interval '1 month'
  END;

  UPDATE public.profiles
  SET
    tier                 = p_plan::user_tier,
    credits_remaining    = p_daily_credits,
    subscription_status  = 'active',
    subscription_ends_at = v_ends_at,
    billing_period_start = now(),
    subscription_period  = p_period,
    updated_at           = now()
  WHERE id = p_user_id;

  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.apply_subscription_payment(uuid, text, text, text, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.apply_subscription_payment(uuid, text, text, text, integer) TO service_role;

-- ── Triggers ─────────────────────────────────────────────────

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
