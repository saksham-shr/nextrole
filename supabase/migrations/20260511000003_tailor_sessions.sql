-- ============================================================
-- Migration: AI tailor session tracking
-- Adds `tailor_sessions` counter to daily_usage and extends the
-- increment_daily_usage RPC. Used by /api/extension/tailor to
-- enforce per-tier daily caps (Starter = 1/day, Pro = credit-bound).
-- ============================================================

alter table public.daily_usage
  add column if not exists tailor_sessions integer not null default 0;

create or replace function public.increment_daily_usage(
  p_field text,
  p_user  uuid
) returns integer
language plpgsql security definer as $$
declare
  v_val integer;
begin
  insert into public.daily_usage (user_id, date)
  values (p_user, current_date)
  on conflict (user_id, date) do nothing;

  if p_field = 'evaluations' then
    update public.daily_usage
       set evaluations = evaluations + 1, updated_at = now()
     where user_id = p_user and date = current_date
     returning evaluations into v_val;

  elsif p_field = 'resumes' then
    update public.daily_usage
       set resumes = resumes + 1, updated_at = now()
     where user_id = p_user and date = current_date
     returning resumes into v_val;

  elsif p_field = 'autofills' then
    update public.daily_usage
       set autofills = autofills + 1, updated_at = now()
     where user_id = p_user and date = current_date
     returning autofills into v_val;

  elsif p_field = 'tailor_sessions' then
    update public.daily_usage
       set tailor_sessions = tailor_sessions + 1, updated_at = now()
     where user_id = p_user and date = current_date
     returning tailor_sessions into v_val;

  else
    raise exception 'unknown field: %', p_field;
  end if;

  return v_val;
end;
$$;
