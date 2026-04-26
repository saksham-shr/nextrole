-- ============================================================
-- NextRole schema v1
-- Run this in the Supabase SQL editor or via: supabase db push
-- ============================================================

-- Enums -------------------------------------------------------

create type job_status as enum (
  'pending',
  'evaluated',
  'applied',
  'interview',
  'offer',
  'rejected',
  'archived'
);

create type task_status as enum (
  'queued',
  'running',
  'completed',
  'failed',
  'cancelled'
);

create type task_type as enum (
  'evaluate',
  'compare',
  'batch',
  'scan',
  'pdf',
  'interview_prep',
  'followup',
  'patterns',
  'deep_research',
  'apply'
);

create type provider_type as enum (
  'anthropic',
  'openai',
  'manual'
);

-- ============================================================
-- profiles
-- One row per user. Created automatically via trigger on signup.
-- ============================================================
create table profiles (
  id              uuid        references auth.users on delete cascade primary key,
  email           text        not null,
  full_name       text,
  target_roles    text[],
  target_locations text[],
  comp_min        integer,
  comp_max        integer,
  years_experience integer,
  base_cv         text,       -- raw CV text used to power every evaluation
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

alter table profiles enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);

create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);

create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

-- Trigger: auto-create profile shell when a new auth user signs up
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ============================================================
-- provider_credentials
-- One row per user per provider. Encrypted API key stored here.
-- ============================================================
create table provider_credentials (
  id            uuid          default gen_random_uuid() primary key,
  user_id       uuid          references auth.users on delete cascade not null,
  provider      provider_type not null,
  encrypted_key text,                     -- null when provider = 'manual'
  model         text,                     -- e.g. 'claude-sonnet-4-6', 'gpt-4o'
  is_active     boolean       default true not null,
  last_used_at  timestamptz,
  created_at    timestamptz   default now() not null,
  updated_at    timestamptz   default now() not null,
  unique (user_id, provider)
);

alter table provider_credentials enable row level security;

create policy "provider_credentials_select_own" on provider_credentials
  for select using (auth.uid() = user_id);

create policy "provider_credentials_insert_own" on provider_credentials
  for insert with check (auth.uid() = user_id);

create policy "provider_credentials_update_own" on provider_credentials
  for update using (auth.uid() = user_id);

create policy "provider_credentials_delete_own" on provider_credentials
  for delete using (auth.uid() = user_id);

-- ============================================================
-- jobs
-- Central record for every role in the pipeline.
-- ============================================================
create table jobs (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users on delete cascade not null,
  title       text        not null,
  company     text        not null,
  url         text,
  description text,
  status      job_status  default 'pending' not null,
  source      text,       -- 'manual', 'scanner', 'batch', career page URL, etc.
  archetype   text,       -- 'Backend', 'Platform', 'PM', 'Product Eng', etc.
  notes       text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create index jobs_user_status_idx on jobs (user_id, status);
create index jobs_user_created_idx on jobs (user_id, created_at desc);

alter table jobs enable row level security;

create policy "jobs_select_own" on jobs
  for select using (auth.uid() = user_id);

create policy "jobs_insert_own" on jobs
  for insert with check (auth.uid() = user_id);

create policy "jobs_update_own" on jobs
  for update using (auth.uid() = user_id);

create policy "jobs_delete_own" on jobs
  for delete using (auth.uid() = user_id);

-- ============================================================
-- job_events
-- Immutable audit timeline. One row per event per job.
-- ============================================================
create table job_events (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users on delete cascade not null,
  job_id      uuid        references jobs on delete cascade not null,
  event_type  text        not null,  -- 'status_change', 'note_added', 'resume_generated', etc.
  payload     jsonb,
  created_at  timestamptz default now() not null
);

create index job_events_job_idx on job_events (job_id, created_at desc);

alter table job_events enable row level security;

create policy "job_events_select_own" on job_events
  for select using (auth.uid() = user_id);

create policy "job_events_insert_own" on job_events
  for insert with check (auth.uid() = user_id);

-- ============================================================
-- evaluations
-- One evaluation per job (re-evaluate overwrites or adds a new row).
-- ============================================================
create table evaluations (
  id                      uuid        default gen_random_uuid() primary key,
  user_id                 uuid        references auth.users on delete cascade not null,
  job_id                  uuid        references jobs on delete cascade not null,
  score                   integer     check (score >= 0 and score <= 100),
  decision                text        check (decision in ('apply', 'skip', 'watch')),
  role_fit                jsonb,      -- structured fit breakdown
  compensation_analysis   jsonb,      -- level + comp range vs target
  cv_match                jsonb,      -- strengths, gaps, missing signals
  personalization_guidance jsonb,     -- tailoring hooks
  interview_signals       jsonb,      -- predicted interview themes
  legitimacy_check        jsonb,      -- freshness, red flags
  raw_output              text,       -- full LLM response for debugging/manual mode paste
  provider                text,       -- 'anthropic' | 'openai' | 'manual'
  model                   text,
  created_at              timestamptz default now() not null,
  updated_at              timestamptz default now() not null
);

create index evaluations_job_idx on evaluations (job_id);
create index evaluations_user_idx on evaluations (user_id, created_at desc);

alter table evaluations enable row level security;

create policy "evaluations_select_own" on evaluations
  for select using (auth.uid() = user_id);

create policy "evaluations_insert_own" on evaluations
  for insert with check (auth.uid() = user_id);

create policy "evaluations_update_own" on evaluations
  for update using (auth.uid() = user_id);

create policy "evaluations_delete_own" on evaluations
  for delete using (auth.uid() = user_id);

-- ============================================================
-- reports
-- Long-form evaluation report artifact linked to a job.
-- ============================================================
create table reports (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users on delete cascade not null,
  job_id          uuid        references jobs on delete cascade,
  evaluation_id   uuid        references evaluations on delete set null,
  title           text        not null,
  content         jsonb       not null default '{}',
  type            text        not null default 'evaluation',
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

create index reports_user_idx on reports (user_id, created_at desc);

alter table reports enable row level security;

create policy "reports_select_own" on reports
  for select using (auth.uid() = user_id);

create policy "reports_insert_own" on reports
  for insert with check (auth.uid() = user_id);

create policy "reports_update_own" on reports
  for update using (auth.uid() = user_id);

create policy "reports_delete_own" on reports
  for delete using (auth.uid() = user_id);

-- ============================================================
-- resumes
-- Tailored resume artifact. PDF stored in Supabase Storage.
-- ============================================================
create table resumes (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users on delete cascade not null,
  job_id      uuid        references jobs on delete set null,
  title       text        not null,
  content     text,       -- tailored resume prose
  html        text,       -- rendered HTML template
  pdf_url     text,       -- Supabase Storage path
  coverage    integer     check (coverage >= 0 and coverage <= 100),
  status      text        not null default 'draft' check (status in ('draft', 'final')),
  version     integer     not null default 1,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

create index resumes_user_idx on resumes (user_id, created_at desc);

alter table resumes enable row level security;

create policy "resumes_select_own" on resumes
  for select using (auth.uid() = user_id);

create policy "resumes_insert_own" on resumes
  for insert with check (auth.uid() = user_id);

create policy "resumes_update_own" on resumes
  for update using (auth.uid() = user_id);

create policy "resumes_delete_own" on resumes
  for delete using (auth.uid() = user_id);

-- ============================================================
-- task_runs
-- Every async action (evaluate, PDF gen, scan, etc.) logs here.
-- ============================================================
create table task_runs (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references auth.users on delete cascade not null,
  type             task_type   not null,
  status           task_status not null default 'queued',
  input            jsonb,
  output           jsonb,
  error            text,
  linked_job_id    uuid        references jobs on delete set null,
  progress_message text,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

create index task_runs_user_status_idx on task_runs (user_id, status);
create index task_runs_user_created_idx on task_runs (user_id, created_at desc);

alter table task_runs enable row level security;

create policy "task_runs_select_own" on task_runs
  for select using (auth.uid() = user_id);

create policy "task_runs_insert_own" on task_runs
  for insert with check (auth.uid() = user_id);

create policy "task_runs_update_own" on task_runs
  for update using (auth.uid() = user_id);
