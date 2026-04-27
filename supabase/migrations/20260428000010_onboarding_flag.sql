-- Track whether a user has been shown the onboarding wizard.
-- Set to true the first time /dashboard/onboarding loads.
-- Never reset — even if the profile is later left incomplete.

alter table profiles
  add column if not exists onboarding_completed boolean not null default false;
