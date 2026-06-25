-- Fix payment RPCs to match actual caller parameter names and derive credits from plan.
--
-- Also widens payment_records.type CHECK to include 'renewal'.

ALTER TABLE public.payment_records
  DROP CONSTRAINT IF EXISTS payment_records_type_check;

ALTER TABLE public.payment_records
  ADD CONSTRAINT payment_records_type_check
  CHECK (type IN ('subscription', 'renewal', 'topup'));

--
--
-- Problems fixed:
--   1. Callers send p_razorpay_payment_id / p_razorpay_order_id but functions
--      expected p_payment_id / p_order_id — named-param mismatch → NULL values.
--   2. apply_subscription_payment required p_daily_credits but no caller passed it
--      → credits_remaining was never updated on upgrade.
--   3. Sentinel INSERT referenced task_type/model columns (renamed to activity_type).
--      Now uses payment_records (already has UNIQUE on razorpay_payment_id) as sentinel.

-- ── apply_subscription_payment ────────────────────────────────────────────────

DROP FUNCTION IF EXISTS public.apply_subscription_payment(uuid, text, text, text, integer, integer, text);
DROP FUNCTION IF EXISTS public.apply_subscription_payment(uuid, text, text, text, integer);

CREATE OR REPLACE FUNCTION public.apply_subscription_payment(
  p_user_id             uuid,
  p_razorpay_payment_id text,
  p_razorpay_sub_id     text    DEFAULT NULL,
  p_razorpay_order_id   text    DEFAULT NULL,
  p_plan                text    DEFAULT NULL,
  p_period              text    DEFAULT NULL,
  p_amount_paise        integer DEFAULT 0
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_sentinel_id   uuid;
  v_daily_credits integer;
  v_current_ends  timestamptz;
  v_ends_at       timestamptz;
BEGIN
  -- Derive daily credits from plan (no caller needs to know this mapping)
  v_daily_credits := CASE p_plan
    WHEN 'pro'     THEN 300
    WHEN 'starter' THEN 100
    ELSE 10
  END;

  -- Dedup sentinel: use payment_records unique constraint on razorpay_payment_id.
  -- Always insert (even with 0 amount) so dedup works regardless of amount.
  INSERT INTO public.payment_records (
    user_id, razorpay_payment_id, razorpay_order_id,
    type, plan, period, amount_paise
  ) VALUES (
    p_user_id, p_razorpay_payment_id, p_razorpay_order_id,
    'subscription', p_plan, p_period, p_amount_paise
  )
  ON CONFLICT (razorpay_payment_id) DO NOTHING
  RETURNING id INTO v_sentinel_id;

  IF v_sentinel_id IS NULL THEN
    RETURN 'already_processed';
  END IF;

  -- Extend from current paid-through date so upgrades don't eat paid time.
  SELECT subscription_ends_at INTO v_current_ends
  FROM public.profiles WHERE id = p_user_id;

  v_ends_at := CASE p_period
    WHEN 'yearly' THEN GREATEST(now(), COALESCE(v_current_ends, now())) + interval '1 year'
    ELSE               GREATEST(now(), COALESCE(v_current_ends, now())) + interval '1 month'
  END;

  UPDATE public.profiles
  SET
    tier                            = p_plan::user_tier,
    credits_remaining               = v_daily_credits,
    razorpay_subscription_id        = COALESCE(p_razorpay_sub_id, razorpay_subscription_id),
    subscription_status             = 'active',
    subscription_ends_at            = v_ends_at,
    billing_period_start            = now(),
    subscription_period             = p_period,
    topup_forfeit_at                = NULL,
    subscription_expiry_notified_at = NULL,
    updated_at                      = now()
  WHERE id = p_user_id;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.apply_subscription_payment(uuid, text, text, text, text, text, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.apply_subscription_payment(uuid, text, text, text, text, text, integer) TO service_role;


-- ── apply_subscription_renewal ────────────────────────────────────────────────
-- Recreate with correct param names. Extends subscription_ends_at by one period.

DROP FUNCTION IF EXISTS public.apply_subscription_renewal(uuid, text, text, integer);

CREATE OR REPLACE FUNCTION public.apply_subscription_renewal(
  p_user_id             uuid,
  p_razorpay_payment_id text,
  p_razorpay_sub_id     text    DEFAULT NULL,
  p_amount_paise        integer DEFAULT 0
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_sentinel_id   uuid;
  v_period        text;
  v_daily_credits integer;
  v_current_ends  timestamptz;
  v_ends_at       timestamptz;
  v_plan          text;
BEGIN
  -- Read current plan/period so we know how far to extend.
  SELECT tier, subscription_period, subscription_ends_at, credits_remaining
  INTO   v_plan, v_period, v_current_ends, v_daily_credits
  FROM   public.profiles
  WHERE  id = p_user_id;

  v_daily_credits := CASE v_plan
    WHEN 'pro'     THEN 300
    WHEN 'starter' THEN 100
    ELSE 10
  END;

  -- Dedup via payment_records.
  INSERT INTO public.payment_records (
    user_id, razorpay_payment_id,
    type, plan, period, amount_paise
  ) VALUES (
    p_user_id, p_razorpay_payment_id,
    'renewal', v_plan, v_period, p_amount_paise
  )
  ON CONFLICT (razorpay_payment_id) DO NOTHING
  RETURNING id INTO v_sentinel_id;

  IF v_sentinel_id IS NULL THEN
    RETURN 'already_processed';
  END IF;

  v_ends_at := CASE v_period
    WHEN 'yearly' THEN GREATEST(now(), COALESCE(v_current_ends, now())) + interval '1 year'
    ELSE               GREATEST(now(), COALESCE(v_current_ends, now())) + interval '1 month'
  END;

  UPDATE public.profiles
  SET
    subscription_status  = 'active',
    subscription_ends_at = v_ends_at,
    credits_remaining    = v_daily_credits,
    topup_forfeit_at     = NULL,
    updated_at           = now()
  WHERE id = p_user_id;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.apply_subscription_renewal(uuid, text, text, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.apply_subscription_renewal(uuid, text, text, integer) TO service_role;


-- ── apply_topup_payment ───────────────────────────────────────────────────────
-- Fix param names: p_payment_id → p_razorpay_payment_id, p_order_id → p_razorpay_order_id.

DROP FUNCTION IF EXISTS public.apply_topup_payment(uuid, text, integer, integer, text, text);
DROP FUNCTION IF EXISTS public.apply_topup_payment(uuid, text, integer);

CREATE OR REPLACE FUNCTION public.apply_topup_payment(
  p_user_id             uuid,
  p_razorpay_payment_id text,
  p_pack_id             text    DEFAULT NULL,
  p_credits             integer DEFAULT 0,
  p_amount_paise        integer DEFAULT 0,
  p_razorpay_order_id   text    DEFAULT NULL
)
  RETURNS text
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_sentinel_id uuid;
  v_new_credits integer;
  v_tier        text;
  v_cap         integer;
BEGIN
  -- Dedup via payment_records.
  INSERT INTO public.payment_records (
    user_id, razorpay_payment_id, razorpay_order_id,
    type, pack_id, amount_paise
  ) VALUES (
    p_user_id, p_razorpay_payment_id, p_razorpay_order_id,
    'topup', p_pack_id, p_amount_paise
  )
  ON CONFLICT (razorpay_payment_id) DO NOTHING
  RETURNING id INTO v_sentinel_id;

  IF v_sentinel_id IS NULL THEN
    RETURN 'already_processed';
  END IF;

  -- Enforce per-tier topup cap (Starter: 500, Pro: unlimited = 99999).
  SELECT tier INTO v_tier FROM public.profiles WHERE id = p_user_id;
  v_cap := CASE v_tier WHEN 'starter' THEN 500 ELSE 99999 END;

  UPDATE public.profiles
  SET
    credits_remaining = LEAST(COALESCE(credits_remaining, 0) + p_credits, v_cap),
    updated_at        = now()
  WHERE id = p_user_id
  RETURNING credits_remaining INTO v_new_credits;

  IF v_new_credits IS NULL THEN
    RAISE EXCEPTION 'apply_topup_payment: profile % not found', p_user_id
      USING ERRCODE = 'no_data_found';
  END IF;

  -- If capped, signal the caller.
  IF v_new_credits = v_cap AND p_credits > 0 THEN
    RETURN 'cap_exceeded';
  END IF;

  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.apply_topup_payment(uuid, text, text, integer, integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.apply_topup_payment(uuid, text, text, integer, integer, text) TO service_role;
