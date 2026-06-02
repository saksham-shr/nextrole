-- ── Payment system fixes ────────────────────────────────────────────────────
-- 1. payment_records table   — billing history visible to users + refund tracking
-- 2. subscription_expiry_notified_at column — prevents duplicate expiry warning emails
-- 3. apply_subscription_payment (v2) — extends from current period end, not now()
-- 4. apply_topup_payment (v2)         — records amount in payment_records

-- ── 1. payment_records ──────────────────────────────────────────────────────

CREATE TABLE public.payment_records (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid        NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  razorpay_payment_id text        NOT NULL,
  razorpay_order_id   text,
  type                text        NOT NULL CHECK (type IN ('subscription', 'topup')),
  plan                text,         -- 'starter' | 'pro'
  period              text,         -- 'monthly' | 'yearly'
  pack_id             text,         -- topup pack id
  amount_paise        integer     NOT NULL DEFAULT 0,
  currency            text        NOT NULL DEFAULT 'INR',
  status              text        NOT NULL DEFAULT 'captured'
                                   CHECK (status IN ('captured', 'refunded', 'partially_refunded')),
  refunded_at         timestamptz,
  refund_id           text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payment_records_payment_id_key UNIQUE (razorpay_payment_id)
);

CREATE INDEX payment_records_user_id_idx
  ON public.payment_records (user_id, created_at DESC);

ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- Users can read their own payment records (for billing history UI)
CREATE POLICY payment_records_select_own ON public.payment_records
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Only service role can insert / update (via stored procedures and webhooks)
GRANT SELECT ON public.payment_records TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.payment_records TO service_role;

-- ── 2. subscription_expiry_notified_at column ────────────────────────────────
-- Tracks when the "your subscription expires soon" email was last sent.
-- Prevents the daily cron from sending duplicate 3-day warnings.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS subscription_expiry_notified_at timestamptz;

-- ── 3. apply_subscription_payment v2 ────────────────────────────────────────
-- Key changes vs v1:
--   • Reads current subscription_ends_at and extends from GREATEST(now(), current_end)
--     so upgrades and renewals do not eat into already-paid time.
--   • Accepts optional p_amount_paise + p_order_id to record in payment_records.
--   • New optional params have DEFAULT values so existing callers still work.

DROP FUNCTION IF EXISTS public.apply_subscription_payment(uuid, text, text, text, integer);

CREATE OR REPLACE FUNCTION public.apply_subscription_payment(
  p_user_id       uuid,
  p_payment_id    text,
  p_plan          text,
  p_period        text,
  p_daily_credits integer,
  p_amount_paise  integer DEFAULT 0,
  p_order_id      text    DEFAULT NULL
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_sentinel_id  uuid;
  v_current_ends timestamptz;
  v_ends_at      timestamptz;
BEGIN
  -- Dedup sentinel: fail silently if this payment was already processed.
  INSERT INTO public.usage_log (user_id, task_type, model, credits_used, razorpay_payment_id)
  VALUES (p_user_id, 'subscription', 'razorpay', 0, p_payment_id)
  ON CONFLICT (razorpay_payment_id) DO NOTHING
  RETURNING id INTO v_sentinel_id;

  IF v_sentinel_id IS NULL THEN
    RETURN 'already_processed';
  END IF;

  -- Read the current paid-through date so upgrades extend it rather than
  -- reset to now(). A brand-new subscriber has NULL → falls back to now().
  SELECT subscription_ends_at INTO v_current_ends
  FROM public.profiles WHERE id = p_user_id;

  v_ends_at := CASE p_period
    WHEN 'yearly' THEN GREATEST(now(), COALESCE(v_current_ends, now())) + interval '1 year'
    ELSE               GREATEST(now(), COALESCE(v_current_ends, now())) + interval '1 month'
  END;

  UPDATE public.profiles
  SET
    tier                            = p_plan::user_tier,
    credits_remaining               = p_daily_credits,
    subscription_status             = 'active',
    subscription_ends_at            = v_ends_at,
    billing_period_start            = now(),
    subscription_period             = p_period,
    subscription_expiry_notified_at = NULL,   -- reset so expiry email fires again near new end
    updated_at                      = now()
  WHERE id = p_user_id;

  -- Record for billing history (best-effort: skip if amount not provided)
  IF p_amount_paise > 0 THEN
    INSERT INTO public.payment_records (
      user_id, razorpay_payment_id, razorpay_order_id,
      type, plan, period, amount_paise
    ) VALUES (
      p_user_id, p_payment_id, p_order_id,
      'subscription', p_plan, p_period, p_amount_paise
    ) ON CONFLICT (razorpay_payment_id) DO NOTHING;
  END IF;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.apply_subscription_payment(uuid, text, text, text, integer, integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.apply_subscription_payment(uuid, text, text, text, integer, integer, text) TO service_role;

-- ── 4. apply_topup_payment v2 ────────────────────────────────────────────────
-- Same dedup logic, adds payment_records insert.

DROP FUNCTION IF EXISTS public.apply_topup_payment(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.apply_topup_payment(
  p_user_id      uuid,
  p_payment_id   text,
  p_credits      integer,
  p_amount_paise integer DEFAULT 0,
  p_pack_id      text    DEFAULT NULL,
  p_order_id     text    DEFAULT NULL
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

  IF p_amount_paise > 0 THEN
    INSERT INTO public.payment_records (
      user_id, razorpay_payment_id, razorpay_order_id,
      type, pack_id, amount_paise
    ) VALUES (
      p_user_id, p_payment_id, p_order_id,
      'topup', p_pack_id, p_amount_paise
    ) ON CONFLICT (razorpay_payment_id) DO NOTHING;
  END IF;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.apply_topup_payment(uuid, text, integer, integer, text, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.apply_topup_payment(uuid, text, integer, integer, text, text) TO service_role;
