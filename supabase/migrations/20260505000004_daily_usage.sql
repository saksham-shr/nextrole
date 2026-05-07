-- Daily usage tracking per user per day
-- Used to enforce Free tier hard limits and to show usage stats on the billing page.

create table if not exists daily_usage (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  date        date        not null default current_date,
  evaluations integer     not null default 0,
  resumes     integer     not null default 0,
  autofills   integer     not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  primary key (user_id, date)
);

-- Row-level security: users can only read their own usage
alter table daily_usage enable row level security;

create policy "Users can read own daily usage"
  on daily_usage for select
  using (auth.uid() = user_id);

-- Service role can upsert (used by API routes)
create policy "Service role can upsert daily usage"
  on daily_usage for all
  using (true)
  with check (true);

-- Helper function: increment a usage counter and return new value
-- Usage: select increment_daily_usage('eval', '<user_id>')
create or replace function increment_daily_usage(
  p_field  text,
  p_user   uuid
) returns integer
language plpgsql security definer as $$
declare
  v_val integer;
begin
  insert into daily_usage (user_id, date)
  values (p_user, current_date)
  on conflict (user_id, date) do nothing;

  if p_field = 'evaluations' then
    update daily_usage set evaluations = evaluations + 1, updated_at = now()
    where user_id = p_user and date = current_date
    returning evaluations into v_val;
  elsif p_field = 'resumes' then
    update daily_usage set resumes = resumes + 1, updated_at = now()
    where user_id = p_user and date = current_date
    returning resumes into v_val;
  elsif p_field = 'autofills' then
    update daily_usage set autofills = autofills + 1, updated_at = now()
    where user_id = p_user and date = current_date
    returning autofills into v_val;
  else
    raise exception 'unknown field: %', p_field;
  end if;

  return v_val;
end;
$$;

-- Index for fast per-user date lookups
create index if not exists daily_usage_user_date_idx on daily_usage(user_id, date desc);
