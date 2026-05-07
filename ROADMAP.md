# NextRole — Product Roadmap

**Version:** 1.0
**Last updated:** 2026-05-05
**Owner:** Saksham
**Companion to:** `BUSINESS_PLAN.md`

> Now / Next / Later format. Dates are intent, not promises. Re-prioritize monthly based on what users actually do.

---

## Reading guide

- **Now** = this 2-week sprint, must ship to launch
- **Next** = weeks 3–12 (post-launch growth phase)
- **Later** = month 4+, gated on hitting business plan milestones
- **Parking lot** = ideas worth keeping, no commitment

Each item lists: **What** · **Why now** · **Acceptance** · **Where it lives** (branch / file).

---

## Phase 0 — Pre-launch blockers (NOW · ship within 14 days)

These are the only things between today and v1 going live. From `progress.md` plus a few launch-readiness adds.

### P0.1 — LemonSqueezy checkout URL
- **What:** Set `NEXT_PUBLIC_LS_CHECKOUT_URL` in `.env.local` (and Vercel env)
- **Why now:** Every upgrade button currently falls back to `/pricing` — no one can pay
- **Acceptance:** Click "Upgrade to Pro" from billing page → lands on LemonSqueezy checkout with correct variant
- **Owner:** Saksham · **Effort:** 30 min

### P0.2 — Apply DB migrations to production Supabase
- **What:** `supabase db push` for `20260505000004_daily_usage.sql` + `20260505000005_daily_credits.sql`
- **Why now:** Without `daily_usage` table, every free-tier guard call crashes
- **Acceptance:** Free user runs 6 evals → 6th returns 429 `DAILY_LIMIT_REACHED`; paid user sees credit decrement
- **Owner:** Saksham · **Effort:** 1 hr (incl. backup + verify)

### P0.3 — Daily credit reset cron
- **What:** Enable pg_cron in Supabase, schedule `reset_all_daily_credits()` at 0 0 * * *
- **Why now:** Without this, paid users hit limit on day 1 and never recover
- **Acceptance:** Manually run `SELECT cron.job_run_details` after midnight UTC → success entry
- **Owner:** Saksham · **Effort:** 30 min

### P0.4 — Chrome Web Store submission
- **What:** Package extension, submit to Chrome Web Store for review
- **Why now:** Review takes 3–7 days; doing this day 1 of sprint means it's live by launch
- **Acceptance:** Listing approved, install link works, screenshots + description published
- **Owner:** Saksham · **Effort:** 4 hrs (assets + listing copy)

### P0.5 — End-to-end smoke test (real user, real money)
- **What:** Sign up → upgrade to Starter via real LemonSqueezy → verify webhook → use 3 evals + 1 resume + 1 autofill → cancel → verify downgrade
- **Why now:** Only way to catch billing-webhook-state bugs is to actually run the path
- **Acceptance:** All steps pass with no manual DB intervention
- **Owner:** Saksham · **Effort:** 2 hrs

### P0.6 — Privacy + Terms pages
- **What:** Lightweight `/privacy` and `/terms` covering: data we collect, RLS, no training, Anthropic subprocessor, deletion path
- **Why now:** Chrome Web Store + LemonSqueezy require it; protects you
- **Acceptance:** Pages live, linked from footer, mention RESUME data specifically
- **Owner:** Saksham · **Effort:** 3 hrs (use a template, customize)

### P0.7 — Onboarding flow polish
- **What:** First-run experience: paste CV → set 1 target → run first eval. Time to first eval < 3 min.
- **Why now:** Activation rate is the single biggest lever on free→paid conversion
- **Acceptance:** New user can hit "first eval ran" in < 3 min from signup with zero outside help
- **Owner:** Saksham · **Effort:** 1 day (already mostly done, just trim)

### P0.8 — Analytics + error monitoring
- **What:** PostHog (events) + Sentry (errors) wired in
- **Why now:** Can't optimize without data; can't fix bugs you can't see
- **Acceptance:** `signup_complete`, `first_eval_run`, `upgrade_clicked`, `upgrade_completed` events firing; Sentry catches a forced error
- **Owner:** Saksham · **Effort:** 3 hrs

### P0.9 — Trial / activation incentive
- **What:** New signups get a 7-day Starter trial (no card required) — config flag, not full plumbing
- **Why now:** Removes the biggest activation blocker (autofill is locked behind paywall)
- **Acceptance:** New user can use 1 autofill in their first 7 days; clear in-app messaging
- **Owner:** Saksham · **Effort:** 1 day

---

## Phase 1 — Launch + first 4 weeks (NEXT · weeks 1–4)

Goal: validate the loop works for real users, hit ₹15k MRR, fix what breaks first.

### P1.1 — Liveness checker improvements
- **What:** Already shipped (per progress.md). Add weekly automated re-check for tracker rows.
- **Why:** Users mentally archive dead listings — automation makes the tracker actually trustworthy
- **Acceptance:** Cron job re-checks `tracker.applied` rows every 7 days, marks closed
- **Effort:** 1 day

### P1.2 — Email digest (weekly)
- **What:** Sunday email: "Your week — X jobs added, Y evaluated, Z follow-ups due, top match: [Role]"
- **Why:** Drives Monday return visit; the activation/retention compounding starts here
- **Acceptance:** Resend wired, template approved, opt-out works, click-through tracked in PostHog
- **Effort:** 2 days · **Note:** `RESEND_API_KEY` blank per progress.md — fill before building

### P1.3 — Public job board / shareable evaluations
- **What:** Optional toggle to make a single eval result shareable via `nextrole.com/r/[slug]` (sanitized)
- **Why:** Cheap viral loop — users share their eval; lurkers see the product
- **Acceptance:** Public page renders, shows brand mark, clear "Run your own" CTA
- **Effort:** 2 days

### P1.4 — Naukri + LinkedIn extension reliability pass
- **What:** Selector hardening on top 5 portals; telemetry on extraction failure
- **Why:** Extension breakage is the silent killer of retention
- **Acceptance:** Failure rate <5% on a daily probe of 20 sample listings per portal
- **Effort:** 3 days

### P1.5 — Onboarding A/B: video vs. checklist vs. nothing
- **What:** Three onboarding variants behind a flag, measure activation rate
- **Why:** First-eval rate is the lever; need data, not opinions
- **Acceptance:** 200 users per variant, p<0.1 winner declared
- **Effort:** 3 days build + 2 weeks running

### P1.6 — Resume direct upload (Pro feature, currently stubbed)
- **What:** The gate `resume_direct_upload` exists in `gates.ts` but no UI/API. Build it.
- **Why:** Pro buyers expect this — referenced in pricing copy
- **Acceptance:** Pro user uploads PDF resume → it lands in application form file input on Greenhouse / Lever
- **Effort:** 4 days

### P1.7 — In-app NPS prompt at day 14
- **What:** "How likely are you to recommend NextRole?" with optional comment
- **Why:** Cheap PMF signal + qualitative feedback at the moment they've used it long enough to judge
- **Acceptance:** Prompt fires once at day 14, response stored, weekly digest emailed to founder
- **Effort:** 1 day

---

## Phase 2 — Growth + retention (NEXT · weeks 5–12)

Goal: 60–100 paying users, prove retention >50% MAU, reach ₹50–75k MRR.

### P2.1 — Referral program
- **What:** Each user gets a referral link; new signup via link → both get 30 days Starter free
- **Why:** Job seekers hang out with other job seekers; viral coefficient could be real
- **Acceptance:** Tracked end-to-end in PostHog, attribution works through LemonSqueezy
- **Effort:** 4 days

### P2.2 — Resume version diff + A/B
- **What:** "Try this 2nd variant" — generate alt resume framing, let user pick, track which one gets responses
- **Why:** Sticky feature, hard for competitors to copy without our eval data
- **Acceptance:** User can compare 2 resumes side-by-side; "got a response" feedback loop wired
- **Effort:** 5 days

### P2.3 — Browser extension: Workday + Indeed support
- **What:** Add the two largest US ATSs after current set
- **Why:** Unlocks US market; Workday alone is 30%+ of Fortune 500 jobs
- **Acceptance:** Autofill works on 5 sample Workday tenants + 5 Indeed listings
- **Effort:** 1 week

### P2.4 — Story Bank polish
- **What:** Better STAR generation, tag stories by competency, attach to interview prep auto
- **Why:** Pro buyers cite interview prep as a sticky feature; doubling down on it lifts retention
- **Acceptance:** Story Bank feels native to interview prep flow, not a separate workspace
- **Effort:** 4 days

### P2.5 — Patterns dashboard v2
- **What:** Funnel view: applied → response → interview → offer, segmented by source / role / size
- **Why:** Once a user has 30+ tracked applications, this becomes the reason they don't churn
- **Acceptance:** A user with 50+ rows sees 3 actionable insights surfaced automatically
- **Effort:** 5 days

### P2.6 — Annual plan push
- **What:** In-app prompt for users on month 2 of monthly: "Save 20% with annual"
- **Why:** Annual = lower churn + cash up front. Already priced (₹7,200 / ₹15,200), just need the nudge
- **Acceptance:** Prompt in billing page + email; conversion measured
- **Effort:** 1 day

### P2.7 — SEO landing pages: programmatic
- **What:** Auto-generated pages for "How to apply to [Company]" and "[ATS] resume tips" — 100+ pages from a template
- **Why:** Long-tail SEO compounds; cheap acquisition channel
- **Acceptance:** 100 pages indexed, internal links structured, Search Console showing impressions
- **Effort:** 1 week + ongoing content updates

---

## Phase 3 — Differentiation features (LATER · months 4–6)

Gate: only if MRR > ₹50k and retention is healthy. Otherwise spend that time on retention/onboarding instead.

### P3.1 — Resume "score & fix" inline
- **What:** Live ATS-style score on the resume editor with one-click fixes
- **Why:** Most-requested feature in resume-builder competitor reviews; closes the Rezi/Jobscan parity gap
- **Effort:** 1.5 weeks

### P3.2 — Company research packs (Pro)
- **What:** One-click "research this company" — funding, recent news, glassdoor signals, decision makers, common interview questions
- **Why:** High-perceived-value Pro feature; uses deep_research gate already defined
- **Effort:** 2 weeks

### P3.3 — Auto-evaluate (Pro)
- **What:** When a job lands in pipeline (via extension or scanner), auto-run eval in background
- **Why:** Gate `auto_evaluate` exists. Removes the highest-friction step in the loop for Pro users
- **Effort:** 1 week

### P3.4 — Mobile companion (read-only)
- **What:** Mobile-responsive views for tracker, follow-ups, evaluations. NOT a mobile app, just better mobile web.
- **Why:** Job seekers check status on phones; loss of that = lost return visits
- **Effort:** 1 week

### P3.5 — Calendar integration
- **What:** Connect Google Calendar — interview events show up in tracker, prep packs trigger 24h before
- **Why:** Anchors NextRole as the "command center" for the search
- **Effort:** 1.5 weeks

---

## Phase 4 — Monetization expansion (LATER · month 6+)

Gate: only after Free→Paid conversion is stable >3% and Pro retention >70% at 90 days. Both branches' code already exists, but launching them prematurely splits focus.

### P4.1 — Team plan (from `feature/monetization-llm`)
- **What:** Bring back team multi-seat. Target buyers: career coaches, bootcamps, college career centers.
- **Why later, not now:** B2B2C sales cycle is long; needs founder time we don't have until Pro is humming
- **Effort:** 2 weeks to port + integrate (code exists), 4+ weeks to validate first 3 paying coaches
- **Pricing direction:** ₹4,999/mo for 5 seats; ₹14,999/mo for 20 seats. Validate with 5 coaches before locking.

### P4.2 — BYOK (bring your own key) — from `feature/monetization-llm`
- **What:** Power-user tier where the user provides their own Anthropic/OpenAI/Gemini key for unlimited usage
- **Why later, not now:** Cannibalizes Pro for the most-engaged users. Only makes sense if Pro caps are *actually* hitting power users — not yet.
- **Effort:** 1 week to re-enable + add encryption flow; encryption already exists per `app/actions/providers.ts`
- **Pricing direction:** ₹2,499/mo flat — they pay for the platform, AI cost is theirs

### P4.3 — Annual + lifetime promotional drops
- **What:** AppSumo / lifetime deal once unit economics are proven
- **Why:** Cash injection + huge user base for word-of-mouth, but only with strong economics so we don't lose money on it
- **Effort:** 2 weeks coordination

### P4.4 — Affiliate program (LemonSqueezy native)
- **What:** 30% recurring for 12 months
- **Why:** Most career creators on YouTube / LinkedIn will promote for that rate
- **Effort:** 1 week setup + ongoing recruitment

---

## Parking lot (no commitment, revisit quarterly)

- Native mobile app (iOS/Android)
- Recruiter side / employer-paying product
- Slack/Discord community for paid users
- AI mock interview with voice
- LinkedIn easy-apply automation (regulatory risk — careful)
- Job board (we host listings) — only if scanner data becomes uniquely valuable
- White-label for universities — too early
- Embedded resume widget for personal sites
- Outreach generator (cold messages to recruiters)
- Salary database from our eval data (long-term moat play)

---

## Sequencing logic — why this order

1. **Phase 0** ships v1. Everything else is irrelevant if billing or migrations are broken.
2. **Phase 1** is *not* features — it's instrumentation, reliability, the email digest. The features are already there; we need to make sure they actually work and we measure what's happening.
3. **Phase 2** is growth + retention infrastructure. Referral, annual upsell, programmatic SEO — these are the things that bend the curves.
4. **Phase 3** is the "now we differentiate" phase, but only if early phases prove the loop. If Pro retention is bad, more Pro features won't fix it.
5. **Phase 4** is monetization expansion. Team and BYOK are tempting *now* because the code exists, but launching them splits focus before the core funnel is proven. Order matters more than speed.

## Things I keep reminding myself

- **Ship the smallest version that proves the bet.** Phase 1 has too many items. If I can only do 3, do P1.1 (liveness), P1.2 (digest), P1.5 (onboarding A/B).
- **Retention before acquisition.** A leaky bucket fills slower than a sealed one.
- **The wedge is the eval, not the resume.** Most competitors lead with resume. Lead with "should I even apply?"
- **Don't ship the Team plan early just because the code exists.** Sunk-cost trap.
- **The browser extension is the moat.** Once installed, friction-free capture compounds. Spend extra cycles making it bulletproof.

---

*Sister doc: `BUSINESS_PLAN.md` — the strategy this roadmap implements.*
