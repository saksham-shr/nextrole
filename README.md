# NextRole

**AI-powered job search assistant.** Evaluate roles, generate tailored resumes, autofill applications, and track your entire pipeline — all from one place.

> Currently in private beta.

---

## What it does

| Feature | Description |
|---|---|
| **AI job evaluation** | Paste a job URL or description — get a fit score, CV gap analysis, and compensation signals |
| **Tailored resumes** | Generate job-specific resume variants, keyword-optimised per role |
| **Premium resumes** | Full-layout, print-ready resume with styling |
| **Autofill** | Browser extension detects application forms and fills them from your CV |
| **Job pipeline** | Tracker for every application with status, notes, and linked artifacts |
| **Browser extension** | Detects job postings as you browse and surfaces the NextRole panel |
| **Credit top-ups** | Pro users can buy extra credits on top of their daily allowance |

---

## Tech stack

- **Framework** — Next.js 14 App Router (TypeScript)
- **Database / Auth** — Supabase (Postgres + Row Level Security)
- **AI** — Anthropic Claude via `@anthropic-ai/sdk`
- **Payments** — Lemon Squeezy (subscriptions + one-time top-ups)
- **Email** — Resend
- **Styling** — Tailwind CSS + CSS variables
- **Extension** — Chrome MV3 content script

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

---

## Getting started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- An [Anthropic](https://console.anthropic.com) API key
- A [Lemon Squeezy](https://lemonsqueezy.com) store (for payments)

### Setup

```bash
git clone https://github.com/saksham-shr/nextrole.git
cd nextrole
npm install
cp .env.example .env.local   # fill in your values
```

Apply the database schema:

```bash
# Via Supabase CLI
npx supabase db push
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment variables

See [`.env.example`](.env.example) for the full list with descriptions. Key ones:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Admin DB access (server-side only) |
| `ANTHROPIC_API_KEY` | Powers all AI features |
| `ADMIN_EMAIL` | Your email — beta gating + admin overrides |
| `LEMONSQUEEZY_WEBHOOK_SECRET` | Verifies LS webhook signatures |
| `NEXT_PUBLIC_LS_STARTER_URL` | Starter plan checkout base URL |
| `NEXT_PUBLIC_LS_PRO_URL` | Pro plan checkout base URL |
| `NEXT_PUBLIC_LS_TOPUP_URL` | Credit top-up checkout URL |

---

## Lemon Squeezy webhook

1. LS Dashboard → Settings → Webhooks → Add endpoint
2. URL: `https://yourdomain.com/api/webhooks/lemonsqueezy`
3. Subscribe to: `subscription_created`, `subscription_updated`, `subscription_cancelled`, `subscription_expired`, `subscription_paused`, `subscription_resumed`, `subscription_payment_success`, `subscription_payment_failed`, `subscription_payment_refunded`, `order_created`, `order_refunded`
4. Copy signing secret → `LEMONSQUEEZY_WEBHOOK_SECRET`

> For local testing, use [ngrok](https://ngrok.com): `ngrok http 3000` and point the webhook at the ngrok URL.

---

## Browser extension

The extension lives in `/extension`. Load unpacked in Chrome:

1. Open `chrome://extensions`
2. Enable Developer mode
3. Load unpacked → select the `/extension` folder

Detects job postings on LinkedIn, Indeed, Lever, Greenhouse, Ashby, Workday, Glassdoor, Wellfound, and any site with `JobPosting` JSON-LD schema.

---

## Project structure

```
app/
  api/
    webhooks/lemonsqueezy/   Subscription + top-up webhook handler
    topup/                   Credit top-up checkout endpoint
    billing/                 LS customer portal URL
  dashboard/                 Protected dashboard pages
  onboarding/                Post-signup plan selection
  actions/                   Server actions (auth, profile, jobs)
components/nextrole/
  auth-pages.tsx             Login, signup, password reset
  billing-page.tsx           Plan management + credit top-ups
  dashboard-*.tsx            Shell, home, and page components
  public-pages.tsx           Landing, pricing, privacy, terms
  onboarding-pricing.tsx     Post-signup plan picker
extension/                   Chrome MV3 browser extension
lib/
  ai/                        AI task runners and credit gates
  hooks/                     useCurrency and other hooks
  supabase/                  Client + server Supabase helpers
supabase/
  migrations/                Database schema migrations
```

---

## License

Private — all rights reserved.
