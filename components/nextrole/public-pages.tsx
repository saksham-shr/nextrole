import Link from "next/link";
import { BrandWordmark, BrandMark } from "@/components/nextrole/brand";
import { PricingCards } from "@/components/nextrole/pricing-client";
import {
  Badge,
  Button,
  DataTable,
  Display,
  Eyebrow,
  MiniMetric,
  SectionTitle,
  StatCard,
  Surface,
  Timeline,
} from "@/components/nextrole/ui";
import { kpis } from "@/lib/nextrole-data";

const capabilityCards = [
  {
    title: "Evaluate roles",
    body:
      "Paste URLs or job text and score fit, compensation, risks, level, and CV alignment in one structured run.",
  },
  {
    title: "Scan portals",
    body:
      "Run saved source scans against target roles, geographies, and company preferences, then deduplicate before review.",
  },
  {
    title: "Tailor resumes",
    body:
      "Generate role-specific resume variants, HTML previews, print-friendly layouts, and PDF exports for each target role.",
  },
  {
    title: "Track applications",
    body:
      "Use tracker views, detail drawers, saved views, liveness checks, and linked artifacts per role.",
  },
  {
    title: "Prepare interviews",
    body:
      "Create round plans, story matches, likely questions, negotiation strategy, and company research packs.",
  },
  {
    title: "Improve your funnel",
    body:
      "See patterns, conversion breakdowns, source quality, archetype performance, and targeting recommendations.",
  },
] as const;

const workflowSteps = [
  [
    "1",
    "Add your CV and targets",
    "Build the base profile, seniority, compensation, and company-fit logic the system uses everywhere.",
  ],
  [
    "2",
    "Discover or paste jobs",
    "Use scanner, pipeline, batch, or one-off evaluate to capture opportunities into one workspace.",
  ],
  [
    "3",
    "Evaluate fit and risks",
    "Run structured AI evaluation, level strategy, legitimacy, and action recommendations.",
  ],
  [
    "4",
    "Generate materials",
    "Create tailored resumes, application answers, negotiation notes, and interview prep packs.",
  ],
  [
    "5",
    "Track and improve",
    "Run follow-ups, analytics, liveness checks, and targeting adjustments over time.",
  ],
] as const;

const workspaceRows = [
  [
    "Dashboard",
    "See pipeline health, urgent actions, KPIs, new opportunities, recent reports, and pattern nudges.",
  ],
  [
    "Pipeline",
    "Triage pending jobs before full evaluation, edit metadata, archive noise, and route items to batch or evaluate.",
  ],
  [
    "Tracker",
    "Manage status, notes, follow-up timing, linked reports, resume versions, interview prep, and liveness.",
  ],
  [
    "Evaluate",
    "Run a single job through the full evaluation workflow powered by NextRole AI.",
  ],
  [
    "Compare",
    "Rank evaluated jobs side by side with weighted criteria and next-step recommendations.",
  ],
  [
    "Batch",
    "Evaluate multiple jobs in parallel with progress tracking, retry, and bulk save behavior.",
  ],
  [
    "Scanner",
    "Maintain saved sources, run scans, deduplicate finds, and auto-route good jobs into the pipeline.",
  ],
  [
    "Reports",
    "Browse long-form evaluation reports and reopen them for follow-on actions like resume generation.",
  ],
  [
    "Resumes",
    "Manage tailored resumes, previews, exports, and links back to the target job.",
  ],
  [
    "CV",
    "Maintain the base CV, proof points, quantified outcomes, and content completeness checks.",
  ],
  [
    "Profile + Settings",
    "Set targeting preferences, languages, AI behavior, defaults, and account preferences.",
  ],
  [
    "Settings",
    "Manage your profile, CV, targeting preferences, and account settings.",
  ],
  [
    "Interview Prep",
    "Generate round plans, company context, question banks, and story mappings.",
  ],
  [
    "Story Bank",
    "Store, generate, refine, and reuse STAR stories across interviews and applications.",
  ],
  [
    "Apply",
    "Draft common application answers, motivation statements, compensation responses, and short-form answers.",
  ],
  [
    "Follow-up",
    "Track urgency buckets, draft messages, mark sent, and keep application timing under control.",
  ],
  [
    "Patterns",
    "Review funnel metrics, source performance, archetype trends, and strategy recommendations.",
  ],
  [
    "Deep / Contact / Training / Project / Negotiate",
    "Run specialized workflows for research, outreach, ROI analysis, portfolio ideas, and salary negotiation.",
  ],
  [
    "Prompts + Activity",
    "Save prompt templates, inspect task history, retry failed runs, and export structured data.",
  ],
] as const;

const aiModeRows = [
  [
    "NextRole AI",
    "All evaluations, resume generation, and autofill run on NextRole's hosted AI — no API keys needed.",
  ],
  [
    "Job evaluation",
    "Score role fit, identify CV gaps, surface compensation signals, and predict likely interview questions.",
  ],
  [
    "Tailored resumes",
    "Generate keyword-optimised, role-specific resume variants in seconds from your base CV.",
  ],
  [
    "Autofill",
    "Browser extension fills application forms automatically from your profile across major job portals.",
  ],
] as const;

const docsChecklist = [
  "Complete onboarding — paste your base CV and set your targeting preferences.",
  "Use Evaluate to score a role, identify gaps, and decide whether to apply.",
  "Generate a tailored resume variant for roles you want to pursue.",
  "Use the browser extension to autofill application forms in one click.",
  "Track every application in the pipeline with status, notes, and linked resumes.",
] as const;

const faqItems = [
  {
    title: "Do I need to provide my own API keys?",
    body:
      "No. NextRole AI is fully hosted — just sign up and start evaluating. No API keys or third-party accounts required.",
  },
  {
    title: "Does NextRole auto-submit applications?",
    body:
      "No. NextRole helps you evaluate roles, prepare documents, and draft answers, but final submission always stays with you.",
  },
  {
    title: "What should I set up first?",
    body:
      "Start with the onboarding flow, paste your base CV, and run your first job evaluation. The whole setup takes under 5 minutes.",
  },
] as const;

const mitNotice = `MIT License

Copyright (c) 2026 Santiago Fernandez de Valderrama

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`;

export function PublicHeader({ activePage }: { activePage?: "pricing" | "docs" } = {}) {
  return (
    <header
      className="flex items-center px-14 py-5"
      style={{ borderBottom: "1px solid var(--line-soft)" }}
    >
      <Link href="/" aria-label="NextRole home">
        <BrandWordmark size={22} />
      </Link>
      <nav className="hidden flex-1 items-center justify-center gap-7 text-[13.5px] text-[var(--muted-foreground)] md:flex">
        <Link href="/#how-it-works" className="transition hover:text-[var(--foreground)]">
          How it works
        </Link>
        <Link href="/#features" className="transition hover:text-[var(--foreground)]">
          Features
        </Link>
        <Link
          href="/pricing"
          className={`transition hover:text-[var(--foreground)] ${activePage === "pricing" ? "font-semibold text-[var(--foreground)]" : ""}`}
        >
          Pricing
        </Link>
      </nav>
      <div className="flex items-center gap-2.5">
        <span className="hidden rounded-full border border-[var(--accent)] bg-[#fcefe7] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--accent)] sm:inline-block">
          Private beta
        </span>
        <Link
          href="/login"
          className="rounded-md border px-2.5 py-1.5 text-[13px] font-medium text-[var(--muted-foreground)] transition hover:border-[var(--line)] hover:text-[var(--foreground)]"
          style={{ border: "1px solid var(--line-soft)" }}
        >
          Sign in
        </Link>
      </div>
    </header>
  );
}

function SiteFooter() {
  return (
    <footer style={{ borderTop: "1px solid var(--line-soft)", padding: "40px 56px" }}>
      <div className="mx-auto flex max-w-[1100px] items-start justify-between gap-8">
        <div>
          <BrandWordmark size={22} />
          <p className="mt-3 max-w-[280px] text-[13px] leading-[1.6] text-[var(--muted-foreground)]">
            The AI job search assistant for people who actually want to land jobs.
          </p>
        </div>
        <div className="flex gap-14 text-[13px]">
          <div>
            <p className="mb-3 font-['DM_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Product</p>
            <div className="flex flex-col gap-2 text-[var(--muted-foreground)]">
              <Link href="/#how-it-works" className="transition hover:text-[var(--foreground)]">How it works</Link>
              <Link href="/#features" className="transition hover:text-[var(--foreground)]">Features</Link>
              <Link href="/pricing" className="transition hover:text-[var(--foreground)]">Pricing</Link>
            </div>
          </div>
          <div>
            <p className="mb-3 font-['DM_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Legal</p>
            <div className="flex flex-col gap-2 text-[var(--muted-foreground)]">
              <Link href="/privacy" className="transition hover:text-[var(--foreground)]">Privacy</Link>
              <Link href="/terms" className="transition hover:text-[var(--foreground)]">Terms</Link>
            </div>
          </div>
        </div>
      </div>
      <div
        className="mx-auto mt-10 flex max-w-[1100px] items-center justify-between pt-5 text-[12px] text-[var(--muted-foreground)]"
        style={{ borderTop: "1px solid var(--line-soft)" }}
      >
        <span>© 2026 NextRole</span>
        <span className="font-['DM_Mono']">v1.0.0 · made for the next role</span>
      </div>
    </footer>
  );
}

function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <PublicHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

const landingThings = [
  {
    icon: "search",
    title: "Find good jobs",
    desc: "Tell us what you want. We help you spot the right roles.",
  },
  {
    icon: "spark",
    title: "See if it fits",
    desc: "Paste a job and get a plain-English read on whether it's worth your time.",
  },
  {
    icon: "doc",
    title: "Make your resume shine",
    desc: "We tailor your resume to each job in one click.",
  },
  {
    icon: "list",
    title: "Stay organized",
    desc: "Keep every job, follow-up, and interview in one place.",
  },
] as const;

const landingSteps = [
  {
    n: "1",
    title: "Add your CV",
    desc: "Upload a PDF or paste your resume. Takes 30 seconds.",
  },
  {
    n: "2",
    title: "Pick how AI helps",
    desc: "Use our keys, your own, or paste prompts manually.",
  },
  {
    n: "3",
    title: "Start finding jobs",
    desc: "Evaluate roles, tailor resumes, prep for interviews.",
  },
] as const;

const heroJobRows = [
  { company: "Anthropic", role: "Senior Product Designer", fit: 92, tone: "ok" },
  { company: "Linear", role: "Design Engineer", fit: 84, tone: "ok" },
  { company: "Stripe", role: "Staff Designer, Platform", fit: 71, tone: "warn" },
  { company: "Notion", role: "Senior Designer, AI", fit: 68, tone: "warn" },
] as const;

function LandingIconSearch() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
    </svg>
  );
}

function LandingIconSpark() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v4"/><path d="M12 17v4"/><path d="M3 12h4"/><path d="M17 12h4"/>
      <path d="m5.6 5.6 2.8 2.8"/><path d="m15.6 15.6 2.8 2.8"/><path d="m18.4 5.6-2.8 2.8"/><path d="m8.4 15.6-2.8 2.8"/>
    </svg>
  );
}

function LandingIconDoc() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <path d="M14 2v6h6"/>
    </svg>
  );
}

function LandingIconList() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/>
      <circle cx="3.5" cy="6" r="1"/><circle cx="3.5" cy="12" r="1"/><circle cx="3.5" cy="18" r="1"/>
    </svg>
  );
}

function LandingIconArrow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
    </svg>
  );
}

function LandingFitPill({ fit, tone }: { fit: number; tone: "ok" | "warn" }) {
  const isOk = tone === "ok";
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
      style={{
        background: isOk ? "rgba(47,122,58,0.08)" : "rgba(176,122,24,0.08)",
        border: `1px solid ${isOk ? "var(--ok)" : "var(--warn)"}`,
        color: isOk ? "var(--ok)" : "var(--warn)",
      }}
    >
      {fit}% fit
    </span>
  );
}

function LandingThingIcon({ icon }: { icon: string }) {
  switch (icon) {
    case "search": return <LandingIconSearch />;
    case "spark": return <LandingIconSpark />;
    case "doc": return <LandingIconDoc />;
    case "list": return <LandingIconList />;
    default: return null;
  }
}

function ScoreRing({ value = 4.2, size = 110 }: { value?: number; size?: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const pct = value / 5;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-softer)" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--accent)" strokeWidth="6"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div className="font-['DM_Mono']" style={{ fontSize: 28, fontWeight: 500, lineHeight: 1 }}>{value}</div>
        <div className="font-['DM_Mono'] text-[9px] uppercase tracking-[0.12em]" style={{ marginTop: 4, color: "var(--muted-foreground)" }}>FIT / 5</div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="min-h-screen text-[var(--foreground)]" style={{ background: "var(--background)" }}>
      {/* ── Header ── */}
      <PublicHeader />

      {/* ── Hero ── */}
      <section style={{ padding: "88px 56px 64px", maxWidth: 1100, margin: "0 auto" }}>
        <p
          className="font-['DM_Mono'] text-[11px] uppercase tracking-[0.12em]"
          style={{ marginBottom: 24, color: "var(--accent)" }}
        >
          · AI Job Search Assistant
        </p>

        <h1
          style={{
            fontSize: 64,
            lineHeight: 1.02,
            letterSpacing: "-0.025em",
            maxWidth: 880,
            marginBottom: 24,
            fontWeight: 600,
          }}
        >
          Land jobs faster
          <br />
          with AI.
        </h1>
        <p
          style={{
            fontSize: 18,
            color: "var(--muted-foreground)",
            maxWidth: 580,
            marginBottom: 36,
            lineHeight: 1.55,
          }}
        >
          Detect jobs as you browse, evaluate fit instantly, autofill applications, and tailor your resume — all in one flow.
        </p>
        <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 rounded-md px-[22px] py-[14px] text-[15px] font-medium text-[#fffdf8] transition hover:opacity-90"
            style={{ background: "var(--accent)" }}
          >
            Get started free
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
          </Link>
          <Link
            href="/#how-it-works"
            className="inline-flex items-center gap-2 rounded-md border px-[22px] py-[14px] text-[15px] font-medium transition hover:border-[var(--line)]"
            style={{ border: "1px solid var(--line-soft)" }}
          >
            See how it works
          </Link>
        </div>
        <div className="flex items-center gap-2.5" style={{ color: "var(--muted-foreground)", fontSize: 13 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
          Free forever — no card required. Upgrade for daily AI credits.
        </div>
      </section>

      {/* ── Hero visual ── */}
      <section style={{ padding: "0 56px 80px", maxWidth: 1100, margin: "0 auto" }}>
        {/* Browser mock + extension card */}
        <div className="overflow-hidden rounded-lg" style={{ border: "1px solid var(--line-soft)", background: "var(--surface)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", minHeight: 360 }}>
            {/* Left: browser mock */}
            <div className="nr-stripes" style={{ borderRight: "1px solid var(--line-soft)", padding: 24, position: "relative" }}>
              <div style={{ display: "flex", gap: 6, marginBottom: 20 }}>
                {["rgba(42,38,32,0.15)", "rgba(42,38,32,0.15)", "rgba(42,38,32,0.15)"].map((c, i) => (
                  <span key={i} style={{ width: 9, height: 9, borderRadius: "50%", background: c, display: "inline-block" }} />
                ))}
                <div style={{ marginLeft: 10, padding: "3px 10px", background: "var(--background)", borderRadius: 4, fontSize: 11, fontFamily: "DM Mono, monospace", color: "var(--muted-foreground)" }}>
                  jobs.example.com/senior-engineer
                </div>
              </div>
              <div style={{ background: "var(--surface)", borderRadius: 6, padding: 28, height: 230, border: "1px solid var(--line-soft)" }}>
                {[[200, 14], [140, 10, 24], [0, 8], [0, 8], [0, 8]].map(([w, h, mb], i) => (
                  <div key={i} style={{ width: w || "90%", height: h, background: "var(--line-softer)", borderRadius: 3, marginBottom: mb ?? 8 }} />
                ))}
              </div>
            </div>
            {/* Right: extension card */}
            <div style={{ padding: 32, display: "flex", flexDirection: "column", justifyContent: "center", background: "var(--surface)" }}>
              <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--line-soft)", boxShadow: "0 8px 24px rgba(42,38,32,0.08)" }}>
                <div style={{ background: "var(--accent)", color: "var(--surface)", padding: "10px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div className="flex items-center gap-2 font-['DM_Mono'] text-[12px] uppercase tracking-[0.06em]">
                    <BrandMark size={16} />
                    Job Detected
                  </div>
                  <span style={{ opacity: 0.7, fontSize: 14 }}>×</span>
                </div>
                <div style={{ padding: 16 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>Senior Backend Engineer</div>
                  <div style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 16 }}>Stripe · Remote</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "var(--background)", borderRadius: 5, marginBottom: 14 }}>
                    <span className="inline-flex items-center justify-center font-['DM_Mono'] font-medium text-[12px]" style={{ width: 26, height: 22, borderRadius: 4, background: "var(--ok-bg)", color: "var(--ok)", border: "1px solid rgba(47,122,58,0.2)" }}>4</span>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 500 }}>Strong fit</div>
                      <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>4.2/5 · CV match 87%</div>
                    </div>
                  </div>
                  <Link href="/signup" className="flex items-center justify-center rounded-md text-[13px] font-medium text-[#fffdf8] transition hover:opacity-90" style={{ width: "100%", padding: "8px 12px", marginBottom: 6, background: "var(--accent)" }}>
                    + Add to pipeline
                  </Link>
                  <Link href="/signup" className="flex items-center justify-center rounded-md text-[13px] font-medium transition hover:border-[var(--line)]" style={{ width: "100%", padding: "6px 10px", border: "1px solid var(--line-soft)" }}>
                    Evaluate
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ padding: "64px 56px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 16 }}>
          <span className="font-['DM_Mono'] text-[11px]" style={{ color: "var(--muted-foreground)" }}>01</span>
          <span className="font-['DM_Mono'] text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--muted-foreground)" }}>How it works</span>
          <div style={{ flex: 1, height: 1, background: "var(--line-soft)" }} />
        </div>
        <h2 style={{ fontSize: 32, letterSpacing: "-0.02em", marginBottom: 48, maxWidth: 600, fontWeight: 600 }}>
          From browsing to applied in four steps.
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 1, background: "var(--line-soft)", border: "1px solid var(--line-soft)", borderRadius: 8, overflow: "hidden" }}>
          {[
            { n: "01", icon: "M5 5h6V3a2 2 0 0 1 4 0v2h4a2 2 0 0 1 2 2v4h-2a2 2 0 0 0 0 4h2v4a2 2 0 0 1-2 2h-4v-2a2 2 0 0 0-4 0v2H5a2 2 0 0 1-2-2v-4h2a2 2 0 0 0 0-4H3V7a2 2 0 0 1 2-2z", t: "Install extension", d: "Add NextRole to Chrome in one click." },
            { n: "02", icon: "M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9 9-4.03 9-9c0-.46-.04-.92-.1-1.36M21 3l-3 3m0 0l-3-3m3 3v7", t: "Browse normally", d: "A card pops up the moment we detect a job posting." },
            { n: "03", icon: "M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8", t: "AI scores fit", d: "Get a 1—5 fit score with reasoning before you apply." },
            { n: "04", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M9 13h6M9 17h4", t: "Tailor & apply", d: "Generate a tailored resume and autofill in seconds." },
          ].map((s) => (
            <div key={s.n} style={{ background: "var(--surface)", padding: 28, display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ width: 38, height: 38, borderRadius: 6, background: "var(--accent-soft)", color: "var(--accent)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.icon} />
                  </svg>
                </div>
                <span className="font-['DM_Mono'] text-[11px]" style={{ color: "var(--muted-foreground)" }}>{s.n}</span>
              </div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{s.t}</div>
              <div style={{ fontSize: 13, color: "var(--muted-foreground)", lineHeight: 1.55 }}>{s.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: "32px 56px 80px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 32 }}>
          <span className="font-['DM_Mono'] text-[11px]" style={{ color: "var(--muted-foreground)" }}>02</span>
          <span className="font-['DM_Mono'] text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--muted-foreground)" }}>Features</span>
          <div style={{ flex: 1, height: 1, background: "var(--line-soft)" }} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
          {[
            {
              preview: (
                <div style={{ padding: 12 }}>
                  <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
                    <BrandMark size={14} />
                    <span className="font-['DM_Mono'] text-[10px] uppercase tracking-[0.08em]" style={{ color: "var(--accent)" }}>Job detected</span>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>Product Designer</div>
                  <div style={{ fontSize: 11, color: "var(--muted-foreground)" }}>Linear · San Francisco</div>
                </div>
              ),
              title: "Job detection",
              body: "Works on every major board. The card appears the moment a posting loads — no clicks, no copy-paste.",
            },
            {
              preview: (
                <div className="flex items-center justify-center" style={{ padding: 24 }}>
                  <ScoreRing value={4.2} size={110} />
                </div>
              ),
              title: "AI evaluation",
              body: "Score, decision, role-fit summary, CV gaps, comp signals — all in one pass.",
            },
            {
              preview: (
                <div style={{ padding: "16px 16px 0" }}>
                  <div style={{ padding: 12, borderRadius: 6, border: "1px solid var(--line-soft)", background: "var(--surface)" }}>
                    {[[60], [90], [85], [70]].map(([w], i) => (
                      <div key={i} style={{ height: i === 0 ? 8 : 6, width: `${w}%`, background: i === 3 ? "var(--accent-soft)" : "var(--line-softer)", borderRadius: 2, marginBottom: i < 3 ? (i === 0 ? 8 : 5) : 0 }} />
                    ))}
                  </div>
                </div>
              ),
              title: "Resume tailoring",
              body: "Generates a job-specific resume in your voice — keywords, ordering, emphasis tuned to the role.",
            },
          ].map((f) => (
            <div key={f.title} className="overflow-hidden rounded-lg" style={{ border: "1px solid var(--line-soft)" }}>
              <div className="nr-stripes" style={{ height: 180, display: "flex", alignItems: "flex-end", borderBottom: "1px solid var(--line-soft)" }}>
                <div className="w-full rounded-md overflow-hidden" style={{ margin: "0 16px 16px", background: "var(--surface)", border: "1px solid var(--line-soft)" }}>
                  {f.preview}
                </div>
              </div>
              <div style={{ padding: 20 }}>
                <div style={{ fontWeight: 600, marginBottom: 6 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "var(--muted-foreground)" }}>{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Social proof ── */}
      <div style={{ padding: "40px 56px", borderTop: "1px solid var(--line-soft)", borderBottom: "1px solid var(--line-soft)" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap", justifyContent: "center" }}>
          <span className="font-['DM_Mono'] text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--muted-foreground)" }}>Works on</span>
          {["LinkedIn", "Indeed", "Naukri", "Greenhouse", "Lever", "Wellfound", "Ashby", "YC Work"].map((b) => (
            <span key={b} className="font-['DM_Mono']" style={{ fontSize: 14, color: "var(--muted-foreground)" }}>{b}</span>
          ))}
        </div>
      </div>

      {/* ── Pricing teaser ── */}
      <section style={{ padding: "80px 56px", maxWidth: 1100, margin: "0 auto" }}>
        <div className="flex items-center gap-2.5" style={{ marginBottom: 16 }}>
          <span className="font-['DM_Mono'] text-[11px]" style={{ color: "var(--muted-foreground)" }}>03</span>
          <span className="font-['DM_Mono'] text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--muted-foreground)" }}>Pricing</span>
          <div style={{ flex: 1, height: 1, background: "var(--line-soft)" }} />
        </div>
        <h2 style={{ fontSize: 32, letterSpacing: "-0.02em", marginBottom: 36, fontWeight: 600 }}>Three plans. Pay for what you use.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
          {[
            { name: "Free", price: "$0", sub: "per month", items: ["5 evaluations / day", "1 custom resume / day", "Unlimited saved jobs", "Browser extension"] },
            { name: "Starter", price: "$9", sub: "per month", items: ["Everything in Free", "50 daily credits", "1 autofill / day · basic fields", "Refresh at midnight"] },
            { name: "Pro", price: "$19", sub: "per month", recommended: true, items: ["Everything in Starter", "200 daily credits", "Unlimited autofill, all fields", "Direct resume upload to forms"] },
          ].map((p) => (
            <div key={p.name} className="rounded-lg" style={{ padding: 28, border: `1px solid ${p.recommended ? "var(--line)" : "var(--line-soft)"}`, background: "var(--surface)", position: "relative" }}>
              {p.recommended && (
                <div style={{ position: "absolute", top: -10, right: 20, background: "var(--accent)", color: "var(--surface)", padding: "3px 10px", borderRadius: 4, fontSize: 10, fontFamily: "DM Mono, monospace", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                  Recommended
                </div>
              )}
              <p className="font-['DM_Mono'] text-[11px] uppercase tracking-[0.12em]" style={{ color: p.recommended ? "var(--accent)" : "var(--muted-foreground)" }}>{p.name}</p>
              <div className="font-['DM_Mono']" style={{ fontSize: 32, fontWeight: 500, margin: "14px 0 4px" }}>{p.price}</div>
              <div style={{ color: "var(--muted-foreground)", fontSize: 13, marginBottom: 20 }}>{p.sub}</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13.5 }}>
                {p.items.map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7"/></svg>
                    {item}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 28, textAlign: "center" }}>
          <Link href="/pricing" className="text-[13.5px] font-medium transition hover:opacity-70" style={{ color: "var(--accent)" }}>
            See full pricing details →
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <SiteFooter />
    </div>
  );
}


export function DocumentationPage() {
  return (
    <MarketingShell>
      <section className="border-b border-[var(--line)] px-6 py-8 lg:px-10 lg:py-12">
        <Badge tone="accent" className="mb-5">
          Product documentation
        </Badge>
        <Display>Everything NextRole can do.</Display>
        <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
          This guide covers setup, everyday workflows, AI execution modes,
          workspace pages, outputs, and the open-source attribution used in the
          product foundation.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/signup" tone="accent">
            Start free setup
          </Button>
          <Button href="/dashboard">Open dashboard</Button>
        </div>
      </section>

      <section className="grid gap-6 px-6 py-8 lg:grid-cols-[1.2fr_0.8fr] lg:px-10">
        <Surface className="p-5">
          <SectionTitle
            title="Getting started"
            subtitle="Recommended first-run path"
          />
          <Timeline
            items={docsChecklist.map((item, index) => ({
              title: `Step ${index + 1}`,
              subtitle: item,
            }))}
          />
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle
            title="AI execution modes"
            subtitle="Choose the workflow that fits your setup"
          />
          <DataTable
            columns={["Mode", "What it means"]}
            rows={aiModeRows.map(([mode, description]) => [mode, description])}
          />
        </Surface>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] px-6 py-8 lg:px-10">
        <SectionTitle
          title="Core product workflow"
          subtitle="How the system is meant to be used end to end"
        />
        <div className="grid gap-4 lg:grid-cols-5">
          {workflowSteps.map(([step, title, body]) => (
            <Surface key={step} className="p-5">
              <Eyebrow>{`Step ${step}`}</Eyebrow>
              <h3 className="mt-3 text-lg font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                {body}
              </p>
            </Surface>
          ))}
        </div>
      </section>

      <section className="px-6 py-8 lg:px-10">
        <SectionTitle
          title="Workspace map"
          subtitle="What each page is for"
        />
        <DataTable
          columns={["Area", "What you can do there"]}
          rows={workspaceRows.map(([area, description]) => [area, description])}
        />
      </section>

      <section className="grid gap-6 border-y border-[var(--line)] bg-[var(--surface-soft)] px-6 py-8 lg:grid-cols-2 lg:px-10">
        <Surface className="p-5">
          <SectionTitle
            title="What you can do inside NextRole"
            subtitle="Full candidate workflow coverage"
          />
          <div className="flex flex-wrap gap-2">
            {["Job evaluation", "Pipeline tracking", "Resume tailoring", "CV management", "Browser extension", "AI scoring"].map((feature) => (
              <Badge key={feature}>{feature}</Badge>
            ))}
          </div>
        </Surface>
        <Surface className="p-5">
          <SectionTitle
            title="Best practices"
            subtitle="Keep the system useful over time"
          />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>
              Save every serious opportunity into Tracker so the downstream
              artifacts stay linked to the job.
            </p>
            <p>
              Use Profile and CV early. Better source data improves evaluation,
              resume tailoring, interview prep, and pattern analysis.
            </p>
            <p>
              Check Follow-up, Activity, and Patterns weekly so the app can help
              you maintain momentum instead of just producing one-off outputs.
            </p>
          </div>
        </Surface>
      </section>

      <section className="grid gap-6 px-6 py-8 lg:grid-cols-3 lg:px-10">
        <MiniMetric label="Setup path" value="Onboarding -> Profile -> Provider -> First evaluation" />
        <MiniMetric label="Primary hub" value="Tracker keeps reports, resumes, prep, and follow-up connected" />
        <MiniMetric label="Manual mode" value="Prompt export, paste back, validate, continue workflow" />
      </section>

      <section className="border-t border-[var(--line)] px-6 py-8 lg:px-10">
        <SectionTitle
          title="Open-source attribution"
          subtitle="Career Ops MIT license notice"
        />
        <Surface className="p-5">
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">
            NextRole incorporates ideas and adapted software derived from the
            MIT-licensed Career Ops project. The following notice is included to
            satisfy the license requirement for copies or substantial portions of
            that software.
          </p>
          <pre className="mt-5 overflow-x-auto whitespace-pre-wrap rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] p-4 text-xs leading-6 text-[var(--foreground)]">
            {mitNotice}
          </pre>
        </Surface>
      </section>
    </MarketingShell>
  );
}

export function PrivacyPage() {
  return (
    <MarketingShell>
      <section className="border-b border-[var(--line)] px-6 py-8 lg:px-10 lg:py-12">
        <Badge tone="accent" className="mb-5">Privacy policy</Badge>
        <Display>How NextRole handles your data.</Display>
        <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
          Last updated May 2026. This page explains what information NextRole stores,
          how it is used, and what controls you have over your data.
        </p>
      </section>

      <section className="grid gap-6 px-6 py-8 lg:grid-cols-2 lg:px-10">
        <Surface className="p-5">
          <SectionTitle title="Information we collect" subtitle="Core account and usage data" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>Your email address and authentication records when you create an account.</p>
            <p>CV or resume text you upload or paste, used solely to power AI evaluations and tailored resume generation.</p>
            <p>Jobs you save, application statuses, AI evaluation outputs, and generated resume content.</p>
            <p>Usage metadata — credit consumption, feature usage counts — for billing and quota enforcement.</p>
            <p>Payment information is processed entirely by Lemon Squeezy. NextRole never sees or stores card details.</p>
          </div>
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle title="How we use your data" subtitle="To run the product, nothing else" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>To run AI job evaluations, generate tailored resumes, and power autofill — your CV and job text are processed by NextRole AI on your behalf.</p>
            <p>To track your daily credit usage and enforce plan limits.</p>
            <p>To send transactional emails related to billing (via Resend). We do not send marketing emails without consent.</p>
            <p>We do not sell, rent, or share your personal data or job search data with third parties for advertising.</p>
          </div>
        </Surface>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] px-6 py-8 lg:px-10">
        <SectionTitle title="Third-party services" subtitle="Services that process data on our behalf" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Surface className="p-5">
            <h3 className="text-lg font-bold">Supabase</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              Hosts our database and handles authentication. Your account data and
              job pipeline are stored in Supabase's infrastructure.
            </p>
          </Surface>
          <Surface className="p-5">
            <h3 className="text-lg font-bold">OpenRouter</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              Powers NextRole AI. When you run an evaluation or generate a resume,
              your CV context and job text are routed through OpenRouter's API to
              process your request. No data is stored by OpenRouter beyond the request.
            </p>
          </Surface>
          <Surface className="p-5">
            <h3 className="text-lg font-bold">Lemon Squeezy</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              Handles all subscription billing and payment processing. NextRole
              receives only subscription status and email — never card details.
            </p>
          </Surface>
        </div>
      </section>

      <section className="grid gap-6 px-6 py-8 lg:grid-cols-2 lg:px-10">
        <Surface className="p-5">
          <SectionTitle title="Your controls" subtitle="What you can manage" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>You can update or delete your CV, job data, and account from Settings at any time.</p>
            <p>You can cancel your subscription at any time via the billing portal — access continues until the end of the billing period.</p>
            <p>To request full account deletion, contact us at privacy@nextrole.live.</p>
          </div>
        </Surface>
        <Surface className="p-5">
          <SectionTitle title="Security" subtitle="How we protect your data" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>All data is encrypted in transit via HTTPS. Supabase encrypts data at rest.</p>
            <p>API keys and sensitive credentials are stored encrypted and only used server-side.</p>
            <p>No internet-facing system can guarantee absolute security. Please don't store information in NextRole you wouldn't want processed by the above services.</p>
          </div>
        </Surface>
      </section>
    </MarketingShell>
  );
}

export function TermsPage() {
  return (
    <MarketingShell>
      <section className="border-b border-[var(--line)] px-6 py-8 lg:px-10 lg:py-12">
        <Badge tone="accent" className="mb-5">Terms of use</Badge>
        <Display>The rules for using NextRole.</Display>
        <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
          Last updated May 2026. By using NextRole you agree to these terms.
          Please read them before creating an account.
        </p>
      </section>

      <section className="grid gap-6 px-6 py-8 lg:grid-cols-2 lg:px-10">
        <Surface className="p-5">
          <SectionTitle title="What NextRole is" subtitle="An AI-powered job search assistant" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>NextRole helps you evaluate job postings, generate tailored resumes, track applications, and autofill application forms — all powered by AI.</p>
            <p>The product provides AI-generated recommendations and content. You remain responsible for reviewing everything before submitting it to employers.</p>
          </div>
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle title="Acceptable use" subtitle="Use the tool responsibly" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>You must be 18 or older to use NextRole. You're responsible for keeping your login credentials secure.</p>
            <p>Don't use NextRole to submit false or misleading information to employers, scrape third-party job platforms in violation of their terms, or abuse the credit system.</p>
            <p>One account per person. Sharing accounts or reselling access is not permitted.</p>
          </div>
        </Surface>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] px-6 py-8 lg:px-10">
        <SectionTitle title="Billing and subscriptions" subtitle="How plans and credits work" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Surface className="p-5">
            <h3 className="text-lg font-bold">Subscriptions</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              Paid plans renew automatically. You can cancel at any time — access
              continues until the end of the current billing period. No refunds for
              partial periods.
            </p>
          </Surface>
          <Surface className="p-5">
            <h3 className="text-lg font-bold">Daily credits</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              Credits reset at midnight UTC every day and do not roll over. Unused
              daily credits are forfeited. Top-up credits expire when your
              subscription renews or ends.
            </p>
          </Surface>
          <Surface className="p-5">
            <h3 className="text-lg font-bold">Refunds</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              Top-up credit packs are non-refundable once credits have been consumed.
              For billing issues contact billing@nextrole.live within 7 days of
              the charge.
            </p>
          </Surface>
        </div>
      </section>

      <section className="grid gap-6 px-6 py-8 lg:grid-cols-2 lg:px-10">
        <Surface className="p-5">
          <SectionTitle title="AI output disclaimer" subtitle="Review before you use" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>NextRole does not guarantee the accuracy, completeness, or fitness of any AI-generated output — including resumes, evaluations, and autofill suggestions.</p>
            <p>Always review generated content before submitting it. NextRole is not liable for outcomes resulting from reliance on AI outputs.</p>
          </div>
        </Surface>
        <Surface className="p-5">
          <SectionTitle title="Warranty and liability" subtitle="Service provided as-is" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>NextRole is provided on an as-available basis. We do not guarantee uninterrupted service, and we may update or discontinue features with reasonable notice.</p>
            <p>To the fullest extent permitted by law, NextRole's liability is limited to the amount you paid in the 3 months prior to any claim.</p>
          </div>
        </Surface>
      </section>
    </MarketingShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Pricing page
// ─────────────────────────────────────────────────────────────────────────────

function CheckIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-[2px] shrink-0">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function PricingPage() {
  return (
    <div className="min-h-screen text-[var(--foreground)]" style={{ background: "var(--background)" }}>
      <PublicHeader activePage="pricing" />

      {/* Hero */}
      <section className="px-14 pb-16 pt-[72px] text-center" style={{ maxWidth: 1100, margin: "0 auto" }}>
        <p className="font-['DM_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--accent)]" style={{ marginBottom: 16 }}>· Pricing</p>
        <h1 className="mx-auto max-w-[720px] font-semibold leading-[1.05] tracking-[-0.025em]" style={{ fontSize: 48, marginBottom: 16 }}>
          Three plans.<br />One that fits your search.
        </h1>
        <p className="mx-auto max-w-[500px] text-[17px] leading-[1.6] text-[var(--muted-foreground)]">
          Start free. Add daily credits and autofill when you&apos;re ready to apply faster.
        </p>
      </section>

      {/* Plans grid */}
      <section className="mx-auto max-w-[1100px] px-6 pb-16 sm:px-14">
        <PricingCards />

        {/* Credits explainer */}
        <div className="mt-10 rounded-lg bg-[var(--surface)] px-8 py-7" style={{ border: "1px solid var(--line-soft)" }}>
          <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
            <div>
              <p className="font-['DM_Mono'] text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">How credits work</p>
              <p className="mt-2 text-[22px] font-semibold leading-[1.2] tracking-[-0.01em]">Daily credits, reset every night</p>
            </div>
            <div className="space-y-3 text-[14px] leading-[1.65] text-[var(--muted-foreground)]">
              <p>
                Starter and Pro plans include a credit balance that resets at midnight UTC every day. Spend credits on AI job evaluations (5 credits each) and tailored resumes (10 credits each). Premium resumes cost 25 credits and are available on Pro only.
              </p>
              <p>
                Unused credits do not roll over to the next day. Pro users can buy top-up packs for extra credits that last until their subscription renews.
              </p>
            </div>
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="mt-10 overflow-hidden rounded-2xl border border-[var(--line-soft)]">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[var(--line-soft)] bg-[var(--surface)]">
                <th className="px-6 py-4 text-left font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Feature</th>
                {(["Free", "Starter", "Pro"] as const).map((p) => (
                  <th key={p} className="px-4 py-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">{p}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                ["Job pipeline",          "5 slots",  "25 slots",   "Unlimited"],
                ["Browser extension",     "✓",        "✓",          "✓"],
                ["AI job evaluation",     "5 / day",  "5 credits",  "5 credits"],
                ["Tailored resume",       "1 / day",  "10 credits", "10 credits"],
                ["Premium resume",        "—",        "—",          "25 credits"],
                ["Daily credits",         "—",        "100 / day",  "300 / day"],
                ["Autofill",              "—",        "1 / day",    "Unlimited"],
                ["Credit top-ups",        "—",        "—",          "✓"],
              ].map(([feature, free, starter, pro]) => (
                <tr key={feature} className="border-b border-[var(--line-soft)] last:border-0">
                  <td className="px-6 py-3.5 font-medium">{feature}</td>
                  {[free, starter, pro].map((val, i) => (
                    <td key={i} className="px-4 py-3.5 text-center text-[var(--muted-foreground)]">
                      {val === "✓" ? (
                        <span className="inline-flex justify-center"><CheckIcon /></span>
                      ) : val === "—" ? (
                        <span className="opacity-30">—</span>
                      ) : (
                        <span className="font-mono text-[12px]">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* FAQ */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["Do unused credits roll over?", "No. Daily credits reset at midnight UTC every day. They're designed to give you a consistent daily budget, not to accumulate."],
            ["What are credit top-ups?", "Pro users can buy extra credit packs (100–2,000 credits) on top of the daily 300. Top-up credits are added instantly and last until your subscription renews."],
            ["Can I cancel any time?", "Yes. Cancel at any time and your plan stays active until the end of the billing period. No long-term commitment required."],
          ].map(([q, a]) => (
            <div key={q} className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
              <p className="text-[14px] font-semibold leading-[1.4]">{q}</p>
              <p className="mt-2 text-[13px] leading-[1.65] text-[var(--muted-foreground)]">{a}</p>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
