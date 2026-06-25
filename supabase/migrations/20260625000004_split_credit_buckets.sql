-- Split credits_remaining into three tracked buckets.
-- credits_remaining stays as the spendable total (sum of all three).
-- Deduction order: daily → bonus → topup.

-- ── 1. New columns ────────────────────────────────────────────────────────────

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS daily_credits integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bonus_credits  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS topup_credits  integer NOT NULL DEFAULT 0;

-- Backfill: existing balance treated as bonus credits (earned/unknown origin).
UPDATE public.profiles
SET
  daily_credits = 0,
  topup_credits = 0,
  bonus_credits = COALESCE(credits_remaining, 0)
WHERE daily_credits = 0 AND topup_credits = 0 AND bonus_credits = 0;

-- ── 2. deduct_credit — drain daily → bonus → topup ────────────────────────────

CREATE OR REPLACE FUNCTION public.deduct_credit(p_user_id uuid, p_amount integer DEFAULT 1)
  RETURNS boolean
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_daily     integer;
  v_bonus     integer;
  v_topup     integer;
  v_remaining integer;
  v_need      integer;
  v_d_use     integer;
  v_b_use     integer;
  v_t_use     integer;
BEGIN
  SELECT daily_credits, bonus_credits, topup_credits, credits_remaining
  INTO   v_daily, v_bonus, v_topup, v_remaining
  FROM   public.profiles
  WHERE  id = p_user_id
  FOR UPDATE;

  IF v_remaining IS NULL OR v_remaining < p_amount THEN
    RETURN false;
  END IF;

  v_need  := p_amount;

  v_d_use := LEAST(v_daily, v_need);  v_need := v_need - v_d_use;
  v_b_use := LEAST(v_bonus, v_need);  v_need := v_need - v_b_use;
  v_t_use := LEAST(v_topup, v_need);

  UPDATE public.profiles
  SET
    daily_credits     = daily_credits     - v_d_use,
    bonus_credits     = bonus_credits     - v_b_use,
    topup_credits     = topup_credits     - v_t_use,
    credits_remaining = credits_remaining - p_amount,
    updated_at        = now()
  WHERE id = p_user_id;

  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.deduct_credit(uuid, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.deduct_credit(uuid, integer) TO service_role;

-- ── 3. add_credits — bonus bucket (referrals, grants, etc.) ──────────────────

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
  SET
    bonus_credits     = COALESCE(bonus_credits, 0)     + p_amount,
    credits_remaining = COALESCE(credits_remaining, 0) + p_amount,
    updated_at        = now()
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

-- ── 4. apply_subscription_payment — add daily bucket on activation ────────────

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
  v_sentinel_id     uuid;
  v_daily_credits   integer;
  v_current_ends    timestamptz;
  v_current_bonus   integer;
  v_current_topup   integer;
  v_ends_at         timestamptz;
BEGIN
  v_daily_credits := CASE p_plan
    WHEN 'pro'     THEN 300
    WHEN 'starter' THEN 100
    ELSE 10
  END;

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

  SELECT subscription_ends_at,
         COALESCE(bonus_credits, 0),
         COALESCE(topup_credits, 0)
  INTO   v_current_ends, v_current_bonus, v_current_topup
  FROM   public.profiles WHERE id = p_user_id;

  v_ends_at := CASE p_period
    WHEN 'yearly' THEN GREATEST(now(), COALESCE(v_current_ends, now())) + interval '1 year'
    ELSE               GREATEST(now(), COALESCE(v_current_ends, now())) + interval '1 month'
  END;

  UPDATE public.profiles
  SET
    tier                            = p_plan::user_tier,
    -- Add fresh daily allocation; preserve existing bonus + topup
    daily_credits                   = v_daily_credits,
    credits_remaining               = v_daily_credits + v_current_bonus + v_current_topup,
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

-- ── 5. apply_subscription_renewal — reset daily bucket only ──────────────────

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
  v_bonus         integer;
  v_topup         integer;
  v_ends_at       timestamptz;
  v_plan          text;
BEGIN
  SELECT tier, subscription_period, subscription_ends_at,
         COALESCE(bonus_credits, 0), COALESCE(topup_credits, 0)
  INTO   v_plan, v_period, v_current_ends, v_bonus, v_topup
  FROM   public.profiles WHERE id = p_user_id;

  v_daily_credits := CASE v_plan
    WHEN 'pro'     THEN 300
    WHEN 'starter' THEN 100
    ELSE 10
  END;

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
    daily_credits        = v_daily_credits,
    credits_remaining    = v_daily_credits + v_bonus + v_topup,
    topup_forfeit_at     = NULL,
    updated_at           = now()
  WHERE id = p_user_id;

  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.apply_subscription_renewal(uuid, text, text, integer) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.apply_subscription_renewal(uuid, text, text, integer) TO service_role;

-- ── 6. apply_topup_payment — add to topup bucket ─────────────────────────────

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
  v_tier        text;
  v_cap         integer;
  v_new_topup   integer;
BEGIN
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

  SELECT tier INTO v_tier FROM public.profiles WHERE id = p_user_id;
  v_cap := CASE v_tier WHEN 'starter' THEN 500 ELSE 99999 END;

  UPDATE public.profiles
  SET
    topup_credits     = LEAST(COALESCE(topup_credits, 0) + p_credits, v_cap),
    credits_remaining = LEAST(COALESCE(credits_remaining, 0) + p_credits,
                              COALESCE(daily_credits, 0) + COALESCE(bonus_credits, 0) + v_cap),
    updated_at        = now()
  WHERE id = p_user_id
  RETURNING topup_credits INTO v_new_topup;

  IF v_new_topup IS NULL THEN
    RAISE EXCEPTION 'apply_topup_payment: profile % not found', p_user_id
      USING ERRCODE = 'no_data_found';
  END IF;

  IF v_new_topup = v_cap AND p_credits > 0 THEN
    RETURN 'cap_exceeded';
  END IF;

  RETURN 'ok';
END;
$$;
REVOKE ALL ON FUNCTION public.apply_topup_payment(uuid, text, text, integer, integer, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.apply_topup_payment(uuid, text, text, integer, integer, text) TO service_role;

-- ── 7. reset_daily_credits — reset daily bucket, preserve others ─────────────

CREATE OR REPLACE FUNCTION public.reset_daily_credits()
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET
    daily_credits    = CASE WHEN tier = 'pro' THEN 300 ELSE 100 END,
    credits_remaining = CASE WHEN tier = 'pro' THEN 300 ELSE 100 END
                        + COALESCE(bonus_credits, 0)
                        + COALESCE(topup_credits, 0),
    credits_reset_at = (current_date + interval '1 day')::timestamptz,
    updated_at       = now()
  WHERE tier IN ('starter', 'pro')
    AND subscription_status = 'active'
    AND credits_reset_at <= now();
END;
$$;
REVOKE ALL ON FUNCTION public.reset_daily_credits() FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reset_daily_credits() TO service_role;

-- ── 8. reset_credits_for_tier — used by admin panel ──────────────────────────

CREATE OR REPLACE FUNCTION public.reset_credits_for_tier(p_user_id uuid, p_tier user_tier)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
DECLARE
  v_daily integer;
BEGIN
  v_daily := CASE p_tier
    WHEN 'pro'     THEN 300
    WHEN 'starter' THEN 100
    ELSE 0
  END;

  UPDATE public.profiles SET
    tier              = p_tier,
    daily_credits     = v_daily,
    bonus_credits     = CASE WHEN p_tier IN ('starter','pro') THEN COALESCE(bonus_credits, 0) ELSE 0 END,
    topup_credits     = CASE WHEN p_tier IN ('starter','pro') THEN COALESCE(topup_credits, 0)  ELSE 0 END,
    credits_remaining = v_daily
                        + CASE WHEN p_tier IN ('starter','pro') THEN COALESCE(bonus_credits, 0) ELSE 0 END
                        + CASE WHEN p_tier IN ('starter','pro') THEN COALESCE(topup_credits, 0)  ELSE 0 END,
    credits_reset_at  = date_trunc('month', now()) + interval '1 month',
    updated_at        = now()
  WHERE id = p_user_id;
END;
$$;
REVOKE ALL ON FUNCTION public.reset_credits_for_tier(uuid, user_tier) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reset_credits_for_tier(uuid, user_tier) TO service_role;

-- text overload (webhook path)
CREATE OR REPLACE FUNCTION public.reset_credits_for_tier(p_user_id uuid, p_tier text)
  RETURNS void
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  PERFORM public.reset_credits_for_tier(p_user_id, p_tier::user_tier);
END;
$$;
REVOKE ALL ON FUNCTION public.reset_credits_for_tier(uuid, text) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.reset_credits_for_tier(uuid, text) TO service_role;

-- ── 9. Backfill test account with correct buckets ─────────────────────────────
-- samshr2004 upgraded to starter: had 45 bonus, got 100 daily → 145 total.
UPDATE public.profiles
SET
  daily_credits     = 100,
  bonus_credits     = 45,
  topup_credits     = 0,
  credits_remaining = 145
WHERE email = 'samshr2004@gmail.com' AND tier = 'starter';
