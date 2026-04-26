# NextRole Progress Report
**Date:** 2026-04-26 (updated 2026-04-26)

This report reflects the **actual repository state** in `C:\Projects\nextrole` as of today. It separates what is implemented in code from what still exists only as UI shell or backend plan.

---

## 1. Complete and working now

### Infrastructure and auth

| Item | Status | Notes |
|---|---|---|
| Next.js 16.2.4 + React 19 + Tailwind 4 scaffold | Done | App builds and lints cleanly |
| Supabase SSR client helpers | Done | Browser, server, and proxy helpers exist |
| Auth proxy protection for `/dashboard/*` | Done | Redirects unauthenticated users to `/login` |
| Login / signup / forgot password / reset password | Done | Server actions wired |
| Supabase auth callback route | Done | Exchanges code for session |
| Sign out server action | Done | Present in `app/actions/auth.ts` |
| AES-256-GCM provider key encryption | Done | Implemented in `lib/crypto.ts` |
| Supabase database types | Done | `lib/db/types.ts` mirrors migrations |
| SQL migrations checked into repo | Done | Two migration files exist under `supabase/migrations` |

### Backend features that are actually wired

| Item | Status | Notes |
|---|---|---|
| Create pipeline job | Done | `createJob` server action |
| Update tracker job status | Done | `updateJobStatus` server action |
| Delete job | Done | `deleteJob` server action |
| Save/remove provider credentials | Done | `saveProviderKey` and `removeProvider` |
| Update profile and base CV | Done | `updateProfile` server action |
| Evaluate a job via API mode | Done | `POST /api/evaluate` supports Anthropic and OpenAI |
| Evaluate a job via manual mode | Done | `POST /api/evaluate` supports pasted model output |
| Persist evaluations to database | Done | Writes to `evaluations` and `task_runs` |
| Persist reports on evaluation | Done | `reports` row written after every evaluation (API + manual) |
| Compare evaluations | Done | `POST /api/compare` ranks 2–8 evaluated jobs, stores report |
| Batch evaluation | Done | `POST /api/batch` processes up to 20 jobs sequentially, persists all evaluations + reports |
| Scanner | Done | `POST /api/scan` — fetches career page HTML, AI extracts listings, deduped into pipeline |
| Generate tailored resume | Done | `POST /api/resume` — AI parses CV + JD + eval intelligence, outputs structured JSON + HTML |
| Serve resume HTML for print | Done | `GET /api/resume/[id]/html` — print-ready HTML, auto-triggers browser print-to-PDF |
| Provider usage tracking | Done | Updates `last_used_at` on successful API runs |

### Dashboard pages with real backend data

| Route | Status | Notes |
|---|---|---|
| `/dashboard` | Wired | Reads profile, providers, jobs, and task runs |
| `/dashboard/pipeline` | Wired | Uses real jobs data and add-job action |
| `/dashboard/tracker` | Wired | Uses real jobs data and status updates |
| `/dashboard/evaluate` | Wired | Loads job context and calls real evaluate API |
| `/dashboard/providers` | Wired | Uses real provider actions |
| `/dashboard/settings` | Wired | Uses real profile/base CV action |
| `/dashboard/activity` | Wired | Reads real `task_runs` with linked job info |
| `/dashboard/reports` | Wired | Lists real `reports` rows from DB |
| `/dashboard/reports/[id]` | Wired | Full report detail with all evaluation blocks |
| `/dashboard/compare` | Wired | Select 2–8 evaluated jobs, AI ranks + picks winner |
| `/dashboard/batch` | Wired | Select up to 20 jobs, sequential full evaluation pass |
| `/dashboard/resumes` | Wired | Generate + list tailored resumes per job |
| `/dashboard/resumes/[id]` | Wired | Full resume preview with Print / Save PDF button |
| `/dashboard/scanner` | Wired | Add/remove sources, scan now, discoveries inline with dedup |
| `/dashboard/story-bank` | Wired | STAR story CRUD + AI generation from job eval |
| `/dashboard/interview-prep` | Wired | Generate + list tailored interview prep packs per job |

### Frontend-only product coverage

The UI route structure for the broader product exists, including:

- compare
- batch
- scanner
- reports
- resumes
- cv
- profile
- interview-prep
- story-bank
- apply
- followup
- patterns
- deep
- contact
- training
- project
- activity

These routes are implemented as frontend shells in the shared catch-all dashboard page, but they are **not yet backed by real DB queries, actions, or APIs**.

---

## 2. Parity comparison — Career Ops vs NextRole

Full comparison run on 2026-04-26. Career Ops README confirmed: 6-block evaluation, A-F scoring, 10 weighted dimensions, 6 archetypes, 45+ pre-configured portals.

### Feature-by-feature status

| Feature | Career Ops | NextRole | Status |
|---|---|---|---|
| Single job evaluation (API + manual) | ✓ | ✓ | Done |
| Batch evaluation | Parallel sub-agents | Sequential, up to 20 | Done (approach differs) |
| Comparison + ranking | ✓ | ✓ | Done |
| Report generation + persistence | ✓ | ✓ | Done |
| Tailored resume + ATS HTML | ✓ | ✓ | Done |
| PDF export | Playwright server-side | Browser print-to-PDF | Done (approach differs) |
| Pipeline tracker | ✓ | ✓ | Done |
| Activity feed (`task_runs`) | ✓ | ✓ | Done |
| Story bank CRUD + AI | ✓ | ✓ | Done |
| Interview prep generation | ✓ | ✓ | Done |
| Portal scanner | 45+ pre-configured portals | User-configured URLs | Partial — see below |
| Auto-pipeline (paste JD → full artifacts) | ✓ | Partial | Partial |
| Archetype detection and routing | 6 archetypes | DB column only | Missing |
| Evaluation scoring model | 6-block, A-F, weighted | 7-block, 1.0–5.0 numeric | Diverged — see below |
| Apply assistant | ✓ | Missing backend | Missing |
| Follow-up generation | ✓ | Missing backend | Missing |
| Deep company research | ✓ | Missing backend | Missing |
| Contact outreach | ✓ | Missing backend | Missing |
| Training evaluator | ✓ | Missing backend | Missing |
| Project evaluator | ✓ | Missing backend | Missing |
| Pattern analytics | ✓ | Missing backend | Missing |
| Tracker integrity / health checks | ✓ | Missing | Missing |
| Multi-language prompt packs | ✓ | Missing | Missing |
| Gemini provider | ✓ | Missing (Anthropic + OpenAI only) | Missing |

### Evaluation model divergence

Career Ops uses a **6-block A-F evaluation** with 10 weighted dimensions and archetype routing.

NextRole currently uses a **7-block numeric model** (1.0–5.0 scale):
- `role_fit`, `compensation_analysis`, `cv_match`, `personalization_guidance`, `interview_signals`, `legitimacy_check`, `decision`

Career Ops 6 blocks: role summary, CV match, level strategy, comp research, personalization, interview prep (STAR+R).

**Decision (2026-04-26): keep NextRole's current model.** The 7-block numeric shape is more structured and actionable for a web product. The A-F letter grade system is a CLI display preference, not a functional requirement. The blocks are semantically equivalent. This divergence is intentional.

### Scanner approach decision

Career Ops ships **45+ pre-configured portal URLs** with 19 job board search queries across AI Labs, Voice AI, Platforms, Enterprise, Contact Center, and European companies.

**NextRole planned approach:** rather than hardcoding URLs or forcing users to type them, the scanner page will offer a **curated portal library** (matching Career Ops coverage) that users can **enable or disable** per their preferences. Users can also add custom URLs. The scan execution, dedup, and discovery pipeline remain the same as already built.

This gives users the Career Ops 45+ portals out of the box while preserving flexibility. The portal list lives in a static config file; the DB stores only which portals each user has enabled.

### Profile parity gap

Career Ops evaluations use rich profile context to personalize every prompt: target archetypes, preferred company types, seniority level, work mode preferences, and current compensation baseline alongside the base CV. NextRole's `profiles` table currently stores: `full_name`, `target_roles`, `target_locations`, `comp_min`, `comp_max`, `years_experience`, `base_cv`.

**Missing profile fields for full parity:**
- `target_archetypes` — which of the 6 Career Ops archetypes the user is targeting (LLMOps, Agentic, PM, SA, FDE, Transformation)
- `preferred_company_types` — e.g. AI Labs, Enterprise, Startup
- `work_mode` — remote / hybrid / on-site preference
- `current_comp` — current total comp baseline for negotiation and comp analysis
- `seniority` — IC level or management track preference
- `languages` — for multi-language prompt packs

These fields need a migration, a settings UI update, and injection into the evaluate/resume/interview-prep prompts.

### Auto-pipeline status

Career Ops runs the full pipeline from a single JD paste: evaluate → report → tailored resume → PDF → tracker entry with artifact links.

NextRole currently requires separate API calls for each step. The infrastructure for each step exists; what's missing is the **orchestration layer** that chains them automatically after job intake.

### Activity and tasking

Task runs are persisted across all AI workflows. A dedicated `/dashboard/activity` page reads real `task_runs` data. No retry mechanism or queue-backed orchestration exists yet.

---

## 3. Not implemented yet

These are still missing if the goal is full Career Ops parity.

### High-priority missing features

| Feature | What is missing |
|---|---|
| Compare | ~~Real comparison API, persistence, and ranked output~~ **Done** |
| Batch | ~~Multi-job queueing and processing~~ **Done** |
| Activity page | ~~Real task history UI driven from `task_runs`~~ **Done** |
| Reports | ~~Persist generated report records and render them from DB~~ **Done** |
| Resumes | ~~Generate tailored resumes and list them from DB~~ **Done** |
| PDF generation | ~~HTML-to-PDF pipeline~~ **Done (browser print-to-PDF via `/api/resume/[id]/html`)** |

### Major Career Ops parity gaps

| Feature from Career Ops | Current status |
|---|---|
| Auto-pipeline | Partial — each step exists, orchestration missing |
| Archetype detection + routing | Missing — `archetype` column in DB only |
| Tracker integrity scripts / health checks | Missing |
| Portal scanner (curated library) | Built as custom-URL scanner — curated 45+ portal list not yet added |
| Interview prep generation | Done — `POST /api/interview-prep`, stores packs, logs task_run |
| Story bank CRUD | Done — manual entry + AI generation via `POST /api/story` |
| Apply assistant generation | Missing backend |
| Follow-up generation | Missing backend |
| Pattern analytics | Missing backend |
| Deep company research | Missing backend |
| Contact outreach | Missing backend |
| Training evaluator | Missing backend |
| Project evaluator | Missing backend |
| Multi-language prompt packs | Missing |
| Gemini provider | Missing |
| Profile fields for full eval context | Partial — missing archetype prefs, work_mode, current_comp, seniority |

### Scanner approach (updated plan)

Career Ops ships 45+ pre-configured company portals across AI Labs, Voice AI, Platforms, Enterprise, Contact Center, and European companies.

NextRole plan:
- Add a static `lib/scanner/portals.ts` config with the full 45+ portal list (name, url, type, category)
- Scanner page shows the curated list — user toggles portals on/off to add them to their `scan_sources`
- Custom URL entry remains available for unlisted companies
- Scan execution, dedup, and discovery pipeline stay exactly as built

### Profile parity gap

The following fields need to be added to the `profiles` table and settings page to match Career Ops evaluation context:
- `target_archetypes text[]` — LLMOps / Agentic / PM / SA / FDE / Transformation
- `preferred_company_types text[]` — AI Labs / Enterprise / Startup / etc.
- `work_mode text` — remote / hybrid / on-site
- `current_comp integer` — current total comp for comp analysis context
- `seniority text` — IC level or management track
- `languages text[]` — for multi-language prompt packs

---

## 4. Recommended next build order

### Immediate next steps
1. ~~Persist `reports` on evaluation completion~~ **Done**
2. ~~Build real `/dashboard/activity` from `task_runs`~~ **Done**
3. ~~Build real `/dashboard/reports` and `/dashboard/reports/[id]`~~ **Done**
4. ~~Build `compare` backend~~ **Done**
5. ~~Build `batch` backend with queued tasks~~ **Done**
6. ~~Build resume generation + PDF output~~ **Done**

### After that
6. ~~Scanner sources + scan runs~~ **Done**
7. ~~Story bank + interview prep~~ **Done**
8. Scanner curated portal library + profile fields migration
9. Apply + follow-up generation
10. Deep company research + contact outreach
11. Training + project evaluators
12. Pattern analytics
13. Auto-pipeline orchestration
14. Archetype detection + routing
15. Multi-language prompt packs

---

## 5. Complete remaining work checklist

This is the concrete list of work still needed before NextRole can honestly be called a full web implementation of Career Ops.

### Platform and data
- ~~Add `reports`, `resumes` tables~~ **Done**
- ~~Add `scan_sources`, `scan_runs`, `scan_discoveries` tables~~ **Done**
- ~~Add `story_bank_entries`, `interview_prep_packs` tables~~ **Done**
- Add remaining tables: `follow_ups`, `pattern_reports`
- Add profile fields migration: `target_archetypes`, `preferred_company_types`, `work_mode`, `current_comp`, `seniority`, `languages`
- Wire reads and writes for `follow_ups` and `pattern_reports`
- Add background task orchestration for long-running workflows

### Evaluation parity
- Decide and lock whether NextRole will match Career Ops exactly on:
  - 6-block / A-F evaluation
  - weighted dimension model
  - archetype routing behavior
- Update prompt contracts and stored evaluation schema to match that decision
- Add report persistence after each completed evaluation
- Add richer job normalization and extraction before evaluation
- Add proper legitimacy/freshness and posting-health logic

### Auto-pipeline parity
- After evaluate, automatically support:
  - report creation
  - tailored resume generation
  - PDF export
  - tracker linking of all generated artifacts
- Add clear end-to-end flow for:
  - paste URL
  - evaluate
  - generate resume
  - create tracker entry
  - create follow-up-ready application state

### Reports and resumes
- ~~Build real `/dashboard/reports` and `/dashboard/reports/[id]`~~ **Done**
- ~~Build real `/dashboard/resumes` and `/dashboard/resumes/[id]`~~ **Done**
- ~~Generate structured report content after each evaluation~~ **Done**
- ~~Generate tailored resume text from base CV + JD + evaluation~~ **Done**
- ~~Render HTML resume template~~ **Done**
- ~~PDF output via browser print-to-PDF~~ **Done**

### Scanner and pipeline intake
- ~~Persist scan sources~~ **Done**
- ~~Build source management UI against DB~~ **Done**
- ~~Implement scan execution with AI extraction~~ **Done**
- ~~Deduplicate discovered jobs against tracker~~ **Done**
- ~~Route discoveries into pipeline~~ **Done**
- Add curated 45+ portal library (`lib/scanner/portals.ts`) — user enables/disables from list
- Add stale / expired posting handling

### Batch and compare
- ~~Implement `/dashboard/batch` backend~~ **Done**
- ~~Track per-item success/failure/progress~~ **Done**
- ~~Implement `/dashboard/compare` backend~~ **Done**
- ~~Add multi-job ranking and recommendation output~~ **Done**
- ~~Persist compare runs~~ **Done**

### Tracker parity
- Add richer job notes and event history
- Add linked artifact visibility in tracker rows and detail views
- Add dedup / merge handling
- Add pipeline integrity checks
- Add liveness checks and normalization routines similar to Career Ops scripts

### Coaching workflows
- ~~Implement interview prep generation~~ **Done**
- ~~Implement story bank CRUD~~ **Done**
- Implement apply assistant generation
- Implement follow-up draft generation and timing logic
- Implement deep company research generation
- Implement contact outreach generation
- Implement training evaluation generation
- Implement project evaluation generation

### Analytics and pattern analysis
- ~~Implement `/dashboard/activity` as real `task_runs` history~~ **Done**
- Implement `/dashboard/patterns` from real aggregate job + evaluation data
- Add funnel metrics
- Add segment performance by archetype, source, geography, and company type
- Add actionable recommendations from stored user/job history

### Manual mode parity
- Add explicit prompt export UX for all AI-backed workflows, not just evaluate
- Add validation/import pipelines for:
  - compare
  - apply
  - follow-up
  - interview prep
  - deep research
  - training
  - project

### International and content parity
- Add multi-language prompt packs
- Add provider/model defaults by workflow
- Align terminology and scoring language with Career Ops where needed

### Codebase quality and maintainability
- Split large catch-all dashboard shell content into dedicated page components
- Remove duplicated page concepts where dedicated routes already exist
- Clean up encoding/mojibake issues in UI strings and docs
- Add tests for auth, actions, evaluate API, and core route protection

---

## 6. Bottom-line status

### What is genuinely complete
- Auth, profiles, provider credential storage
- Job pipeline creation and tracker status updates
- Single-job evaluation (API + manual mode) with report persistence
- Batch evaluation (up to 20 jobs)
- Comparison and ranking (2–8 jobs)
- Tailored resume generation + HTML + browser print-to-PDF
- Activity feed from real `task_runs`
- Reports list and detail pages
- Compare and batch dashboard pages
- Portal scanner (user-added URLs, AI extraction, dedup, discovery pipeline)
- Story bank (manual CRUD + AI generation from eval)
- Interview prep generation (per job, behavioral/technical/situational)
- 15 real dashboard routes backed by database reads/writes

### What is not yet complete
- Curated 45+ portal library for scanner (user enables from pre-configured list)
- Profile fields: `target_archetypes`, `preferred_company_types`, `work_mode`, `current_comp`, `seniority`
- Auto-pipeline orchestration (evaluate → resume → tracker in one action)
- Archetype detection and routing in evaluation
- Apply assistant
- Follow-up generation
- Deep company research
- Contact outreach
- Training evaluator
- Project evaluator
- Pattern analytics (`/dashboard/patterns`)
- Tracker integrity / health checks
- Multi-language prompt packs
- Gemini provider

### Evaluation model decision
NextRole intentionally uses a **7-block numeric model (1.0–5.0)** rather than Career Ops' 6-block A-F letter grades. The blocks are semantically equivalent; the scoring format is a web product choice. This is not a bug.

### Practical summary
The repo is a **feature-rich web implementation of Career Ops** covering all core evaluation, resume, compare, batch, scanner, story bank, and interview prep workflows. The remaining work is coaching workflows (apply/follow-up/deep/contact), analytics, portal library, profile enrichment, and auto-pipeline orchestration.

It is **not yet a full web implementation of Career Ops**.
