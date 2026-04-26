-- ============================================================
-- Story bank + interview prep tables
-- ============================================================

-- story_bank_entries ------------------------------------------
create table story_bank_entries (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users on delete cascade not null,
  job_id          uuid        references jobs on delete set null,
  title           text        not null,
  situation       text        not null default '',
  task            text        not null default '',
  action          text        not null default '',
  result          text        not null default '',
  reflection      text        not null default '',
  tags            text[]      not null default '{}',
  difficulty      text        not null default 'medium',  -- easy | medium | hard
  status          text        not null default 'draft',   -- draft | ready
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

alter table story_bank_entries enable row level security;

create policy "Users own their story entries"
  on story_bank_entries for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- interview_prep_packs ----------------------------------------
create table interview_prep_packs (
  id              uuid        default gen_random_uuid() primary key,
  user_id         uuid        references auth.users on delete cascade not null,
  job_id          uuid        references jobs on delete cascade not null,
  title           text        not null,
  content         jsonb       not null default '{}',
  status          text        not null default 'draft',   -- draft | ready
  provider        text,
  model           text,
  created_at      timestamptz default now() not null,
  updated_at      timestamptz default now() not null
);

alter table interview_prep_packs enable row level security;

create policy "Users own their interview prep packs"
  on interview_prep_packs for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
