-- ============================================================
-- NextRole — full catch-up migration
-- Run in Supabase Dashboard → SQL Editor → New query → Run
-- Safe to re-run: all statements use IF NOT EXISTS guards.
-- Migration 001 (base schema) and 002 (score type) already applied.
-- This covers 003 → 009 plus missing enum values.
-- ============================================================


-- ── Enum extensions (safe: ADD VALUE IF NOT EXISTS) ──────────

-- Migration 005 task types
alter type task_type add value if not exists 'contact_draft';
alter type task_type add value if not exists 'training_eval';
alter type task_type add value if not exists 'project_eval';
-- Used in app but missing from all migrations
alter type task_type add value if not exists 'negotiate';

-- Migration 006 provider type
alter type provider_type add value if not exists 'gemini';


-- ── Fix: provider_credentials unique constraint ───────────────
-- Required for upsert onConflict: "user_id,provider" in saveProviderKey.

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'provider_credentials'::regclass
      and contype = 'u'
      and conkey = (
        select array_agg(attnum order by attnum)
        from pg_attribute
        where attrelid = 'provider_credentials'::regclass
          and attname in ('user_id', 'provider')
      )
  ) then
    alter table provider_credentials add constraint provider_credentials_user_id_provider_key unique (user_id, provider);
  end if;
end $$;


-- ── Migration 003: scanner tables ────────────────────────────

create table if not exists scan_sources (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references auth.users on delete cascade not null,
  name             text        not null,
  url              text        not null,
  type             text        not null default 'custom',
  is_active        boolean     default true not null,
  last_scanned_at  timestamptz,
  total_discovered integer     default 0 not null,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

create index if not exists scan_sources_user_idx on scan_sources (user_id, created_at desc);

do $$ begin
  if not exists (select 1 from pg_policies where tablename='scan_sources' and policyname='scan_sources_select_own') then
    alter table scan_sources enable row level security;
    create policy "scan_sources_select_own" on scan_sources for select using (auth.uid() = user_id);
    create policy "scan_sources_insert_own" on scan_sources for insert with check (auth.uid() = user_id);
    create policy "scan_sources_update_own" on scan_sources for update using (auth.uid() = user_id);
    create policy "scan_sources_delete_own" on scan_sources for delete using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists scan_runs (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references auth.users on delete cascade not null,
  source_id        uuid        references scan_sources on delete cascade not null,
  status           text        not null default 'running',
  discovered_count integer     default 0 not null,
  added_count      integer     default 0 not null,
  duplicate_count  integer     default 0 not null,
  error            text,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

create index if not exists scan_runs_source_idx on scan_runs (source_id, created_at desc);
create index if not exists scan_runs_user_idx   on scan_runs (user_id, created_at desc);

do $$ begin
  if not exists (select 1 from pg_policies where tablename='scan_runs' and policyname='scan_runs_select_own') then
    alter table scan_runs enable row level security;
    create policy "scan_runs_select_own" on scan_runs for select using (auth.uid() = user_id);
    create policy "scan_runs_insert_own" on scan_runs for insert with check (auth.uid() = user_id);
    create policy "scan_runs_update_own" on scan_runs for update using (auth.uid() = user_id);
  end if;
end $$;

create table if not exists scan_discoveries (
  id                   uuid        default gen_random_uuid() primary key,
  user_id              uuid        references auth.users on delete cascade not null,
  scan_run_id          uuid        references scan_runs on delete cascade not null,
  source_id            uuid        references scan_sources on delete set null,
  job_id               uuid        references jobs on delete set null,
  title                text        not null,
  company              text        not null,
  url                  text,
  location             text,
  department           text,
  description_snippet  text,
  status               text        not null default 'new',
  created_at           timestamptz default now() not null
);

create index if not exists scan_discoveries_run_idx  on scan_discoveries (scan_run_id, created_at desc);
create index if not exists scan_discoveries_user_idx on scan_discoveries (user_id, created_at desc);

do $$ begin
  if not exists (select 1 from pg_policies where tablename='scan_discoveries' and policyname='scan_discoveries_select_own') then
    alter table scan_discoveries enable row level security;
    create policy "scan_discoveries_select_own" on scan_discoveries for select using (auth.uid() = user_id);
    create policy "scan_discoveries_insert_own" on scan_discoveries for insert with check (auth.uid() = user_id);
    create policy "scan_discoveries_update_own" on scan_discoveries for update using (auth.uid() = user_id);
  end if;
end $$;


-- ── Migration 004: story bank + interview prep ───────────────

create table if not exists story_bank_entries (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users on delete cascade not null,
  job_id      uuid        references jobs on delete set null,
  title       text        not null,
  situation   text        not null default '',
  task        text        not null default '',
  action      text        not null default '',
  result      text        not null default '',
  reflection  text        not null default '',
  tags        text[]      not null default '{}',
  difficulty  text        not null default 'medium',
  status      text        not null default 'draft',
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

do $$ begin
  if not exists (select 1 from pg_policies where tablename='story_bank_entries' and policyname='Users own their story entries') then
    alter table story_bank_entries enable row level security;
    create policy "Users own their story entries"
      on story_bank_entries for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create table if not exists interview_prep_packs (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users on delete cascade not null,
  job_id      uuid        references jobs on delete cascade not null,
  title       text        not null,
  content     jsonb       not null default '{}',
  status      text        not null default 'draft',
  provider    text,
  model       text,
  created_at  timestamptz default now() not null,
  updated_at  timestamptz default now() not null
);

do $$ begin
  if not exists (select 1 from pg_policies where tablename='interview_prep_packs' and policyname='Users own their interview prep packs') then
    alter table interview_prep_packs enable row level security;
    create policy "Users own their interview prep packs"
      on interview_prep_packs for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;


-- ── Migration 005: extended profile columns ──────────────────

alter table profiles
  add column if not exists target_archetypes        text[],
  add column if not exists preferred_company_types  text[],
  add column if not exists work_mode                text,
  add column if not exists current_comp             integer,
  add column if not exists seniority                text,
  add column if not exists languages                text[];


-- ── Migration 006: language + eval preference columns ────────

alter table profiles
  add column if not exists preferred_language   text default 'en',
  add column if not exists eval_score_apply     numeric(3,1) default 3.5,
  add column if not exists eval_score_watch     numeric(3,1) default 2.5,
  add column if not exists custom_eval_focus    text,
  add column if not exists custom_archetypes    text[];


-- ── Migration 007: auto_evaluate flag on scan_sources ────────

alter table scan_sources
  add column if not exists auto_evaluate boolean not null default false;


-- ── Migration 008: prompt_templates ──────────────────────────

create table if not exists prompt_templates (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  description text,
  workflow    text        not null default 'evaluate',
  template    text        not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

do $$ begin
  if not exists (select 1 from pg_policies where tablename='prompt_templates' and policyname='Users own their prompt templates') then
    alter table prompt_templates enable row level security;
    create policy "Users own their prompt templates"
      on prompt_templates for all
      using (auth.uid() = user_id) with check (auth.uid() = user_id);
  end if;
end $$;

create index if not exists prompt_templates_user_id_idx on prompt_templates (user_id);


-- ── Migration 009: level_strategy on evaluations ─────────────

alter table evaluations
  add column if not exists level_strategy jsonb;


-- ── Migration 010: onboarding_completed flag on profiles ──────
-- Existing users have already seen (or skipped) onboarding,
-- so default their flag to true so they are never redirected.

alter table profiles
  add column if not exists onboarding_completed boolean not null default false;

-- Mark all existing users as already having completed onboarding
-- so the new redirect logic doesn't send them back to the wizard.
update profiles set onboarding_completed = true where onboarding_completed = false;


-- ── Verify ───────────────────────────────────────────────────
-- Run these separately to confirm everything is in place:
--
-- select column_name from information_schema.columns
--   where table_name = 'profiles' order by ordinal_position;
--
-- select column_name from information_schema.columns
--   where table_name = 'evaluations' order by ordinal_position;
--
-- select table_name from information_schema.tables
--   where table_schema = 'public' order by table_name;
--
-- select enumlabel from pg_enum
--   join pg_type on pg_enum.enumtypid = pg_type.oid
--   where pg_type.typname = 'task_type' order by enumsortorder;
--
-- select enumlabel from pg_enum
--   join pg_type on pg_enum.enumtypid = pg_type.oid
--   where pg_type.typname = 'provider_type';
