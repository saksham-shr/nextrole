-- ============================================================
-- Migration: CTC breakdown + expected salary range + Indian notes
-- Supports the side-panel design's richer Indian-specific fields:
--   - Expected CTC as a range (₹38–44 LPA) rather than single number
--   - Current CTC split into fixed + variable
--   - Free-text annotations on CTC and notice period
-- All fields are LPA (lakhs per annum) numeric. All optional.
-- ============================================================

-- ── Expected CTC range (replaces single expected_salary in UI) ──
-- We keep expected_salary as a legacy single-value field for
-- backward compatibility with existing users. New UI writes both
-- min and max; readers fall back to expected_salary when min/max
-- are null.
alter table profiles add column if not exists expected_salary_min numeric;
alter table profiles add column if not exists expected_salary_max numeric;

-- ── Current CTC breakdown ───────────────────────────────────────
-- Indian comp is commonly quoted as fixed + variable (target).
-- ctc_fixed   = guaranteed annual cash (in LPA)
-- ctc_variable= target variable (bonus, ESOPs vested estimate, etc.)
-- These live alongside comp_min / comp_max (which represent the
-- user's overall expectation range from existing onboarding).
alter table profiles add column if not exists ctc_fixed    numeric;
alter table profiles add column if not exists ctc_variable numeric;

-- ── Free-text annotations (shown in autofill UI) ────────────────
-- Examples:
--   ctc_note         = "ESOPs vested at 2yr cliff", "JPMC offer letter"
--   notice_period_note = "negotiable to 30 days with buyout"
alter table profiles add column if not exists ctc_note           text;
alter table profiles add column if not exists notice_period_note text;

-- ── Range integrity ─────────────────────────────────────────────
-- Ensure max ≥ min when both are present (NULLs allowed).
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_expected_salary_range_chk'
  ) then
    alter table profiles
      add constraint profiles_expected_salary_range_chk
      check (
        expected_salary_min is null
        or expected_salary_max is null
        or expected_salary_max >= expected_salary_min
      );
  end if;
end $$;

-- ── Non-negative checks (LPA values can't be negative) ──────────
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_expected_salary_min_nonneg_chk'
  ) then
    alter table profiles
      add constraint profiles_expected_salary_min_nonneg_chk
      check (expected_salary_min is null or expected_salary_min >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_expected_salary_max_nonneg_chk'
  ) then
    alter table profiles
      add constraint profiles_expected_salary_max_nonneg_chk
      check (expected_salary_max is null or expected_salary_max >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_ctc_fixed_nonneg_chk'
  ) then
    alter table profiles
      add constraint profiles_ctc_fixed_nonneg_chk
      check (ctc_fixed is null or ctc_fixed >= 0);
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'profiles_ctc_variable_nonneg_chk'
  ) then
    alter table profiles
      add constraint profiles_ctc_variable_nonneg_chk
      check (ctc_variable is null or ctc_variable >= 0);
  end if;
end $$;
