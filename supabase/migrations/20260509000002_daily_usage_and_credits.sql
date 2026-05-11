-- ─── Daily usage + credits bootstrap ─────────────────────────────────────────
--
-- Consolidates 20260505000004 + 20260505000005 (which were never applied) and
-- adds the autofill_credits_used column needed for Starter daily cap tracking.
-- Safe to run multiple times (IF NOT EXISTS / CREATE OR REPLACE throughout).

-- ── 1. daily_usage table ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.daily_usage (
  user_id               uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date                  date        NOT NULL DEFAULT current_date,
  evaluations           integer     NOT NULL DEFAULT 0,
  resumes               integer     NOT NULL DEFAULT 0,
  autofills             integer     NOT NULL DEFAULT 0,
  autofill_credits_used integer     NOT NULL DEFAULT 0,  -- Starter daily cap tracking
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, date)
);

-- Add autofill_credits_used to existing tables that were created without it
ALTER TABLE public.daily_usage
  ADD COLUMN IF NOT EXISTS autofill_credits_used integer NOT NULL DEFAULT 0;

-- ── 2. RLS ───────────────────────────────────────────────────────────────────

ALTER TABLE public.daily_usage ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_usage' AND policyname = 'Users can read own daily usage'
  ) THEN
    CREATE POLICY "Users can read own daily usage"
      ON public.daily_usage FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'daily_usage' AND policyname = 'Service role can upsert daily usage'
  ) THEN
    CREATE POLICY "Service role can upsert daily usage"
      ON public.daily_usage FOR ALL
      TO service_role
      USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS daily_usage_user_date_idx ON public.daily_usage(user_id, date DESC);

-- ── 3. increment_daily_usage ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.increment_daily_usage(
  p_field  text,
  p_user   uuid
) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_val integer;
BEGIN
  -- Ensure row exists for today
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

-- ── 4. deduct_credit ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.deduct_credit(
  p_user_id uuid,
  p_amount  integer DEFAULT 1
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
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

-- ── 5. Daily credit reset functions ──────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.reset_credits_for_tier(
  p_user_id uuid,
  p_tier    text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET
    credits_remaining = CASE
      WHEN p_tier = 'pro'     THEN 200
      WHEN p_tier = 'starter' THEN 50
      ELSE 0
    END,
    credits_reset_at = (current_date + interval '1 day')::timestamptz
  WHERE id = p_user_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reset_all_daily_credits()
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.profiles
  SET
    credits_remaining = CASE
      WHEN tier = 'pro'     THEN 200
      WHEN tier = 'starter' THEN 50
      ELSE credits_remaining
    END,
    credits_reset_at = (current_date + interval '1 day')::timestamptz
  WHERE tier IN ('starter', 'pro')
    AND (
      subscription_status = 'active'
      OR (subscription_ends_at IS NOT NULL AND subscription_ends_at > now())
    );
END;
$$;

-- ── 6. extension_feedback table ──────────────────────────────────────────────
-- (from 20260509000001 — included here so everything runs together)

CREATE TABLE IF NOT EXISTS public.extension_feedback (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        REFERENCES public.profiles(id) ON DELETE SET NULL,
  url         text        NOT NULL,
  page_title  text,
  action      text        NOT NULL CHECK (action IN ('not_a_job', 'confirmed')),
  source      text,
  confidence  text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.extension_feedback ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'extension_feedback' AND policyname = 'service_role_all'
  ) THEN
    CREATE POLICY "service_role_all" ON public.extension_feedback
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS extension_feedback_action_idx  ON public.extension_feedback (action);
CREATE INDEX IF NOT EXISTS extension_feedback_source_idx  ON public.extension_feedback (source);
CREATE INDEX IF NOT EXISTS extension_feedback_created_idx ON public.extension_feedback (created_at DESC);
