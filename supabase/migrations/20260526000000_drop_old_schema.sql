-- ============================================================
-- DROP OLD SCHEMA — run this BEFORE the v2 migrations
-- Clears all tables, enums, functions, and triggers from the
-- previous schema so the v2 migrations apply on a clean slate.
--
-- Safe to run on the live project — all data will be wiped.
-- Back up first if you need it.
-- ============================================================


-- ── Trigger ──────────────────────────────────────────────────
-- Must drop before the function it calls
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;


-- ── Functions ────────────────────────────────────────────────
DROP FUNCTION IF EXISTS public.handle_new_user()                                                             CASCADE;
DROP FUNCTION IF EXISTS public.deduct_credit(uuid, integer)                                                  CASCADE;
DROP FUNCTION IF EXISTS public.add_credits(uuid, integer)                                                    CASCADE;
DROP FUNCTION IF EXISTS public.increment_daily_usage(text, uuid)                                             CASCADE;
DROP FUNCTION IF EXISTS public.reset_credits_for_tier(uuid, text)                                            CASCADE;
DROP FUNCTION IF EXISTS public.reset_credits_for_tier(uuid, user_tier)                                       CASCADE;
DROP FUNCTION IF EXISTS public.reset_daily_credits()                                                         CASCADE;
DROP FUNCTION IF EXISTS public.reset_paid_credits_batch()                                                    CASCADE;
DROP FUNCTION IF EXISTS public.apply_topup_payment(uuid, text, integer)                                      CASCADE;
DROP FUNCTION IF EXISTS public.apply_topup_payment(uuid, text, integer, integer, text, text)                 CASCADE;
DROP FUNCTION IF EXISTS public.apply_subscription_payment(uuid, text, text, text, integer)                   CASCADE;
DROP FUNCTION IF EXISTS public.apply_subscription_payment(uuid, text, text, text, integer, integer, text)    CASCADE;
DROP FUNCTION IF EXISTS public.decrement_credits(uuid, integer)                                              CASCADE;


-- ── Tables (leaf → root to avoid FK errors) ──────────────────
-- Old-schema-only tables
DROP TABLE IF EXISTS public.model_config        CASCADE;
DROP TABLE IF EXISTS public.webhook_events      CASCADE;
DROP TABLE IF EXISTS public.credit_topups       CASCADE;

-- Shared / overlap tables (different columns in old schema)
DROP TABLE IF EXISTS public.admin_audit_log     CASCADE;
DROP TABLE IF EXISTS public.application_sessions CASCADE;
DROP TABLE IF EXISTS public.extension_tokens    CASCADE;
DROP TABLE IF EXISTS public.usage_log           CASCADE;
DROP TABLE IF EXISTS public.resumes             CASCADE;
DROP TABLE IF EXISTS public.evaluations         CASCADE;
DROP TABLE IF EXISTS public.jobs                CASCADE;
DROP TABLE IF EXISTS public.commerce_config     CASCADE;

-- New-schema tables (in case a partial earlier run left them)
DROP TABLE IF EXISTS public.payment_records     CASCADE;
DROP TABLE IF EXISTS public.daily_usage         CASCADE;
DROP TABLE IF EXISTS public.extension_feedback  CASCADE;
DROP TABLE IF EXISTS public.prompt_templates    CASCADE;
DROP TABLE IF EXISTS public.reports             CASCADE;
DROP TABLE IF EXISTS public.job_events          CASCADE;
DROP TABLE IF EXISTS public.provider_credentials CASCADE;
DROP TABLE IF EXISTS public.invites             CASCADE;

-- profiles last (everything references it via user_id → auth.users, but
-- CASCADE on the drops above handles that)
DROP TABLE IF EXISTS public.profiles            CASCADE;


-- ── Enums ────────────────────────────────────────────────────
-- Old schema had activity_type and task_type; v2 does not use them.
-- job_status, provider_type, user_tier are recreated by v2 migration.
DROP TYPE IF EXISTS public.activity_type  CASCADE;
DROP TYPE IF EXISTS public.task_type      CASCADE;
DROP TYPE IF EXISTS public.job_status     CASCADE;
DROP TYPE IF EXISTS public.provider_type  CASCADE;
DROP TYPE IF EXISTS public.user_tier      CASCADE;
