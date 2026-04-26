-- ============================================================
-- Migration 005: extended profile fields
-- Adds target_archetypes, preferred_company_types, work_mode,
-- current_comp, seniority, and languages to profiles.
-- Also extends task_type enum with new AI task types.
-- ============================================================

-- Extend task_type enum
alter type task_type add value if not exists 'contact_draft';
alter type task_type add value if not exists 'training_eval';
alter type task_type add value if not exists 'project_eval';

-- Add new profile columns (all nullable — no default migration pain)
alter table profiles
  add column if not exists target_archetypes   text[],
  add column if not exists preferred_company_types text[],
  add column if not exists work_mode           text,          -- 'remote' | 'hybrid' | 'onsite' | null
  add column if not exists current_comp        integer,       -- current annual comp in same currency as comp_min/max
  add column if not exists seniority           text,          -- 'junior' | 'mid' | 'senior' | 'staff' | 'principal' | null
  add column if not exists languages           text[];        -- programming / spoken languages

comment on column profiles.target_archetypes        is 'Preferred role archetypes, e.g. {product_eng,platform_eng}';
comment on column profiles.preferred_company_types  is 'Preferred company types, e.g. {startup,scaleup,enterprise}';
comment on column profiles.work_mode                is 'remote | hybrid | onsite — candidate preference';
comment on column profiles.current_comp             is 'Current total annual compensation (same unit as comp_min/max)';
comment on column profiles.seniority                is 'Self-declared seniority level';
comment on column profiles.languages                is 'Programming and/or spoken languages';
