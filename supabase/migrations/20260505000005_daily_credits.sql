-- Daily credit reset for Starter/Pro users.
--
-- Credits reset at midnight UTC every day, not monthly.
-- Free users have no credits (their limits are enforced via daily_usage table).
-- Unused credits do NOT carry over to the next day.

-- Update reset_credits_for_tier to set credits based on daily amounts
create or replace function reset_credits_for_tier(
  p_user_id uuid,
  p_tier    text
) returns void
language plpgsql security definer as $$
begin
  update profiles
  set
    credits_remaining = case
      when p_tier = 'pro'     then 200
      when p_tier = 'starter' then 50
      else 0
    end,
    credits_reset_at = (current_date + interval '1 day')::timestamptz
  where id = p_user_id;
end;
$$;

-- Bulk reset function called by the nightly cron job.
-- Resets all active paid subscribers at midnight UTC.
create or replace function reset_all_daily_credits()
returns void
language plpgsql security definer as $$
begin
  update profiles
  set
    credits_remaining = case
      when tier = 'pro'     then 200
      when tier = 'starter' then 50
      else credits_remaining  -- free / team / byok untouched
    end,
    credits_reset_at = (current_date + interval '1 day')::timestamptz
  where tier in ('starter', 'pro')
    and (
      subscription_status = 'active'
      or (subscription_ends_at is not null and subscription_ends_at > now())
    );
end;
$$;

-- Schedule the reset via pg_cron (requires pg_cron extension on Supabase).
-- Run: SELECT cron.schedule('reset-daily-credits', '0 0 * * *', 'SELECT reset_all_daily_credits()');
-- This must be run manually once in the Supabase SQL editor after applying this migration.

-- Also update deduct_credit to treat negative credits_remaining as 0 (defensive)
create or replace function deduct_credit(
  p_user_id uuid,
  p_amount  integer default 1
) returns boolean
language plpgsql security definer as $$
declare
  v_remaining integer;
begin
  select credits_remaining into v_remaining
  from profiles
  where id = p_user_id
  for update;

  if v_remaining is null or v_remaining < p_amount then
    return false;
  end if;

  update profiles
  set credits_remaining = credits_remaining - p_amount
  where id = p_user_id;

  return true;
end;
$$;
