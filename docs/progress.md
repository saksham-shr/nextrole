# NextRole Progress Report
**Last updated:** 2026-04-26

---

## 1. Current status — what is complete

### Infrastructure & auth
| Item | Status |
|---|---|
| Next.js 16.2.4 + React 19 + Tailwind 4 | ✅ Done |
| Supabase SSR client helpers (browser/server/proxy) | ✅ Done |
| Auth proxy — all `/dashboard/*` protected | ✅ Done |
| Login / signup / forgot / reset password | ✅ Done |
| Supabase auth callback route | ✅ Done |
| AES-256-GCM provider key encryption | ✅ Done |
| Database types (`lib/db/types.ts`) | ✅ Done |
| SQL migrations 001–006 checked in | ✅ Done |

### API routes (15 total — all wired)
| Route | Status |
|---|---|
| `POST /api/evaluate` — 7-block AI eval, archetype detection, manual mode | ✅ Done |
| `POST /api/compare` — 2–8 job ranking | ✅ Done |
| `POST /api/batch` — up to 20 jobs sequential | ✅ Done |
| `POST /api/scan` — HTML fetch + AI extraction + dedup | ✅ Done |
| `POST /api/resume` — tailored resume + ATS HTML | ✅ Done |
| `GET  /api/resume/[id]/html` — print-ready HTML + PDF | ✅ Done |
| `POST /api/story` — STAR story generation | ✅ Done |
| `POST /api/interview-prep` — full prep pack | ✅ Done |
| `POST /api/apply` — application question drafts | ✅ Done |
| `POST /api/followup` — follow-up message drafts | ✅ Done |
| `POST /api/deep` — company research dossier | ✅ Done |
| `POST /api/contact` — outreach message drafts (5 types) | ✅ Done |
| `POST /api/training` — course/cert ROI evaluation | ✅ Done |
| `POST /api/project` — portfolio project evaluation | ✅ Done |
| `POST /api/pipeline` — auto-orchestration (eval → status → deep) | ✅ Done |

### Dashboard pages (23 wired routes)
All backed by real DB reads/writes. Every page has a dedicated `page.tsx` or wired catch-all.

| Route | Status |
|---|---|
| `/dashboard` | ✅ Wired |
| `/dashboard/pipeline` | ✅ Wired |
| `/dashboard/tracker` | ✅ Wired |
| `/dashboard/evaluate` | ✅ Wired |
| `/dashboard/compare` | ✅ Wired |
| `/dashboard/batch` | ✅ Wired |
| `/dashboard/scanner` | ✅ Wired + portal library tab |
| `/dashboard/reports` + `[id]` | ✅ Wired |
| `/dashboard/resumes` + `[id]` | ✅ Wired |
| `/dashboard/providers` | ✅ Wired (Anthropic + OpenAI + Gemini) |
| `/dashboard/settings` | ✅ Wired (all profile fields inc. migration 006) |
| `/dashboard/activity` | ✅ Wired |
| `/dashboard/story-bank` | ✅ Wired |
| `/dashboard/interview-prep` | ✅ Wired |
| `/dashboard/apply` | ✅ Wired |
| `/dashboard/followup` | ✅ Wired |
| `/dashboard/patterns` | ✅ Wired |
| `/dashboard/deep` | ✅ Wired |
| `/dashboard/contact` | ✅ Wired |
| `/dashboard/training` | ✅ Wired |
| `/dashboard/project` | ✅ Wired |
| `/dashboard/profile` | ❌ **404 — needs dedicated page** |
| `/dashboard/cv` | ⚠️ Catch-all shell only — no real DB page |

### AI provider support
| Provider | Status |
|---|---|
| Anthropic (Claude Opus 4.7 / Sonnet 4.6 / Haiku 4.5) | ✅ Done |
| OpenAI (GPT-4o / 4o-mini / 4-Turbo / o1 / o1-mini) | ✅ Done |
| Google Gemini (2.0 Flash / 2.0 Pro / 1.5 Pro / 1.5 Flash) | ✅ Done |
| Manual mode (prompt export + JSON import) | ✅ Done — all 10 AI workflows |

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
| One-click add from portal library (permanent) | ✅ Done |
| HTML scraping + AI extraction + dedup | ✅ Done |
| Company-specific career page library | ❌ Missing |

---

## 2. Remaining gaps vs career-ops

### Gap 1 — `/dashboard/profile` is 404
The nav links to `/dashboard/profile` but no dedicated `page.tsx` exists. The catch-all returns the old static shell from `dashboard-pages.tsx`. Needs a real wired profile page.

**Fix:** Create `app/dashboard/profile/page.tsx` that loads real profile data and redirects (or renders) with the full targeting profile UI — target roles, archetypes, company types, seniority, work mode, comp, languages. Can reuse and simplify the Settings page structure.

### Gap 2 — Company-specific career page library
Career-ops ships URLs for 45+ specific named companies (Anthropic, OpenAI, ElevenLabs, Cohere, Scale AI, Mistral, etc.). NextRole's 50-portal library covers job *boards* (LinkedIn, Greenhouse, Wellfound, etc.) — not individual company career pages.

**Fix:**
- Add `lib/scanner/companies.ts` — curated list of 50+ tech/AI company career page URLs
- Surface these in a second tab inside the Portal Library: "Companies" vs "Job Boards"
- Same one-click add → `scan_sources` flow

### Gap 3 — Salary negotiation toolkit
Career-ops has a dedicated negotiation module: counter-offer scripts, geographic discount rebuttals, competing-offer leverage framing, BATNA guidance. NextRole does compensation *analysis* inside evaluate but has no `/negotiate` workflow.

**Fix:**
- `lib/negotiate/prompt.ts`
- `app/api/negotiate/route.ts` — POST `{ job_id, offer_amount, competing_offer?, location?, mode }`
- `app/dashboard/negotiate/page.tsx` + `components/nextrole/negotiate-page.tsx`
- Add to nav under Coaching

### Gap 4 — Parallel batch processing
Career-ops uses sub-agents to evaluate jobs in parallel. NextRole's batch loops sequentially — for 20 jobs with a slow provider this can take 3–4 minutes.

**Fix:** Upgrade `app/api/batch/route.ts` to use `Promise.allSettled` for concurrent evaluation, with a concurrency cap of 5 to avoid rate limits.

### Gap 5 — Bulk data export
No CSV/JSON export for jobs, evaluations, or reports. Users can't get their data out.

**Fix:**
- `app/api/export/route.ts` — GET with `?format=csv|json&type=jobs|evaluations|reports`
- Export button on tracker and activity pages

### Gap 6 — Advanced tracker filtering
Tracker and pipeline pages show all jobs with basic status grouping. No column filtering, date ranges, score ranges, archetype filter, or saved views.

**Fix:** Add filter bar to tracker and pipeline pages (status, archetype, score range, date range, source).

---

## 3. Build order (next session)

| Priority | Item | Effort |
|---|---|---|
| 1 | Fix `/dashboard/profile` 404 — dedicated wired page | Small |
| 2 | Company career page library (`lib/scanner/companies.ts` + UI tab) | Medium |
| 3 | Parallel batch (Promise.allSettled, cap 5) | Small |
| 4 | Negotiation toolkit (prompt + API + page + component) | Medium |
| 5 | Bulk export (`/api/export`) | Small |
| 6 | Tracker/pipeline filter bar | Medium |

---

## 4. Parity summary

| Category | Career-Ops | NextRole | Status |
|---|---|---|---|
| 7-block AI evaluation | ✓ | ✓ | ✅ |
| Custom scoring thresholds | ✓ | ✓ | ✅ |
| Multi-language output | ✓ | ✓ (12 langs) | ✅ |
| Archetype detection + routing | ✓ | ✓ (15 types + custom) | ✅ |
| Batch evaluation | Parallel sub-agents | Sequential, up to 20 | ⚠️ Sequential only |
| Job comparison + ranking | ✓ | ✓ | ✅ |
| ATS resume generation + PDF | ✓ | ✓ | ✅ |
| Portal scanner + dedup | ✓ | ✓ | ✅ |
| General job board library (50+) | ✗ | ✓ | ✅ (exceeds) |
| Company career page library (45+) | ✓ | ✗ | ❌ |
| Interview prep (STAR + questions) | ✓ | ✓ | ✅ |
| Story bank CRUD + AI | ✓ | ✓ | ✅ |
| Apply assistant (6 question types) | ✓ | ✓ | ✅ |
| Follow-up generation (5 types) | ✓ | ✓ | ✅ |
| Deep company research | ✓ | ✓ | ✅ |
| Contact outreach (5 types) | ✓ | ✓ | ✅ |
| Training evaluator | ✓ | ✓ | ✅ |
| Project evaluator | ✓ | ✓ | ✅ |
| Pattern analytics | ✓ | ✓ | ✅ |
| Auto-pipeline orchestration | ✓ | ✓ | ✅ |
| Salary negotiation toolkit | ✓ | ✗ | ❌ |
| Provider support (Anthropic/OpenAI) | ✓ | ✓ | ✅ |
| Gemini provider | ✗ | ✓ | ✅ (exceeds) |
| Manual mode (all workflows) | ✓ | ✓ | ✅ |
| Encrypted API key storage | ✓ | ✓ | ✅ |
| Custom eval focus injection | ✗ | ✓ | ✅ (exceeds) |
| Custom archetype list | ✗ | ✓ | ✅ (exceeds) |
| Full job tracker (7 statuses) | ✓ | ✓ | ✅ |
| Activity feed | ✓ | ✓ | ✅ |
| Bulk data export | ✓ | ✗ | ❌ |
| Advanced tracker filtering | ✓ | ✗ | ❌ |
| Terminal UI / TUI | ✓ | N/A (web) | — |
| Keyboard-first navigation | ✓ | N/A (web) | — |

**Overall parity: ~88%**
4 actionable gaps remain: company career pages, negotiation toolkit, parallel batch, export + filtering.
