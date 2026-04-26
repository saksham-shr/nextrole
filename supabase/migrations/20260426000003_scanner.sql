-- ============================================================
-- Scanner tables: sources, runs, and discoveries
-- ============================================================

-- scan_sources
-- Each row is a career portal or company page the user wants to scan.
create table scan_sources (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references auth.users on delete cascade not null,
  name             text        not null,
  url              text        not null,
  type             text        not null default 'custom',
                   -- 'greenhouse' | 'ashby' | 'lever' | 'custom'
  is_active        boolean     default true not null,
  last_scanned_at  timestamptz,
  total_discovered integer     default 0 not null,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

create index scan_sources_user_idx on scan_sources (user_id, created_at desc);

alter table scan_sources enable row level security;

create policy "scan_sources_select_own" on scan_sources
  for select using (auth.uid() = user_id);

create policy "scan_sources_insert_own" on scan_sources
  for insert with check (auth.uid() = user_id);

create policy "scan_sources_update_own" on scan_sources
  for update using (auth.uid() = user_id);

create policy "scan_sources_delete_own" on scan_sources
  for delete using (auth.uid() = user_id);

-- scan_runs
-- Each row records one invocation of a source scan.
create table scan_runs (
  id               uuid        default gen_random_uuid() primary key,
  user_id          uuid        references auth.users on delete cascade not null,
  source_id        uuid        references scan_sources on delete cascade not null,
  status           text        not null default 'running',
                   -- 'running' | 'completed' | 'failed'
  discovered_count integer     default 0 not null,
  added_count      integer     default 0 not null,
  duplicate_count  integer     default 0 not null,
  error            text,
  created_at       timestamptz default now() not null,
  updated_at       timestamptz default now() not null
);

create index scan_runs_source_idx on scan_runs (source_id, created_at desc);
create index scan_runs_user_idx   on scan_runs (user_id, created_at desc);

alter table scan_runs enable row level security;

create policy "scan_runs_select_own" on scan_runs
  for select using (auth.uid() = user_id);

create policy "scan_runs_insert_own" on scan_runs
  for insert with check (auth.uid() = user_id);

create policy "scan_runs_update_own" on scan_runs
  for update using (auth.uid() = user_id);

-- scan_discoveries
-- Each row is one job listing found during a scan run.
create table scan_discoveries (
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
                       -- 'new' | 'added' | 'duplicate' | 'skipped'
  created_at           timestamptz default now() not null
);

create index scan_discoveries_run_idx    on scan_discoveries (scan_run_id, created_at desc);
create index scan_discoveries_user_idx   on scan_discoveries (user_id, created_at desc);

alter table scan_discoveries enable row level security;

create policy "scan_discoveries_select_own" on scan_discoveries
  for select using (auth.uid() = user_id);

create policy "scan_discoveries_insert_own" on scan_discoveries
  for insert with check (auth.uid() = user_id);

create policy "scan_discoveries_update_own" on scan_discoveries
  for update using (auth.uid() = user_id);
