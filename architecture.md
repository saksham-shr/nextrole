# NextRole — Architecture

## Overview

NextRole is a job search operating system built as two tightly coupled products:

1. **Web App** — A Next.js 16 full-stack application for job tracking, AI evaluation, resume generation, and billing.
2. **Browser Extension** — A Chrome MV3 extension that detects job postings on any site, shows inline AI evaluation cards, and autofills application forms.

Both products share the same Supabase PostgreSQL backend and AI routing layer. The extension authenticates to the web app's API using short-lived tokens rather than the user's session cookie.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         User's Browser                          │
│                                                                 │
│  ┌────────────────────────┐    ┌───────────────────────────┐   │
│  │   Chrome Extension     │    │   Next.js Web App         │   │
│  │  (MV3 Content Scripts) │    │   (App Router / SSR)      │   │
│  │                        │    │                           │   │
│  │  content.js            │    │  /dashboard               │   │
│  │  apply-card.js         │    │  /evaluate                │   │
│  │  auto-fill.js          │    │  /resumes                 │   │
│  │  service-worker.js     │    │  /pipeline                │   │
│  └──────────┬─────────────┘    └──────────┬────────────────┘   │
│             │ Token-auth API               │ Session cookie      │
└─────────────┼───────────────────────────┬─┼────────────────────┘
              │                           │ │
              ▼                           ▼ ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Next.js API Routes                           │
│                                                                 │
│   /api/extension/*   /api/evaluate   /api/resume               │
│   /api/pipeline      /api/profile    /api/webhooks/*            │
│   /api/cron/*        /api/billing/*                            │
└──────────────┬───────────────────────┬─────────────────────────┘
               │                       │
       ┌───────▼──────┐        ┌───────▼──────────────┐
       │   Supabase   │        │   AI Providers        │
       │  PostgreSQL  │        │                       │
       │  + Auth      │        │  OpenRouter (primary) │
       │  + Storage   │        │  → Gemini 2.0 Flash   │
       │  + RLS       │        │  Anthropic (fallback) │
       └──────────────┘        │  OpenAI (fallback)    │
                               └──────────────────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, React 19) |
| Language | TypeScript 5 (strict mode) |
| Styling | Tailwind CSS 4 |
| Database | Supabase (PostgreSQL + Row-Level Security) |
| Auth | Supabase Auth (email/password, OTP) |
| File Storage | Supabase Storage (profile-files bucket) |
| AI Routing | OpenRouter → Gemini 2.0 Flash (primary); Anthropic / OpenAI (fallback) |
| AI SDK | @anthropic-ai/sdk, OpenRouter HTTP, Gemini HTTP |
| Payments | Lemon Squeezy (subscriptions + top-ups) |
| Email | Resend |
| PDF Generation | @react-pdf/renderer |
| Document Parsing | pdf-parse (PDF), mammoth (DOCX) |
| Extension | Chrome MV3 (vanilla JS content scripts + service worker) |

---

## Repository Layout

```
nextrole/
├── app/                    # Next.js App Router pages + API routes + server actions
│   ├── (public pages)      # landing, pricing, privacy, terms, early-access
│   ├── auth/               # /login, /signup, /verify-code, /forgot-password
│   ├── onboarding/         # profile setup + tier activation
│   ├── connect-extension/  # extension pairing page
│   ├── dashboard/          # protected shell + all dashboard subpages
│   ├── api/                # all API route handlers
│   └── actions/            # server actions (auth, jobs, profile, admin)
│
├── components/nextrole/    # all React UI components (co-located by feature)
│
├── lib/                    # shared utilities + business logic
│   ├── ai/                 # router, gates, guard, providers
│   ├── resume/             # prompt, template, pdf, docx
│   ├── evaluate/           # evaluation prompt
│   ├── supabase/           # server/client/admin clients, config
│   ├── security/           # CSRF, rate limiting, encryption
│   └── db/types.ts         # TypeScript types for all DB tables
│
├── extension/              # Chrome MV3 extension (separate app)
│   ├── manifest.json
│   ├── background/         # service-worker.js
│   ├── content/            # content.js, apply-card.js, auto-fill.js, resume-upload.js
│   ├── popup/              # popup.html + popup.js
│   ├── options/            # options.html + options.js
│   ├── registry/           # ats.js (ATS family detection)
│   └── config.js           # site-to-selector mapping
│
├── supabase/
│   └── migrations/         # 25+ incremental SQL migrations
│
├── scripts/                # Python/Node helpers (DOCX rendering, etc.)
└── tools/                  # ATS registry validation
```

---

## Web App

### Routing & Pages

The app uses the Next.js App Router. All routes under `/dashboard` are protected by an auth guard in `dashboard/layout.tsx` that validates the Supabase session server-side. Unauthenticated requests are redirected to `/login`.

```
/                          Landing page
/pricing                   Pricing tiers
/signup, /login            Auth flows
/verify-code               OTP confirmation
/forgot-password           Password reset
/onboarding                Profile setup wizard
/onboarding/activated      Post-payment tier confirmation
/connect-extension         Extension pairing
/dashboard                 Main app shell
  /pipeline                Job tracker
  /evaluate                Job evaluation tool
  /resumes                 Resume library
  /resumes/[id]            Resume detail / editor
  /profile                 User profile & autofill fields
  /settings                Account settings + extension tokens
  /billing                 Subscription + credits + top-up
  /admin                   Admin-only (invite management, user ops)
```

### API Routes

All routes live under `app/api/`. Server-side routes use the Supabase service role key; user-facing routes validate the session cookie or extension token before executing.

**Core evaluation & resume**
- `POST /api/evaluate` — score a job (role fit, comp, CV match, interview signals)
- `POST /api/resume` — generate a tailored resume via AI
- `GET  /api/resume/[id]/html` — render resume as HTML

**Job pipeline**
- `POST /api/pipeline` — bulk job import (CSV)

**Profile & files**
- `GET/POST /api/profile` — read/write autofill profile
- `POST /api/profile/files` — upload resume or cover letter
- `GET/DELETE /api/profile/files/[id]` — fetch or remove file

**Billing**
- `POST /api/topup` — create Lemon Squeezy checkout for credit top-up
- `GET  /api/billing/portal` — redirect to LS customer portal
- `POST /api/webhooks/lemonsqueezy` — handle subscription events

**Extension API** (token-authenticated, not session-authenticated)
- `POST /api/extension/token` — generate extension auth token
- `GET  /api/extension/token` — validate / refresh token
- `POST /api/extension/evaluate` — evaluate job from extension
- `POST /api/extension/job` — create job in pipeline from extension
- `GET  /api/extension/profile` — fetch autofill fields
- `POST /api/extension/cv-structure` — parse CV into structured fields
- `POST /api/extension/resume` — generate tailored resume from extension
- `POST /api/extension/application-session` — log application attempt
- `POST /api/extension/feedback` — user correction (not a job / confirmed)
- `POST /api/extension/tailor` — tailor a single profile field for a form field

**Infrastructure**
- `GET  /api/cron/reset-credits` — nightly credit reset (CRON_SECRET guarded)
- `GET  /api/liveness` — health check

### Server Actions

Server actions (marked `"use server"`) are co-located in `app/actions/` and called directly from React Server Components or client components via fetch-less RPC:

- `auth.ts` — `signOut()`
- `jobs.ts` — `createJob()`, `updateJobStatus()`, `deleteJob()`, `markFollowupSent()`
- `profile.ts` — `saveProfileStep()`, `setDefaultFile()`, `deleteProfileFile()`
- `tasks.ts` — `retryTaskRun()`
- `admin.ts` — `deleteUserData()`, `inviteEmail()`, `acceptInvite()`

### Components

All UI lives in `components/nextrole/`. There is no separate React SPA — everything is rendered through the Next.js page tree. Key components:

| File | Responsibility |
|---|---|
| `dashboard-shell.tsx` | Protected layout: sidebar, header, auth guard |
| `dashboard-pages.tsx` | Renders the correct page for each `/dashboard/*` route |
| `pipeline-page.tsx` | Job tracker table (status, notes, linked resumes) |
| `evaluate-page.tsx` | Job evaluation input form + results display |
| `resumes-page.tsx` | Resume library with preview and PDF download |
| `profile-page.tsx` | CV upload + autofill fields editor |
| `billing-page.tsx` | Subscription status, credit balance, top-up |
| `settings-page.tsx` | Extension tokens, account preferences |
| `upgrade-modal.tsx` | Tier upsell modal |
| `command-launcher.tsx` | Global ⌘K command palette |
| `dashboard-tour.tsx` | First-time user onboarding tour |
| `ui.tsx` | Shared buttons, modals, form elements |

---

## AI Layer

### Provider Routing (`lib/ai/router.ts`)

All AI calls go through a central router that resolves the provider in priority order:

```
1. OpenRouter → Gemini 2.0 Flash Lite   (primary, cheapest)
2. Anthropic → Claude                   (fallback)
3. Google Gemini → direct               (fallback)
4. OpenAI → GPT-4o                      (last resort)
```

BYOK users (`tier = 'byok'`) can store their own encrypted API keys. The router detects this and uses the user's key + their chosen model instead.

### Feature Gates (`lib/ai/gates.ts`)

Each AI feature has a credit cost and per-tier access rules:

| Task | Credits | Free | Starter | Pro | BYOK |
|---|---|---|---|---|---|
| evaluate | 5 | 5/day | 100/day | 300/day | unlimited |
| resume_standard | 10 | 1/day | ✓ | ✓ | unlimited |
| resume_premium | 25 | — | — | ✓ | unlimited |
| autofill | 2 | — | limited | ✓ | unlimited |
| tailor | 8 | — | — | ✓ | unlimited |

The `requireFeature()` guard (`lib/ai/guard.ts`) is called at the start of every AI API route. It:
1. Validates user auth
2. Checks tier eligibility
3. Calls `deduct_credit()` atomically in PostgreSQL
4. Returns 402 if credits are insufficient

### Credit Reset

A nightly cron job (`GET /api/cron/reset-credits`) is secured with `CRON_SECRET` and calls the PostgreSQL function `reset_all_daily_credits()`, which resets `credits_remaining` to the tier maximum for all active subscribers.

---

## Database

### Stack

Supabase-hosted PostgreSQL with:
- **Row-Level Security (RLS)** on every table — users can only access their own rows
- **Service role key** used server-side to bypass RLS for admin operations
- **Supabase Auth** for session management; user ID (`auth.uid()`) is the primary FK across all tables

### Core Tables

```
profiles            User record, CV text, autofill fields, tier, credits
jobs                Job postings added to user's pipeline
evaluations         AI evaluation results per job (JSONB for structured output)
resumes             Tailored resume artifacts (markdown + HTML + PDF path)
profile_files       User-uploaded resume / cover letter files
usage_log           Audit trail for every AI call (model, credits used)
daily_usage         Per-user daily counter (Free tier limits)
extension_tokens    Short-lived auth tokens for the browser extension
provider_credentials User's own BYOK API keys (AES-256 encrypted)
application_sessions Autofill activity tracking (started, filled, submitted)
extension_feedback  User corrections to job detection ("not a job")
team_members        Team collaboration (pending feature)
invites             Early access invite codes
waitlist            Pre-launch interest
```

### Key PostgreSQL Functions

- `deduct_credit(user_id, amount)` — atomic credit check + deduction
- `reset_credits_for_tier(user_id, tier)` — set credit limit when tier changes
- `increment_daily_usage(field, user_id)` — increment Free tier usage counters
- `reset_all_daily_credits()` — nightly reset for all active subscribers

### Authentication

1. User signs up via Supabase Auth (email + OTP confirmation)
2. A `AFTER INSERT` trigger on `auth.users` creates the `profiles` row with `tier = 'free'`
3. Sessions are managed by Supabase SSR cookies (`@supabase/ssr`)
4. The `middleware.ts` at the Next.js root refreshes sessions on every request

### Storage

One Supabase Storage bucket: `profile-files`

Access is folder-isolated: `{user_id}/{file_name}`. RLS policies restrict read/write to the owning user. Files are uploaded via `POST /api/profile/files` and returned as signed URLs.

---

## Payment & Billing

**Provider:** Lemon Squeezy

### Subscription Flow

```
User clicks "Upgrade" in billing page
  → /api/topup or direct LS checkout URL
  → User completes payment on Lemon Squeezy
  → LS sends webhook to POST /api/webhooks/lemonsqueezy
  → Webhook handler verifies HMAC signature
  → Updates profiles.tier, subscription_id, subscription_status
  → Calls reset_credits_for_tier() to set credit limit
  → Redirects user to /onboarding/activated
```

### Webhook Events Handled

- `subscription_created` — activate tier, set credits
- `subscription_updated` — handle plan changes
- `subscription_cancelled` — downgrade to Free at period end
- `order_created` — handle one-time top-up credit packs

### Credit Top-Ups (Pro only)

Pro users can buy additional credits beyond their daily reset:

| Pack | Credits | 
|---|---|
| Mini | 100 |
| Small | 300 |
| Medium | 750 |
| Large | 2000 |

Credits from top-ups are added to `credits_remaining` and do not expire at midnight.

---

## Browser Extension

### Architecture

The extension is built as a Chrome MV3 extension. It has no bundler — all files are vanilla JavaScript loaded directly by the browser. It communicates with the NextRole backend using extension tokens (not session cookies).

```
┌──────────────────────────────────────────────────────┐
│                    Chrome Extension                  │
│                                                      │
│  service-worker.js          (background context)     │
│  ├── handles icon click, install, update events      │
│  └── relays messages between content scripts + API   │
│                                                      │
│  popup.js                   (popup context)          │
│  └── quick view of current job, action buttons       │
│                                                      │
│  options.js                 (options page)           │
│  └── extension token management, API URL config      │
│                                                      │
│  content.js                 (runs on every page)     │
│  ├── detects job postings (JSON-LD + CSS selectors)  │
│  └── injects apply-card.js overlay                   │
│                                                      │
│  apply-card.js              (injected UI overlay)    │
│  └── evaluation card, quick actions                  │
│                                                      │
│  auto-fill.js               (runs on apply pages)    │
│  └── classifies form fields + fills from profile     │
│                                                      │
│  resume-upload.js           (runs on apply pages)    │
│  └── auto-selects default resume for file inputs     │
│                                                      │
│  config.js                  (shared)                 │
│  └── site-to-selector map, ATS family identifiers    │
│                                                      │
│  registry/ats.js            (shared)                 │
│  └── identifies ATS system from domain               │
└──────────────────────────────────────────────────────┘
```

### Authentication

The extension does not share cookies with the web app. Instead:

1. User visits `/connect-extension` in the web app (while logged in)
2. Web app generates an extension token (random bytes, SHA-256 hashed, stored in `extension_tokens`)
3. User copies the token into the extension options page
4. All extension API calls include `Authorization: Bearer <token>` header
5. Tokens expire after 7 days; `last_used_at` is updated on each use

### Job Detection (`content.js`)

Job detection runs in two passes:

1. **JSON-LD schema** — look for `<script type="application/ld+json">` blocks with `@type: "JobPosting"`. Works on most modern job boards.
2. **Site-specific CSS selectors** — fallback for LinkedIn, Indeed, Glassdoor, and others that don't use structured data.

When a job is detected, `content.js` extracts title, company, and description, then renders the `apply-card.js` overlay and calls `/api/extension/evaluate`.

### Form Autofill (`auto-fill.js`)

Autofill runs when the extension detects a job application page. It:

1. Scans all `<input>`, `<textarea>`, and `<select>` elements
2. Classifies each field using a combination of:
   - `name`, `id`, `placeholder`, and `aria-label` attribute text
   - Label element text (walking up the DOM tree)
   - Regex heuristics for common patterns (email, phone, LinkedIn URL, etc.)
3. Fetches the user's autofill profile from `/api/extension/profile`
4. Fills matched fields with the corresponding profile value
5. For file inputs (resume upload), `resume-upload.js` intercepts and provides the user's default resume file
6. Logs the session to `/api/extension/application-session` (status: started → filled → submitted)

### ATS Detection (`registry/ats.js`)

Identifies which Applicant Tracking System a page uses based on the domain and URL patterns. This matters because different ATS platforms (Greenhouse, Lever, Ashby, Workday) structure their forms differently, requiring tailored autofill strategies.

---

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # anon key (safe for client)
SUPABASE_SERVICE_ROLE_KEY=              # admin key (server only)

# Site
NEXT_PUBLIC_SITE_URL=
ADMIN_EMAIL=                            # gates admin routes + features

# AI Providers (resolution order: OpenRouter → Anthropic → Gemini → OpenAI)
OPENROUTER_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
OPENAI_API_KEY=

# Lemon Squeezy
LEMONSQUEEZY_WEBHOOK_SECRET=
LEMONSQUEEZY_API_KEY=
NEXT_PUBLIC_LS_STARTER_URL=
NEXT_PUBLIC_LS_PRO_URL=
NEXT_PUBLIC_LS_TOPUP_URL=
LEMONSQUEEZY_VARIANT_STARTER_MONTHLY=
LEMONSQUEEZY_VARIANT_PRO_MONTHLY=
LEMONSQUEEZY_VARIANT_PRO_YEARLY=
LEMONSQUEEZY_VARIANT_TOPUP_MINI=
LEMONSQUEEZY_VARIANT_TOPUP_SMALL=
LEMONSQUEEZY_VARIANT_TOPUP_MEDIUM=
LEMONSQUEEZY_VARIANT_TOPUP_LARGE=

# Email
RESEND_API_KEY=
TRIAL_EMAIL_FROM=

# Security
CRON_SECRET=                            # authenticates /api/cron/* endpoints
PROVIDER_ENCRYPTION_KEY=               # 32-byte hex key for BYOK key encryption
```

---

## Data Flow: Job Evaluation

The most important user action — evaluating a job — flows as follows:

```
User pastes job URL or description into /evaluate
  │
  ▼
POST /api/evaluate
  │  Validates session
  │  Calls requireFeature('evaluate') → checks credits → deducts 5
  │
  ▼
lib/evaluate/prompt.ts
  │  Builds system prompt with user's profile (CV, preferences, comp range)
  │  Builds user prompt with job title, company, description
  │
  ▼
lib/ai/router.ts
  │  Resolves provider (OpenRouter → Gemini 2.0 Flash)
  │  Makes API call, streams or awaits response
  │
  ▼
Structured output parsed into:
  ├── score (1–5)
  ├── decision (apply | skip | watch)
  ├── role_fit analysis
  ├── compensation_analysis
  ├── cv_match (gaps, strengths)
  ├── personalization_guidance
  ├── interview_signals
  └── legitimacy_check
  │
  ▼
Stored in evaluations table (with job_id FK)
  │
  ▼
Returned to client → displayed in evaluate-page.tsx
```

Same flow applies when called from the extension via `/api/extension/evaluate`.

---

## Data Flow: Autofill

```
User opens a job application page in Chrome
  │
  ▼
content.js detects application form (ATS family identified)
auto-fill.js activates
  │
  ▼
GET /api/extension/profile (extension token auth)
  │  Returns: name, email, phone, LinkedIn, GitHub, address, etc.
  │           work_experience[], education[], skills[]
  │
  ▼
auto-fill.js classifies all form fields
  │  Matches each <input> to a profile field
  │  Fills matched fields with profile values
  │
  ▼
For file inputs (resume upload):
  GET /api/extension/profile-file → returns default resume as binary
  resume-upload.js injects the file into the <input>
  │
  ▼
POST /api/extension/application-session (logs: filled, url, ats_family)
  │
  ▼
Optional: user clicks "Tailor" on a field
  POST /api/extension/tailor
    │  AI rewrites one profile field to match the specific form + job context
    └  Returns tailored text → auto-fill.js updates the field
```

---

## Security Model

| Concern | Mechanism |
|---|---|
| Row isolation | Supabase RLS: `auth.uid() = user_id` on every table |
| Admin endpoints | `ADMIN_EMAIL` env check in API handlers |
| Extension auth | SHA-256 hashed tokens with 7-day expiry; plaintext never stored |
| BYOK key storage | AES-256 encrypted with `PROVIDER_ENCRYPTION_KEY` before DB write |
| Cron endpoint | `CRON_SECRET` bearer token required |
| Webhook integrity | HMAC-SHA256 signature verified against `LEMONSQUEEZY_WEBHOOK_SECRET` |
| CSRF | Custom CSRF token generation/validation for mutating server actions |
| Rate limiting | Per-user rate limiting on AI endpoints (`lib/security/rate-limit.ts`) |
| Credit atomicity | PostgreSQL `deduct_credit()` function prevents race conditions on credit deduction |

---

## Planned Features (Roadmap)

The following are scoped but not yet built:

- **Job Scanner** — crawl career pages and RSS feeds; tables `scan_sources`, `scan_runs`, `scan_discoveries` already exist in schema
- **Interview Prep Packs** — AI-generated Q&A + story bank for behavioral questions
- **Email Integration** — send resumes and drafts directly to recruiter inboxes (Resend)
- **Team Collaboration** — share jobs, notes, resumes across a team (`team_members` table exists)
- **Deep Research** — company-level analysis, salary benchmarking, culture signals
- **Story Bank** — structured STAR-format story entries linked to job applications
