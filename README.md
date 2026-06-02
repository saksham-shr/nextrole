# NextRole

AI-powered job application platform for the Indian market. Track jobs, generate tailored resumes, autofill applications via the Chrome extension.

---

## Tech stack

- **Framework** — Next.js 15 App Router (TypeScript)
- **Database / Auth** — Supabase (Postgres + Row Level Security)
- **AI** — Multi-provider via `lib/ai/providers.ts` (OpenRouter, Anthropic, OpenAI, Gemini, Sarvam) with AbortController timeouts and per-route fallback chains
- **Payments** — Razorpay (subscriptions + one-time top-ups). Plans and pricing are admin-mutable via `commerce_config` — see "Commerce config" below.
- **Email** — Resend
- **Styling** — Tailwind CSS + CSS variables
- **Extension** — Chrome MV3 content script + side panel + service worker

---

## Plans

| | Free | Starter | Pro |
|---|---|---|---|
| Job pipeline | 5 slots | 25 slots | Unlimited |
| Daily credits | — | 100 / day | 300 / day |
| AI evaluation | 5 / day | 5 credits | 5 credits |
| Tailored resume | 1 / day | 10 credits | 10 credits |
| Premium resume | — | — | 25 credits |
| Autofill | — | 1 / day | Unlimited |
| Credit top-ups | — | — | ✓ |

Credits reset at midnight UTC. Unused daily credits don't roll over.

**Public launch:** any user can sign up — no invite required. The `invites` table is retained as an admin-operational tool: admins can issue invite links via `/dashboard/admin` → Invites that grant a specific tier on first dashboard visit.

---

## Getting started

### Prerequisites

- Node.js 20+
- A [Supabase](https://supabase.com) project
- API keys for at least one AI provider (OpenRouter, Anthropic, OpenAI, or Gemini)
- A [Razorpay](https://razorpay.com) account (for payments)

### Setup

```bash
git clone https://github.com/saksham-shr/nextrole.git
cd nextrole
npm install
cp .env.example .env.local   # fill in your values
```

Apply the database schema.

**For a brand-new Supabase project** — use the canonical baseline
(single SQL file, idempotent, equivalent to the full migration chain):

```bash
psql "$DATABASE_URL" -f supabase/baseline/migrations/00000000000000_baseline.sql
# then create the profile-files storage bucket per supabase/baseline/storage_setup.sql
```

See [`supabase/baseline/README.md`](supabase/baseline/README.md) for the
full provisioning runbook (storage bucket, pg_cron schedule, validation
queries) and [`supabase/baseline/CLASSIFICATION.md`](supabase/baseline/CLASSIFICATION.md)
for what's kept / merged / dropped vs the original migration chain.

**For an existing project already advanced through the legacy chain** —
keep applying incremental migrations as before:

```bash
npx supabase db push --linked
```

The legacy migration chain at [`supabase/migrations/`](supabase/migrations)
is preserved unchanged as historical reference.

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

See [`.env.example`](.env.example) for the full list. Key ones:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Anon key for client-side queries |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin DB access (server-side only) |
| `OPENROUTER_API_KEY` / `ANTHROPIC_API_KEY` / `OPENAI_API_KEY` / `GEMINI_API_KEY` | At least one AI provider key |
| `ADMIN_EMAIL` | Email that gets admin panel access + tier overrides |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Server-side order creation + signature verification |
| `NEXT_PUBLIC_RAZORPAY_KEY_ID` | Client-side checkout widget |
| `RAZORPAY_WEBHOOK_SECRET` | **Required in production.** Webhook hard-fails without it (no silent bypass). |
| `NEXT_PUBLIC_SITE_URL` | Used by CSRF check and OAuth redirects |

---

## Razorpay webhook

1. Razorpay Dashboard → Settings → Webhooks → Add endpoint
2. URL: `https://yourdomain.com/api/webhooks/razorpay`
3. Subscribe to: `payment.captured`, `subscription.cancelled`, `subscription.completed`
4. Copy signing secret → `RAZORPAY_WEBHOOK_SECRET`

> For local testing, use [ngrok](https://ngrok.com): `ngrok http 3000` and point the webhook at the ngrok URL.

The webhook + the synchronous `/api/razorpay/verify-payment` endpoint both write a sentinel row to `usage_log` keyed by `razorpay_payment_id` — the unique partial index (`20260520000002_payment_idempotency_dedupe.sql`) guarantees neither path can double-credit a user even if both fire for the same payment.

---

## Commerce config

Pricing, top-up packs, and per-plan availability are admin-mutable at runtime via the `commerce_config` table.

- **Admin UI:** `/dashboard/admin` → Commerce tab
- **Backed by:** [`lib/commerce/config.ts`](lib/commerce/config.ts) (server-side, 30 s cached)
- **Defaults:** hardcoded in [`lib/ai/gates.ts`](lib/ai/gates.ts) (`TOPUP_PACKS`) and [`lib/hooks/use-currency.ts`](lib/hooks/use-currency.ts) (`INR_PRICES`); overrides on top
- **Enforced by:** `/api/razorpay/create-order`, `/api/razorpay/verify-payment`, `/api/webhooks/razorpay`
- **Displayed by:** `/dashboard/billing` (plans and topup packs are hidden when their `flags.*_enabled` is false)

This means an ops update flows through to both the billing UI and the order-time enforcement without a deploy.

---

## Browser extension

The active extension lives in its own repo: [NextRole-Extension](https://github.com/saksham-shr/NextRole-Extension). The `extension/` directory in this repo is **legacy reference material only** — do not run it against production.

Load the active extension:

1. Clone the extension repo
2. `npm install && npm run build`
3. Open `chrome://extensions`
4. Enable Developer mode
5. Load unpacked → select the extension's `dist/` folder

Detects job postings on LinkedIn, Indeed, Naukri, Lever, Greenhouse, Ashby, Workday, Oracle HCM, iCIMS, Glassdoor, Wellfound, plus 40+ Indian boards and direct company career pages.

---

## Project structure

```
app/
  api/
    webhooks/razorpay/        Razorpay webhook handler (payment.captured, subscription.*)
    razorpay/
      create-order/           Server-side order creation (commerce-config-aware)
      verify-payment/         Client-call signature verification + idempotent credit
    invites/                  Admin invite CRUD (admin-operational, not public-launch gate)
    extension/                Bearer-token endpoints the Chrome extension calls
  dashboard/                  Protected dashboard pages
    admin/                    Admin panel (Users / Invites / Commerce / Audit / Activity)
    billing/                  Plan management — reads live commerce_config
  onboarding/                 Post-signup profile capture
  actions/                    Server actions (auth, profile, jobs, admin, resumes)
components/nextrole/
  auth-pages.tsx              Login, signup (with optional invite-code tier grant)
  billing-page.tsx            Plan/topup UI (driven by commerce config props)
  admin-*.tsx                 Admin panel components
  dashboard-*.tsx             Shell, home, and page components
  public-pages.tsx            Landing, pricing, privacy, terms
  onboarding-pricing.tsx      Post-signup plan picker
lib/
  ai/                         Multi-provider AI router + credit gates
  admin/audit.ts              Admin action logger
  commerce/config.ts          Admin-mutable commerce config (DB + cache)
  hooks/                      useCurrency, etc.
  security/                   CSRF, rate-limit (Vercel-hardened getClientIp)
  supabase/                   Client + server Supabase helpers
supabase/
  migrations/                 Database schema migrations (apply in order)
DB_MIGRATION_INDIA.md         India-region cutover runbook
```

---

## Cutover to India region

See [`DB_MIGRATION_INDIA.md`](DB_MIGRATION_INDIA.md) for the full runbook. Headlines:

- JWTs do NOT carry across Supabase projects → users sign in again after cutover (passwords carry via `auth.identities`).
- Extension stays connected (`extension_tokens` migrates).
- All paying users are reset to `free` tier; refund flow is out of band.
- The runbook includes a preflight dedupe migration (`20260520000002_payment_idempotency_dedupe.sql`) that quarantines any duplicate `razorpay_payment_id` rows from the replay-vulnerable webhook era before creating the unique index.

---

## License

Private — all rights reserved.
