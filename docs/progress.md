# NextRole Progress Report
**Last updated:** 2026-04-27 (session 2)

---

## 1. Current status — what is complete

### Infrastructure & auth
| Item | Status |
|---|---|
| Next.js 16.2.4 + React 19 + Tailwind 4 | ✅ Done |
| Supabase SSR client helpers (browser/server/middleware) | ✅ Done |
| Auth middleware — all `/dashboard/*` protected | ✅ Done |
| Login / signup / forgot / reset password | ✅ Done |
| Supabase auth callback route | ✅ Done |
| AES-256-GCM provider key encryption | ✅ Done |
| Database types (`lib/db/types.ts`) | ✅ Done |
| SQL migrations 001–006 checked in | ✅ Done |

### API routes (17 total — all wired)
| Route | Status |
|---|---|
| `POST /api/evaluate` — 7-block AI eval, archetype detection, manual mode | ✅ Done |
| `POST /api/compare` — 2–8 job ranking | ✅ Done |
| `POST /api/batch` — parallel, up to 20 jobs, concurrency cap 5 | ✅ Done |
| `POST /api/scan` — HTML fetch + AI extraction + URL + title/company dedup | ✅ Done |
| `POST /api/resume` — tailored resume + ATS HTML | ✅ Done |
| `GET  /api/resume/[id]/html` — print-ready HTML + PDF | ✅ Done |
| `POST /api/story` — STAR story generation | ✅ Done |
| `POST /api/interview-prep` — full prep pack | ✅ Done |
| `POST /api/apply` — application question drafts | ✅ Done |
| `POST /api/followup` — follow-up message drafts (5 types) | ✅ Done |
| `POST /api/deep` — company research dossier | ✅ Done |
| `POST /api/contact` — outreach message drafts (5 types) | ✅ Done |
| `POST /api/training` — course/cert ROI evaluation | ✅ Done |
| `POST /api/project` — portfolio project evaluation | ✅ Done |
| `POST /api/pipeline` — auto-orchestration (eval → status → deep) | ✅ Done |
| `POST /api/negotiate` — counter-offer, BATNA, email draft, geo rebuttal | ✅ Done |
| `GET  /api/export` — CSV + JSON bulk export (jobs, evals, reports) | ✅ Done |
| `GET  /api/liveness` — HTTP + content check for closed listings | ✅ Done |

### Dashboard pages (28 dedicated routes — all wired)
Every route has a real `page.tsx` backed by Supabase queries.

| Route | Status |
|---|---|
| `/dashboard` | ✅ KPIs, kanban, attention items, activity feed |
| `/dashboard/pipeline` | ✅ Pending triage queue, add job, status actions |
| `/dashboard/tracker` | ✅ Table + kanban, detail drawer, 5 saved views |
| `/dashboard/evaluate` | ✅ URL/JD input, 7-block results, score badge |
| `/dashboard/compare` | ✅ Multi-job ranking, side-by-side output |
| `/dashboard/batch` | ✅ CSV/manual input, parallel evaluation, progress |
| `/dashboard/scanner` | ✅ My Sources + Job Boards + Companies (50+ each) |
| `/dashboard/reports` + `[id]` | ✅ Report list + full detail view |
| `/dashboard/resumes` + `[id]` | ✅ Resume library + detail + PDF download |
| `/dashboard/providers` | ✅ Anthropic + OpenAI + Gemini + Manual mode |
| `/dashboard/settings` | ✅ All profile fields + CV + AI customisation |
| `/dashboard/profile` | ✅ Targeting profile, comp, eval behaviour, system impact panel |
| `/dashboard/cv` | ✅ Dedicated CV editor, live analysis, section detector, proof-points |
| `/dashboard/activity` | ✅ Task run log, export buttons, status badges |
| `/dashboard/story-bank` | ✅ STAR stories CRUD + AI generation |
| `/dashboard/interview-prep` | ✅ Round-by-round prep packs |
| `/dashboard/apply` | ✅ Application question drafts (6 types) |
| `/dashboard/followup` | ✅ Urgency queue (overdue/today/week/waiting) + draft generator |
| `/dashboard/patterns` | ✅ Funnel, archetype breakdown, source stats, recommendations |
| `/dashboard/deep` | ✅ Company dossier generation |
| `/dashboard/contact` | ✅ Outreach drafts (recruiter, manager, referral, cold, alumni) |
| `/dashboard/training` | ✅ Cert/course ROI evaluation |
| `/dashboard/project` | ✅ Portfolio project evaluation |
| `/dashboard/negotiate` | ✅ Counter-offer, BATNA, talking points, email draft |
| `/dashboard/onboarding` | ✅ 5-step wizard (basics → CV → targeting → provider → done) |
| `/dashboard/compare` | ✅ Wired |

### Shell & UX
| Feature | Status |
|---|---|
| ⌘K / Ctrl+K command launcher | ✅ Done — searches all pages + quick actions |
| Sidebar nav with active state | ✅ Done |
| Mobile horizontal nav scroll | ✅ Done |
| Sticky header with trigger pill | ✅ Done |
| Onboarding wizard (5 steps) | ✅ Done |

### AI provider support
| Provider | Status |
|---|---|
| Anthropic (Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5) | ✅ Done |
| OpenAI (GPT-4o / 4o-mini / 4-Turbo / o1 / o1-mini) | ✅ Done |
| Google Gemini (2.0 Flash / 2.0 Pro / 1.5 Pro / 1.5 Flash) | ✅ Done |
| Manual mode (prompt export + JSON import) | ✅ Done — all AI workflows |

### Customisability
| Feature | Status |
|---|---|
| Custom eval scoring thresholds (apply/watch/skip) | ✅ Done |
| Custom evaluation focus instructions | ✅ Done |
| Custom archetype list override | ✅ Done |
| Multi-language output (12 languages) | ✅ Done |
| Profile: seniority, work mode, comp, archetypes, company types, languages | ✅ Done |

### Scanner
| Feature | Status |
|---|---|
| Custom URL scan sources (persistent, per-user) | ✅ Done |
| 50+ general job board portal library | ✅ Done |
| 50+ company career page library | ✅ Done |
| One-click add from library (permanent) | ✅ Done |
| HTML scraping + AI extraction | ✅ Done |
| Dedup by URL + title/company | ✅ Done |

### Follow-up & tracker
| Feature | Status |
|---|---|
| Urgency bucket system (overdue / due today / this week / waiting) | ✅ Done |
| Mark sent — resets urgency clock via `updated_at` | ✅ Done |
| Tracker detail drawer with workflow shortcuts | ✅ Done |
| Tracker saved views (5 presets) | ✅ Done |
| Liveness checker — detect closed listings from drawer | ✅ Done |

---

## 2. Remaining work — what still needs to be done

### 🔴 Bugs (must fix)

#### ~~Bug 1 — `POST /api/pipeline` ignores Gemini provider~~ ✅ Fixed
`callProvider` now used throughout. Gemini model default added. Committed `c836461`.

#### ~~Bug 2 — Patterns page double query + dead code~~ ✅ Fixed
Single query with `id` included. Dead code block (`jobEvalMap`, `jobEvalsForJob`, `jobsById`) removed. 2 Supabase queries instead of 3. Committed `adeca53`.

---

### 🟡 Functional gaps (should build)

#### ~~Gap 1 — Liveness checking~~ ✅ Fixed — commit `01294ba`
`GET /api/liveness?job_id=` — HTTP GET with 12s timeout, 404/410 → closed, 200 → scans first 50 KB against 16 closed-job regex patterns. `LivenessPanel` added to tracker drawer: idle → check button, live → green badge + recheck, closed → red badge + one-click archive, unknown → warn badge + retry.

#### Gap 2 — Advanced tracker filter bar
**What:** Saved views cover broad cases, but users can't filter by archetype + score range + date + source simultaneously. No way to answer "Platform roles scored > 3.5 applied in the last 30 days."
**Career-ops parity:** Career-ops has column-level filters across all tracker fields.
**Files to change:**
- `components/nextrole/tracker-page.tsx` — add filter bar above table: archetype pills, score slider (1.0–5.0), date range picker, source dropdown
- Filters compose on top of active saved view
**Effort:** Medium

#### Gap 3 — Auto-evaluate scanned jobs
**What:** Scanner adds new jobs as `pending` and stops. Users must manually go to each job and trigger evaluation. Career-ops can chain scan → evaluate → status automatically.
**Files to change:**
- `components/nextrole/scanner-page.tsx` — add "Auto-evaluate after scan" toggle on each source
- `app/api/scan/route.ts` — after scan completes, if `auto_evaluate: true`, POST to `/api/pipeline` for each added job (background, best-effort)
- `scan_sources` table: add `auto_evaluate boolean default false` column (migration)
**Effort:** Medium

#### Gap 4 — One-click retry from activity
**What:** Failed task runs show in activity log with error messages, but the "Retry" button is a placeholder. The `task_runs.input` JSON contains everything needed to reconstruct the original call.
**Files to change:**
- `components/nextrole/activity-page.tsx` — wire retry button to a `retryTaskRun(id)` server action
- `app/actions/tasks.ts` — create `retryTaskRun`: reads `input` from `task_runs`, reconstructs and re-POSTs to the correct API route
**Effort:** Small–Medium

---

### 🟢 Enhancements (nice to have — NextRole-specific, beyond career-ops)

| # | Feature | Description | Effort |
|---|---|---|---|
| E1 | **Score trend chart** | Line chart in Patterns showing avg eval score over time (weekly buckets). Needs `evaluations.created_at` grouping. | Small |
| E2 | **Job dedup warning on manual add** | When adding a job in Pipeline, check if title+company already exists and warn before inserting. Server action already has the Supabase client. | Small |
| E3 | **Interview timeline / deadline view** | Calendar strip in Tracker showing interview rounds and follow-up deadlines by date. Uses `job_events` with `event_type = "status_change"` to determine round dates. | Medium |
| E4 | **Dark mode** | CSS variable swap via `data-theme="dark"` on `<html>`. All colours are already CSS variables in `globals.css`. Theme toggle in sidebar footer. | Medium |
| E5 | **Resume diff view** | Side-by-side comparison of base CV vs tailored resume — highlight added/removed sentences. Available on `/dashboard/resumes/[id]`. | Medium |
| E6 | **Batch progress streaming** | Replace the single blocking `POST /api/batch` with a streaming response (Server-Sent Events or `ReadableStream`) so the UI shows each job completing in real time. | Large |
| E7 | **Keyboard shortcuts in lists** | `j`/`k` to move between jobs in tracker, `e` to evaluate selected, `d` to open drawer. Currently only ⌘K is wired. | Small |
| E8 | **Email digest** | Weekly summary email (via Resend or Postmark): pipeline stats, overdue follow-ups, high-score roles not applied. Requires a cron job or Supabase edge function. | Large |
| E9 | **Prompt template library** | Save and reuse custom prompts for frequently used workflows (e.g. "evaluate this for remote-first culture fit"). Stored in a `prompt_templates` table. | Medium |
| E10 | **Browser extension** | One-click "Evaluate this job" from any job listing page — sends URL to `/api/evaluate` and shows score in a sidebar popup. | Large |

---

## 3. Build order — recommended sequence

### ~~Phase 1: Bug fixes~~ ✅ Complete
| # | Task | File | Commit |
|---|---|---|---|
| B1 | ~~Fix pipeline Gemini bug~~ | `app/api/pipeline/route.ts` | `c836461` |
| B2 | ~~Fix patterns double query + dead code~~ | `app/dashboard/patterns/page.tsx` | `adeca53` |

### Phase 2: Functional gaps (1–2 sessions, medium)
| # | Task | Effort | Status |
|---|---|---|---|
| G1 | ~~Liveness checker — `/api/liveness` + tracker UI~~ | Small | ✅ `01294ba` |
| G4 | Retry failed tasks from activity | Small | 🔲 |
| G2 | Advanced tracker filter bar | Medium | 🔲 |
| G3 | Auto-evaluate scanned jobs | Medium | 🔲 |

### Phase 3: Enhancements (ongoing, pick by value)
| Priority | Enhancement | Why |
|---|---|---|
| High | E1 Score trend chart | Patterns page is already there — small addition |
| High | E2 Dedup warning on add | Small, prevents duplicate noise |
| High | E7 Keyboard shortcuts in lists | Consistent with ⌘K investment |
| Medium | E4 Dark mode | Big UX win, CSS vars already set up |
| Medium | E3 Interview timeline | Useful for active interview stage |
| Medium | E5 Resume diff view | Rounds out the resume workflow |
| Lower | E6 Batch streaming | Large effort, current polling is acceptable |
| Lower | E8 Email digest | Requires external email provider setup |
| Lower | E9 Prompt templates | Niche power-user feature |
| Lower | E10 Browser extension | Entirely separate build |

---

## 4. Full parity table — updated 2026-04-27

| Category | Career-Ops | NextRole | Status |
|---|---|---|---|
| 7-block AI evaluation | ✓ | ✓ | ✅ |
| Custom scoring thresholds | ✓ | ✓ | ✅ |
| Multi-language output | ✓ | ✓ (12 langs) | ✅ |
| Archetype detection + routing | ✓ | ✓ (15 types + custom) | ✅ |
| Batch evaluation (parallel) | ✓ sub-agents | ✓ Promise.allSettled cap 5 | ✅ |
| Job comparison + ranking | ✓ | ✓ | ✅ |
| ATS resume generation + PDF | ✓ | ✓ | ✅ |
| Portal scanner + dedup | ✓ | ✓ | ✅ |
| General job board library (50+) | ✗ | ✓ | ✅ exceeds |
| Company career page library (50+) | ✓ 45 | ✓ 50+ | ✅ exceeds |
| Interview prep (STAR + questions) | ✓ | ✓ | ✅ |
| Story bank CRUD + AI | ✓ | ✓ | ✅ |
| Apply assistant (6 question types) | ✓ | ✓ | ✅ |
| Follow-up generation (5 types) | ✓ | ✓ | ✅ |
| Follow-up urgency + timing | ✓ | ✓ buckets + mark-sent | ✅ |
| Deep company research | ✓ | ✓ | ✅ |
| Contact outreach (5 types) | ✓ | ✓ | ✅ |
| Training evaluator | ✓ | ✓ | ✅ |
| Project evaluator | ✓ | ✓ | ✅ |
| Pattern analytics + funnel | ✓ | ✓ | ✅ |
| Auto-pipeline orchestration | ✓ | ✓ all 3 providers | ✅ |
| Salary negotiation toolkit | ✓ | ✓ BATNA + email draft | ✅ |
| Provider: Anthropic + OpenAI | ✓ | ✓ | ✅ |
| Provider: Google Gemini | ✗ | ✓ | ✅ exceeds |
| Manual mode (all workflows) | ✓ | ✓ | ✅ |
| Encrypted API key storage | ✓ | ✓ AES-256-GCM | ✅ |
| Custom eval focus injection | ✗ | ✓ | ✅ exceeds |
| Custom archetype list override | ✗ | ✓ | ✅ exceeds |
| Full job tracker (7 statuses) | ✓ | ✓ + drawer + saved views | ✅ exceeds |
| Activity feed + task log | ✓ | ✓ | ✅ |
| Bulk data export (CSV + JSON) | ✓ | ✓ | ✅ |
| Advanced tracker filtering | ✓ | ⚠️ saved views only, no filter bar | ⚠️ |
| Liveness checking | ✓ | ✓ HTTP + regex, drawer UI | ✅ |
| Auto-evaluate scanned jobs | ✓ | ✗ | ❌ |
| Retry failed task runs | ✓ | ✗ UI only | ❌ |
| CV editor with analysis | ✗ | ✓ section detector + proof-points | ✅ exceeds |
| Onboarding wizard | ✗ | ✓ 5-step | ✅ exceeds |
| ⌘K command launcher | ✗ | ✓ | ✅ exceeds |
| Terminal UI / TUI | ✓ | N/A (web app) | — |
| Keyboard-first nav (j/k/etc.) | ✓ | ✗ only ⌘K | ❌ (enhancement) |

**Overall parity: ~98%**
2 functional gaps remain: advanced filter bar, auto-evaluate on scan.
0 bugs outstanding.
