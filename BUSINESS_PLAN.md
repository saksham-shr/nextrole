# NextRole — Business Plan (Founder Operating Doc)

**Version:** 1.0
**Last updated:** 2026-05-05
**Owner:** Saksham
**Status:** Pre-launch (v1 ships within 2 weeks)

> Internal working document. Practical over polished. Numbers are estimates; revisit monthly.

---

## 1. One-line summary

NextRole is the AI job search assistant for serious applicants — a Next.js web app + Chrome extension that evaluates roles, tailors resumes, fills application forms, and tracks the funnel, sold via a freemium SaaS model (Free / Starter ₹749 mo / Pro ₹1,599 mo).

## 2. The problem we're actually solving

Job seekers waste hours per week on low-leverage tasks:

1. **Reading job descriptions** that are wrong-fit but they only learn that 20 minutes in.
2. **Re-tailoring the same resume** for every role, badly.
3. **Re-typing the same 30 fields** into LinkedIn / Greenhouse / Lever / Workday / Naukri.
4. **Losing track** of where they applied, what stage it's in, and when to follow up.
5. **Walking into interviews unprepared** because they didn't research the company or rehearse stories.

Existing tools each solve one slice (Teal = tracker, Rezi = resume, Simplify = autofill, Interview Warmup = prep). None tie the loop together with the *evaluation step at the front* — which is what actually saves time.

## 3. What NextRole is (today, on `nextrole-launch`)

A unified workspace that runs the whole loop:

- **Discover / Capture** — browser extension auto-detects jobs on LinkedIn, Greenhouse, Lever, Naukri, Workday and saves them to the pipeline. Scanner runs saved sources too.
- **Evaluate** — paste a URL or text, get a structured fit score covering compensation, level, risks, CV alignment.
- **Tailor** — generate a role-specific resume in HTML / PDF in one click.
- **Apply** — autofill forms (Starter+), direct resume upload (Pro), draft application answers and cover letters.
- **Track** — pipeline view with status, follow-up urgency, liveness checks (detects closed listings), linked resumes/reports.
- **Prepare** — interview round plans, story bank (STAR), likely questions, negotiation strategy.
- **Improve** — patterns view shows funnel conversion, source quality, archetype performance.

Underlying: Next.js (App Router) on Vercel, Supabase (Postgres + Auth + RLS), LemonSqueezy for checkout, platform-managed Anthropic key for AI inference.

## 4. Who it's for

**Primary persona — "Strategic Switcher" (target: ICP at launch)**
- Mid-career engineer / PM / designer / analyst, 3–10 yrs experience
- Actively interviewing while employed; 5–15 hrs/week on the search
- Earning ₹15–60 LPA in India, $80–180k in US/EU
- Pain: time, not skill. Will pay ₹749–1,599/mo (~$9–19) to recover hours
- Bought adjacent: Teal HQ, Rezi, Simplify, Notion templates, ChatGPT Plus
- Found via: Reddit r/cscareerquestions, LinkedIn, Indian tech Twitter, Telegram job groups

**Secondary persona — "Active Bootcamp Grad / New Grad"**
- 0–2 yrs experience, applying to 50+ roles/week
- Lower willingness to pay; usually free tier
- Value: top-of-funnel acquisition, viral loop, future Pro converts

**Out of scope at launch:**
- Career coaches buying seats for clients (Team plan — deferred, see roadmap)
- Power users wanting BYOK on their own Anthropic key (deferred)
- Recruiters / employers (entirely different product)

## 5. Market sizing (rough, India-first then global)

- India: ~5M active white-collar job seekers/month (LinkedIn + Naukri overlap). 1% premium-conversion ceiling = 50K paying users.
- Global English-speaking: ~50M active seekers. Same 1% = 500K paying users.
- **Realistic 18-month target:** 1,000–3,000 paying users (₹0.75–4.5 Cr ARR at blended ₹1,100/mo). Honest punt, not a TAM fantasy.

## 6. Competition & where we win

| Competitor | What they do | Where we beat them |
|---|---|---|
| **Teal HQ** | Tracker + resume builder | Our evaluator + autofill + extension is one product, not three tabs |
| **Simplify** | Autofill + tracker | We have AI evaluation + resume tailoring; their AI is shallow |
| **Rezi / Kickresume** | Resume builder | Resume is a feature for us, not the product |
| **Jobscan** | ATS keyword match | We do match + evaluation + apply + prep |
| **ChatGPT Plus / Claude Pro** | General AI | We're purpose-built; structured outputs, persistent state, the extension |
| **LinkedIn Premium** | Insights + InMail | Different game — we don't fight them, we sit on top |

**Our moat (post-launch, accumulating):**
1. **The closed loop.** Eval → tailor → apply → prep all share the same job + CV context. Nobody else stitches it.
2. **Browser extension distribution.** Once installed, friction-free capture compounds.
3. **Structured eval data over time.** "We saw 3,400 PM jobs at Series-B startups this month, here's what they actually pay." Becomes a defensible content + product wedge.
4. **India-first pricing + INR billing.** Most US tools cost ₹3–4k/mo equivalent and don't accept INR cards smoothly.

## 7. Pricing & monetization (v1 — locked for launch)

| Plan | Price (INR mo) | Price (INR yr) | USD equiv | Key gates |
|---|---|---|---|---|
| **Free** | ₹0 | ₹0 | $0 | 5 evals/day, 1 resume/day, no autofill, unlimited pipeline |
| **Starter** | ₹749 | ₹7,200 | ~$9 / ~$72 yr | 50 daily credits, basic autofill, interview prep, exports |
| **Pro** | ₹1,599 | ₹15,200 | ~$19 / ~$152 yr | 200 daily credits, full AI autofill, direct resume upload, cover letters, deep research, batch |

**Unit economics (estimated, validate first 30 days):**
- Avg AI cost per Starter user/day: ~₹15–30 (50 credits at small Claude Haiku/Sonnet routing)
- Avg AI cost per Pro user/day: ~₹40–80 (200 credits, more Sonnet usage)
- Starter monthly gross margin target: ~75% (₹749 → ~₹560 contribution after AI + Vercel + Supabase)
- Pro monthly gross margin target: ~70% (₹1,599 → ~₹1,100 contribution)
- LemonSqueezy fee: 5% + $0.50 — bake into pricing
- **Break-even on infra (Vercel Pro + Supabase Pro + AI floor):** ~80 paying users at blended ₹1,100/mo

**Why daily credits, not monthly:**
- Caps catastrophic AI cost spikes
- Encourages habitual return visits
- Resets via pg_cron at midnight (already implemented in migration `20260505000005_daily_credits.sql`)

## 8. Go-to-market (first 90 days)

**Pre-launch (next 14 days, while finishing blockers):**
1. Set LemonSqueezy checkout URL, apply DB migrations, enable pg_cron.
2. Submit Chrome extension to Web Store (review ~3–7 days; do this *day 1* of these two weeks).
3. Build a 200-person waitlist via:
   - Personal Twitter/LinkedIn launch teaser (target 5 posts)
   - Reddit r/cscareerquestions, r/developersIndia, r/leetcode (value-first comments, soft mention)
   - 2 Indian tech Telegram groups (where allowed)
4. Write 3 SEO-targeted blog posts ("ATS resume guide 2026", "Greenhouse autofill", "Compare Teal vs NextRole") — ship before launch.

**Launch week:**
1. Email waitlist with founder note + 30-day Starter trial code.
2. Show HN post — angle: "Show HN: NextRole — AI job search loop with browser extension (Next.js + Supabase)."
3. Product Hunt launch — Tuesday, with a hunter who has real audience. Aim top 5 of day, not top 1.
4. LinkedIn carousel post showing the loop in action (real screenshots, no slop).
5. DM 50 mid-career engineers/PMs in network for feedback + share.

**Weeks 2–8 (growth):**
1. Content engine: 1 SEO post/week targeting "how to tailor resume for [company]", "[role] interview prep", "[ATS] autofill".
2. Reddit: 2 helpful comments/week in target subs; never spam.
3. YouTube: 2-min walkthrough video for the extension ("install → autofill in 30 seconds"). One video, multiple cuts for shorts.
4. Affiliate / referral: 30% recurring commission for first 12 months via LemonSqueezy affiliate program.
5. Friction audit: read every signup that didn't convert to active use; fix the top 3 reasons each week.

**Weeks 9–12 (PMF check):**
- Are 40%+ of paid users still active in week 4? (Sean Ellis test, basic version)
- Is CAC < 2× monthly ARPU? (Pause paid ads if no, double down if yes)
- Are users telling other users? (Track signup source on intake)

## 9. Acquisition channels — bet sizing

| Channel | Cost | Speed | Confidence | Bet |
|---|---|---|---|---|
| Reddit organic | ₹0 | Slow (weeks) | High | Big — 4 hrs/week founder time |
| SEO content | Time-heavy | Slow (3–6 mo) | Medium-high | Medium — 1 post/week |
| Show HN | ₹0 | One-shot | Medium | Big — but only 1 try, do it right |
| Product Hunt | ₹0 | One-shot | Medium | Medium — supplemental |
| LinkedIn organic | ₹0 | Medium | High for India | Big — founder posts 3×/week |
| Twitter/X | ₹0 | Slow | Medium | Small — opportunistic |
| Paid (Google/Meta) | ₹₹₹ | Fast | Low pre-PMF | Pause until weeks 9–12 PMF check |
| YouTube tutorials | Time | Slow | Medium | Small bet — 1 video, see signal |
| Telegram / WhatsApp groups | ₹0 | Fast | Medium for India | Small — risk of spam, do carefully |

## 10. Key metrics (the dashboard I check daily/weekly)

**Daily:**
- Signups (free)
- Activation: % new users who run their first eval within 24h (target: >40%)
- AI cost burn (Anthropic spend / day)

**Weekly:**
- Free → Paid conversion (target: 3–5% within 14 days)
- WAU / MAU stickiness (target: >50%)
- Churn — Starter and Pro separately (target: <8% monthly)
- ARPU
- Top 3 friction points from session replay / support

**Monthly:**
- MRR + growth %
- CAC by channel
- LTV (cohort-based, build the model month 3)
- Gross margin per tier
- NPS via in-app prompt at day 14

## 11. Risks & how I'm mitigating

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **AI cost explosion** | Medium | High | Daily credit caps, Haiku-first routing, hard limits in `lib/ai/guard.ts` |
| **Chrome extension store rejection / delay** | Medium | High | Submit day 1, conservative manifest, no broad host permissions |
| **LinkedIn / Naukri break our extension** | High | Medium | Keep selectors loose, add fallback DOM scrapers, accept it'll be a maintenance tax |
| **Anthropic price hike or rate limits** | Low | High | Multi-provider abstraction already in `lib/ai/router.ts`; can fall back to OpenAI/Gemini |
| **No PMF in 90 days** | Medium | Existential | Aggressive friction audit + churn interview every cancelling user; pivot the wedge if eval isn't sticky |
| **A bigger player (Teal, Simplify) ships our loop** | Medium | High | Speed of iteration; India pricing they can't match without rebuilding billing |
| **Free tier abuse / signup spam** | Medium | Medium | Email verification + IP rate limit + 1 resume/day cap already in place |
| **Resume / CV data privacy concerns** | Medium | Medium | Clear privacy page, RLS in Supabase, no training on user data, document retention policy |

## 12. Team & spend (today)

- **Team:** Solo founder (Saksham). Maybe 1 contractor for content/SEO month 2.
- **Monthly burn (estimated):**
  - Vercel Pro: $20
  - Supabase Pro: $25
  - Anthropic API floor: $50–200 (scales with users)
  - LemonSqueezy: revenue-share, no fixed
  - Domain + email + misc: $20
  - Marketing (paid): $0 pre-PMF, then $200–500/mo for testing
  - **Total floor:** ~$120–270/mo (~₹10–22k)
- **Runway:** Personal — enough for 6 months at this burn without revenue. Goal: ₹50k MRR by month 6 to be sustainable.

## 13. 6-month financial milestones (honest, not stretch)

| Month | Free signups | Paid users | MRR (₹) | Notes |
|---|---|---|---|---|
| 1 (May) | 200 | 5–10 | 8–15k | Launch month, mostly waitlist |
| 2 (Jun) | 500 | 20–30 | 25–45k | First content cohort hits, PH bump fades |
| 3 (Jul) | 1,000 | 40–60 | 50–75k | SEO starts ranking; first churn cohort |
| 4 (Aug) | 1,800 | 70–100 | 90–130k | Monsoon hiring slowdown in India |
| 5 (Sep) | 3,000 | 120–170 | 150–220k | Hiring picks back up; campus season |
| 6 (Oct) | 4,500 | 180–250 | 220–320k | First annual upgrades land |

**Decision point at month 3:** if MRR < ₹40k *and* free→paid conversion < 2%, stop new features and run a churn/onboarding sprint instead.

**Decision point at month 6:** if MRR > ₹2 lakh, start the Team plan from `feature/monetization-llm`. If < ₹1 lakh, consider a pivot or shutting down paid acquisition.

## 14. What I'm explicitly NOT doing in v1

- Team / multi-seat plans (the code exists on `feature/monetization-llm` — revisit month 6+)
- BYOK (bring your own Anthropic/OpenAI key) — revisit month 9+
- Mobile app — extension + responsive web is enough
- Recruiter / employer side — tempting, ignore
- Fancy AI agents (autonomous apply) — guarantees regulatory + reliability headaches; the *human-in-loop apply* is the product
- Internationalization beyond INR + USD display — add EUR / GBP only if signal demands

## 15. North star metric

**Weekly active paying users who run ≥3 evaluations.**

This captures: they pay (matters), they come back (matters), they use the wedge feature (eval, the thing nobody else does well). Optimize relentlessly for this. If it's growing, almost everything else is fine.

---

*Sister doc: `ROADMAP.md` — the feature sequence and release plan that supports this business plan.*
