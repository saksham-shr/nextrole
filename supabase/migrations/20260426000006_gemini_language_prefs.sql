-- ============================================================
-- Migration 006: Gemini provider + language + user preferences
-- ============================================================

-- Extend provider_type enum
alter type provider_type add value if not exists 'gemini';

-- Extend profiles with preferred_language and custom eval prefs
alter table profiles
  add column if not exists preferred_language    text default 'en',  -- ISO 639-1
  add column if not exists eval_score_apply      numeric(3,1) default 3.5, -- threshold for "apply" decision
  add column if not exists eval_score_watch      numeric(3,1) default 2.5, -- threshold for "watch" decision
  add column if not exists custom_eval_focus     text,                -- freeform extra instructions injected into evaluate system prompt
  add column if not exists custom_archetypes     text[];              -- overrides default archetype list

comment on column profiles.preferred_language  is 'ISO 639-1 code: en, es, fr, de, pt, zh, etc.';
comment on column profiles.eval_score_apply    is 'Minimum score to recommend "apply" (default 3.5)';
comment on column profiles.eval_score_watch    is 'Minimum score to recommend "watch" (default 2.5)';
comment on column profiles.custom_eval_focus   is 'Extra instructions appended to evaluate system prompt for personalisation';
comment on column profiles.custom_archetypes   is 'Custom archetype labels overriding the default six';
