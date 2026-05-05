-- ============================================================
-- Migration 010: monetization — tiers, credits, billing
-- ============================================================

-- Tier enum
create type user_tier as enum ('free', 'starter', 'pro', 'team', 'byok');

-- Add monetization columns to profiles
alter table profiles
  add column if not exists tier                        user_tier   not null default 'free',
  add column if not exists credits_remaining           integer     not null default 10,
  add column if not exists credits_reset_at            timestamptz not null default (date_trunc('month', now()) + interval '1 month'),
  add column if not exists lemon_squeezy_customer_id   text,
  add column if not exists lemon_squeezy_subscription_id text,
  add column if not exists subscription_status         text        check (subscription_status in ('active', 'cancelled', 'past_due', 'expired')),
  add column if not exists subscription_ends_at        timestamptz;

-- Credits per tier (reference)
-- free: 10, starter: 100, pro: 500, team: 2000, byok: -1 (unlimited)
comment on column profiles.credits_remaining is '-1 = unlimited (byok tier)';
comment on column profiles.tier              is 'free | starter | pro | team | byok';

-- Index for billing lookups
create index if not exists profiles_lemon_customer_idx on profiles (lemon_squeezy_customer_id);
create index if not exists profiles_tier_idx on profiles (tier);

-- ============================================================
-- usage_log
-- One row per AI request. Used for analytics and audit.
-- ============================================================
create table usage_log (
  id           uuid        default gen_random_uuid() primary key,
  user_id      uuid        references auth.users on delete cascade not null,
  task_type    text        not null,   -- 'evaluate' | 'compare' | 'resume_tailor' | etc.
  model        text        not null,   -- internal model used (not shown to user)
  credits_used integer     not null default 1,
  byok         boolean     not null default false,  -- true = used their own key
  created_at   timestamptz default now() not null
);

create index usage_log_user_idx on usage_log (user_id, created_at desc);
create index usage_log_created_idx on usage_log (created_at desc);

alter table usage_log enable row level security;

create policy "usage_log_select_own" on usage_log
  for select using (auth.uid() = user_id);

create policy "usage_log_insert_own" on usage_log
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- reset_credits_for_tier()
-- Called by webhook on subscription renewal / tier change.
-- ============================================================
create or replace function reset_credits_for_tier(p_user_id uuid, p_tier user_tier)
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  v_credits integer;
begin
  v_credits := case p_tier
    when 'free'    then 10
    when 'starter' then 100
    when 'pro'     then 500
    when 'team'    then 2000
    when 'byok'    then -1
    else 10
  end;

  update profiles set
    tier              = p_tier,
    credits_remaining = v_credits,
    credits_reset_at  = date_trunc('month', now()) + interval '1 month',
    updated_at        = now()
  where id = p_user_id;
end;
$$;

-- ============================================================
-- deduct_credit(p_user_id, p_amount)
-- Atomically checks and deducts credits.
-- Returns true if deduction succeeded, false if insufficient.
-- ============================================================
create or replace function deduct_credit(p_user_id uuid, p_amount integer default 1)
returns boolean
language plpgsql
security definer set search_path = public
as $$
declare
  v_credits integer;
begin
  -- Lock the row
  select credits_remaining into v_credits
  from profiles
  where id = p_user_id
  for update;

  -- -1 = unlimited (byok)
  if v_credits = -1 then
    return true;
  end if;

  if v_credits < p_amount then
    return false;
  end if;

  update profiles set
    credits_remaining = credits_remaining - p_amount,
    updated_at        = now()
  where id = p_user_id;

  return true;
end;
$$;
