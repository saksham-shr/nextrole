-- ============================================================
-- Migration: Universal autofill profile fields
-- Adds direct contact / location / work-pref / EEO / structured-CV
-- columns to profiles so the extension can fill any job site
-- without regex-parsing the raw CV at request time.
-- ============================================================

-- ── Contact (direct, not regex-extracted from base_cv) ────────
alter table profiles add column if not exists phone          text;
alter table profiles add column if not exists linkedin_url   text;
alter table profiles add column if not exists github_url     text;
alter table profiles add column if not exists portfolio_url  text;

-- ── Location (explicit, not derived from target_locations[0]) ─
alter table profiles add column if not exists country        text default 'India';
alter table profiles add column if not exists city           text;
alter table profiles add column if not exists state_province text;
alter table profiles add column if not exists zip_postal     text;
alter table profiles add column if not exists street_address text;

-- ── Work preferences ─────────────────────────────────────────
-- notice_period values: 'immediately' | '2_weeks' | '1_month' | '2_months' | '3_months'
alter table profiles add column if not exists notice_period       text;
alter table profiles add column if not exists willing_to_relocate boolean default true;
alter table profiles add column if not exists sponsorship_needed  boolean default false;
alter table profiles add column if not exists nationality         text default 'Indian';

-- ── EEO / demographics (all optional) ────────────────────────
-- gender:           'male' | 'female' | 'non_binary' | 'prefer_not_to_say'
-- pronouns:         'he_him' | 'she_her' | 'they_them' | 'prefer_not_to_say'
-- race_ethnicity:   free text (matched against form options at fill time)
-- veteran_status:   'not_veteran' | 'protected_veteran' | 'prefer_not_to_say'
-- disability_status:'no' | 'yes' | 'prefer_not_to_say'
alter table profiles add column if not exists gender            text;
alter table profiles add column if not exists pronouns          text;
alter table profiles add column if not exists race_ethnicity    text;
alter table profiles add column if not exists veteran_status    text;
alter table profiles add column if not exists disability_status text;

-- ── Structured CV data ───────────────────────────────────────
-- work_experience: [{ role, company, start, end, current, location, description }]
-- education:       [{ degree, institution, field, start, end, grade }]
-- certifications:  [{ title, issuer, year, url }]
-- projects:        [{ title, description, tech, url }]
-- skills:          ["python", "aws", ...]
alter table profiles add column if not exists work_experience jsonb default '[]'::jsonb;
alter table profiles add column if not exists education       jsonb default '[]'::jsonb;
alter table profiles add column if not exists certifications  jsonb default '[]'::jsonb;
alter table profiles add column if not exists projects        jsonb default '[]'::jsonb;
alter table profiles add column if not exists skills          text[] default '{}';
