alter table jobs
  add column if not exists canonical_url text,
  add column if not exists ats_family text,
  add column if not exists applied_at timestamptz,
  add column if not exists last_response_at timestamptz,
  add column if not exists followup_due_at timestamptz,
  add column if not exists followup_state text default 'pending';

update jobs
set followup_state = coalesce(followup_state, 'pending')
where followup_state is null;

create unique index if not exists jobs_user_canonical_url_idx
  on jobs (user_id, canonical_url)
  where canonical_url is not null;

create index if not exists jobs_user_followup_due_idx
  on jobs (user_id, followup_due_at desc);

create table if not exists application_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  job_id uuid references jobs on delete cascade,
  source_tab_id integer,
  source_url text,
  target_url text,
  ats_family text,
  status text default 'intent' not null,
  started_at timestamptz default now() not null,
  fill_started_at timestamptz,
  submitted_at timestamptz,
  failure_reason text,
  last_seen_at timestamptz default now() not null,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

create index if not exists application_sessions_user_job_idx
  on application_sessions (user_id, job_id, created_at desc);

create index if not exists application_sessions_user_tab_idx
  on application_sessions (user_id, source_tab_id, created_at desc);

create index if not exists application_sessions_user_status_idx
  on application_sessions (user_id, status, created_at desc);

alter table application_sessions enable row level security;

drop policy if exists "application_sessions_select_own" on application_sessions;
create policy "application_sessions_select_own" on application_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "application_sessions_insert_own" on application_sessions;
create policy "application_sessions_insert_own" on application_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "application_sessions_update_own" on application_sessions;
create policy "application_sessions_update_own" on application_sessions
  for update using (auth.uid() = user_id);

update jobs
set followup_state = case
  when status = 'applied' and followup_due_at is not null then 'due'
  when status = 'applied' then 'pending'
  else coalesce(followup_state, 'pending')
end,
applied_at = case
  when status = 'applied' and applied_at is null then updated_at
  else applied_at
end,
followup_due_at = case
  when status = 'applied' and followup_due_at is null then updated_at + interval '14 days'
  else followup_due_at
end;
