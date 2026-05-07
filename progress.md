# NextRole Launch — Progress

## Completed

### Tier system cleanup
- [x] `lib/ai/gates.ts` — stripped team/byok, defined Free/Starter/Pro daily limits and credit costs. Free gets 1 resume/day + 5 evaluations/day + 0 autofills. Starter/Pro use daily credits (50/200).
- [x] `lib/ai/guard.ts` — removed team credit delegation and byok bypass
- [x] `lib/ai/router.ts` — removed team from advanced model selection, removed team_members credit pool logic
- [x] `lib/db/types.ts` — added `daily_usage` table type and `increment_daily_usage` RPC; `UserTier` kept with team/byok for DB compat but not exposed in UI

### Dashboard
- [x] `components/nextrole/dashboard-shell.tsx` — **redesigned to top nav**: 56px horizontal bar with [Home, Pipeline, Evaluate, Resume, Settings] links, "Add job" button, ⌘K trigger, avatar with dropdown menu (plan info, credits bar, dark mode, sign out). Mobile bottom nav updated to match same 5 items.
- [x] `components/nextrole/billing-page.tsx` — full Plan & Credits page with usage grid, single checkout URL per plan, monthly/yearly price display toggle
- [x] `components/nextrole/command-launcher.tsx` — fixed Tier type cast
- [x] `components/nextrole/upgrade-modal.tsx` — removed team/byok tier options
- [x] `components/nextrole/onboarding-pricing.tsx` — removed Team and BYOK plan cards, fixed grid layout
- [x] `app/dashboard/layout.tsx` — simplified (removed team member credit resolution, pendingInvite)
- [x] `app/dashboard/billing/page.tsx` — queries daily_usage, passes usage to BillingPage
- [x] `app/dashboard/team/page.tsx` → redirects to /dashboard/billing
- [x] `app/dashboard/team/accept/page.tsx` → redirects to /dashboard
- [x] `app/dashboard/providers/page.tsx` → redirects to /dashboard/billing

### Pricing page
- [x] `lib/hooks/use-currency.ts` — updated INR_PRICES to Free/Starter/Pro only
- [x] `components/nextrole/pricing-client.tsx` — new "use client" component with regional currency display
- [x] `components/nextrole/public-pages.tsx` — replaced old BYOK/Team pricing with PricingCards, updated FAQ

### Extension
- [x] `extension/content/content.js` — Panel A/B flow, already-saved detection (session storage), tier-gated resume + autofill buttons, upgrade prompts
- [x] `extension/content/auto-fill.js` — tier-gated FAB (free: upgrade wall, starter: basic fields only, pro: full AI fill), `nr-autofill-trigger` event listener, `runSilentFill` for card-triggered autofill

### API routes
- [x] `app/api/extension/profile/route.ts` — returns tier, credits_remaining, today's usage counts, daily limits
- [x] `app/api/extension/resume/route.ts` — uses platform Anthropic key, free tier daily limit via daily_usage, paid tiers use deduct_credit
- [x] `app/api/extension/suggest/route.ts` — uses platform Anthropic key, Starter+ gate, deduct_credit

### Database migrations
- [x] `supabase/migrations/20260505000004_daily_usage.sql` — daily_usage table with RLS, increment_daily_usage() function
- [x] `supabase/migrations/20260505000005_daily_credits.sql` — daily credit reset (midnight), updated deduct_credit and reset_credits_for_tier functions

### Design system (from nextrole (7).zip)
- [x] `app/globals.css` — updated CSS tokens: `--line-soft` → `rgba(42,38,32,0.12)`, `--line-softer`, `--accent-soft` as rgba, `--accent-hover`, `--radius: 8px`, `.nr-stripes` utility; dark mode tokens updated
- [x] `components/nextrole/brand.tsx` — `BrandMark` accent square + white chevron SVG; `BrandWordmark` uses DM Mono (was DM Serif Display)
- [x] `components/nextrole/public-pages.tsx` — full landing page redesign: flat `PublicHeader`, 3-col `SiteFooter`, hero, how-it-works 4-step grid, 3 feature cards, social proof bar, pricing teaser, `ScoreRing` component; `PricingPage` hero updated
- [x] `components/nextrole/auth-pages.tsx` — `AuthShell` redesigned: 420px centered with stacked `BrandMark` above card; `rounded-[6px]` inputs + `border-[var(--line-soft)]`; full-width primary button; Google OAuth secondary style; bottom border-top link for alternate action
- [x] `components/nextrole/dashboard-shell.tsx` — sidebar accordion replaced with 56px top nav; `NavigationProgress`, `UpgradeModal`, dark mode, sign out, credits all preserved; mobile bottom nav simplified to 5 items
- [x] `components/nextrole/dashboard-home.tsx` — redesigned: DM Mono stat cards (4-col), setup checklist (4-item grid with check icons), section labels (01/02 style), 3 quick action cards, recent activity table with `CompanyLogo` + score/status badges
- [x] `components/nextrole/pipeline-page.tsx` — redesigned: page header with count, filter bar with status chips + search, full-width table with company logos / DM Mono dates / score pills / action buttons; keyboard j/k/e/esc preserved
- [x] `components/nextrole/evaluate-page.tsx` — redesigned: 40/60 two-column grid; left = job info card (CompanyLogo, title, source/date/comp fields, status select, notes, action buttons); right = unevaluated CTA panel (sparkle icon, "Evaluate with AI" button, cost estimate, credit note) OR evaluated result (ScoreRing SVG + DecisionBadge + `<details>` ExpandableSection cards for role fit, CV match, compensation, interview signals, legitimacy, level strategy, personalization); mode toggle preserved; ManualPanel preserved
- [x] `components/nextrole/resumes-page.tsx` — redesigned: 300px sidebar list + flex-1 preview pane; sidebar = resume cards with CompanyLogo + title + date + PDF label + active highlight; preview = header (company logo + name + "Tailored Xh ago" + Download + Edit) + scrollable PDF-style white paper preview (white 612px div with DM Mono headers); "Generate new" button opens GeneratePanel inline; ResumeDetailPageContent also redesigned with breadcrumb + clean card sections
- [x] `components/nextrole/settings-page.tsx` — redesigned: 200px sidebar nav (Profile & CV, Job preferences, Compensation, AI & Evaluation, Billing link) with active item highlight; main area = stacked SettingsCard components (border-b divider header + content); all form fields preserved with new `inputCls`/`selectCls`/`textareaCls` style constants; anchor scrolling via `scrollIntoView`

### LemonSqueezy checkout
- [x] `components/nextrole/billing-page.tsx` — replaced separate checkout URL vars with `checkoutUrl(plan, period)` function: builds `${NEXT_PUBLIC_LS_CHECKOUT_URL}?variant=${id}`; monthly/yearly toggle now routes to correct variant
- [x] `.env.local` — removed old 4 per-plan checkout URL vars; added `NEXT_PUBLIC_LS_CHECKOUT_URL` (blank, user must fill) + 4 public variant ID vars (monthly/yearly for starter/pro)

### API / gate fixes
- [x] `lib/ai/guard.ts` — **fixed launch blocker**: free-tier daily limits now actually enforced for web routes; added `FEATURE_USAGE_COL` map + `daily_usage` query; returns 429 `DAILY_LIMIT_REACHED` when limit hit

### Build
- [x] `npx tsc --noEmit` — 0 TypeScript errors ✓ (verified after evaluate/resumes/settings redesign)
- [x] `npm run build` — 0 TypeScript errors, 0 build errors ✓ (pre-redesign; re-run to confirm)
- [x] `graphify update .` — graph updated

---

## Still To Do

### Pre-launch blockers (must resolve before going live)

- [ ] **Fill in `NEXT_PUBLIC_LS_CHECKOUT_URL`** — currently blank; upgrade buttons fall back to `/pricing`. Get it from: LemonSqueezy → Products → [Product] → Share → Copy checkout link.
- [ ] **Apply DB migrations** — run `supabase db push` to apply `20260505000004_daily_usage.sql` and `20260505000005_daily_credits.sql`. Without this, the `daily_usage` table doesn't exist and all free-tier guard checks will crash.
- [ ] **Set up daily credit reset cron** — after applying migrations, enable pg_cron in Supabase Dashboard → Database → Extensions, then run in SQL editor:
  ```sql
  SELECT cron.schedule('reset-daily-credits', '0 0 * * *', 'SELECT reset_all_daily_credits()');
  ```

### Features not yet built (not blocking launch)
- [ ] **Resume direct upload (Pro)** — `resume_direct_upload` gate exists in gates.ts but the upload UI/API isn't built yet; Pro users simply won't see the feature
- [ ] **`RESEND_API_KEY` blank** — trial expiry emails won't send; nothing crashes but users get no reminder email
