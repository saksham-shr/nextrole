import Link from "next/link";
import { BrandWordmark } from "@/components/nextrole/brand";
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
import { kpis, repoParity } from "@/lib/nextrole-data";

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
    "Run a single job through the full evaluation workflow using Anthropic, OpenAI, Gemini, or manual mode.",
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
    "Providers",
    "Connect Anthropic, OpenAI, Gemini, or run in manual prompt mode with validation.",
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
    "Anthropic API",
    "Run fully automated evaluations and downstream workflows inside NextRole using the user provided Anthropic API key.",
  ],
  [
    "OpenAI API",
    "Run the same workflows with the user provided OpenAI API key and chosen model defaults.",
  ],
  [
    "Gemini API",
    "Use Gemini as an additional automated provider for evaluation and related workflows.",
  ],
  [
    "Manual Chat Mode",
    "Generate prompts, paste results back in, validate structure, and continue the workflow without API credits.",
  ],
] as const;

const docsChecklist = [
  "Complete onboarding with CV, targeting profile, and provider setup.",
  "Choose whether you want API mode or manual prompt mode by default.",
  "Use Evaluate for one role, Batch for many roles, or Scanner to discover new roles.",
  "Save strong results into Tracker so reports, resumes, follow-up, and prep stay connected.",
  "Use Patterns, Follow-up, and Activity regularly to keep the search healthy over time.",
] as const;

const faqItems = [
  {
    title: "Can I use Claude Pro or ChatGPT Plus without API credits?",
    body:
      "Yes. Manual mode generates the prompt package for you, then validates the pasted result so the rest of the workflow can continue inside NextRole.",
  },
  {
    title: "Does NextRole auto-submit applications?",
    body:
      "No. NextRole helps you evaluate roles, prepare documents, and draft answers, but final submission always stays with you.",
  },
  {
    title: "What should I set up first?",
    body:
      "Start with the onboarding flow, paste your base CV, add targeting preferences, and connect at least one provider or enable manual mode.",
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
    <header className="flex items-center justify-between border-b border-[var(--line-soft)] px-8 py-[22px] sm:px-12">
      <Link href="/" aria-label="NextRole home">
        <BrandWordmark />
      </Link>
      <nav className="hidden items-center gap-7 text-[13.5px] text-[var(--muted-foreground)] md:flex">
        <Link href="/#what-you-get" className="transition hover:text-[var(--foreground)]">
          Product
        </Link>
        <Link
          href="/pricing"
          className={`transition hover:text-[var(--foreground)] ${activePage === "pricing" ? "font-semibold text-[var(--foreground)]" : ""}`}
        >
          Pricing
        </Link>
        <Link
          href="/documentation"
          className={`transition hover:text-[var(--foreground)] ${activePage === "docs" ? "font-semibold text-[var(--foreground)]" : ""}`}
        >
          Docs
        </Link>
        <Link href="/login" className="transition hover:text-[var(--foreground)]">
          Sign in
        </Link>
        <Button href="/signup" tone="accent">
          Get started
        </Button>
      </nav>
      <div className="flex items-center gap-3 md:hidden">
        <Button href="/login" ghost>Log in</Button>
        <Button href="/signup" tone="accent">Get started</Button>
      </div>
    </header>
  );
}

function SiteHeader() {
  return <PublicHeader />;
}

function SiteFooter() {
  return (
    <footer className="border-t border-[var(--line)] px-6 py-6 lg:px-10">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-2xl">
          <p className="text-sm font-bold text-[var(--foreground)]">NextRole</p>
          <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
            A candidate-first job search operating system for evaluation,
            resumes, tracking, interview preparation, follow-up, and
            performance improvement.
          </p>
          <p className="mt-3 text-xs leading-6 text-[var(--muted-foreground)]">
            Built for candidates who want one serious workspace for evaluation,
            resumes, application tracking, interview prep, and search
            improvement loops.
          </p>
        </div>
        <div className="flex flex-wrap gap-3 text-sm font-bold text-[var(--muted-foreground)]">
          <Link href="/documentation">Documentation</Link>
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          <Link href="/login">Log in</Link>
        </div>
      </div>
    </footer>
  );
}

function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <Surface className="overflow-hidden">
        <SiteHeader />
        {children}
        <SiteFooter />
      </Surface>
    </main>
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

export function LandingPage() {
  return (
    <div
      className="min-h-screen text-[var(--foreground)]"
      style={{
        background: `radial-gradient(rgba(0,0,0,0.025) 1px, transparent 1px), var(--background)`,
        backgroundSize: "6px 6px, auto",
        fontFamily: "Inter, Trebuchet MS, Segoe UI, sans-serif",
      }}
    >
      {/* ── Header ── */}
      <PublicHeader />

      {/* ── Hero ── */}
      <section className="px-12 pb-24 pt-[120px] text-center">
        {/* trial pill */}
        <span
          className="mb-7 inline-flex items-center gap-2 rounded-full border px-3 py-1 font-mono text-[10px] uppercase tracking-[0.18em]"
          style={{
            background: "rgba(200,74,31,0.08)",
            border: "1px solid var(--accent)",
            color: "var(--accent)",
          }}
        >
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
          14-day free trial · no card
        </span>

        <h1
          className="mx-auto max-w-[1100px] text-[clamp(56px,9vw,96px)] font-normal leading-[0.96] tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Job hunting,
          <br />
          <span className="italic text-[var(--accent)]">finally simple.</span>
        </h1>

        <p className="mx-auto mt-7 max-w-[640px] text-[22px] leading-[1.45] text-[var(--muted-foreground)]">
          Paste any job, get a fit score, have your resume rewritten for it, prep for the interview, and apply — all without switching tabs.
        </p>

        <div className="mt-11 inline-flex gap-3.5">
          <Button href="/signup" tone="accent">
            <span>Start free</span>
            <LandingIconArrow />
          </Button>
        </div>

        {/* Dashboard preview card */}
        <div className="mx-auto mt-20 max-w-[980px] text-left">
          <div
            className="overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-7"
            style={{ boxShadow: "2px 3px 0 rgba(26,24,20,0.08)" }}
          >
            <div className="grid grid-cols-[240px_1fr] gap-6">
              {/* Left: metrics sidebar */}
              <div className="rounded-2xl bg-[var(--surface-soft)] p-[18px]">
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Today</span>
                <p
                  className="mt-2 text-[38px] leading-none"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  12
                </p>
                <p className="mt-1.5 text-[13px] text-[var(--muted-foreground)]">new roles to review</p>
                <div className="my-5 h-px bg-[var(--line-soft)]" />
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Pipeline</span>
                {["In review · 8", "Applied · 23", "Interviewing · 4"].map((s) => (
                  <p key={s} className="mt-2.5 text-[13px] text-[var(--foreground)]">{s}</p>
                ))}
              </div>
              {/* Right: job rows */}
              <div className="flex flex-col gap-3">
                {heroJobRows.map((j) => (
                  <div
                    key={j.role}
                    className="grid items-center gap-4 rounded-2xl border border-[var(--line-soft)] bg-[var(--background)] px-[18px] py-4"
                    style={{ gridTemplateColumns: "1fr auto auto" }}
                  >
                    <div>
                      <p className="text-[14px] font-semibold">{j.role}</p>
                      <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">{j.company}</p>
                    </div>
                    <LandingFitPill fit={j.fit} tone={j.tone} />
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground-2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
                    </svg>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Plain-English walkthrough ── */}
      <section className="mx-auto max-w-[1200px] px-8 pb-24 pt-12 sm:px-12">
        <div className="mb-14 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
            How it works
          </span>
          <h2
            className="mt-3 text-[clamp(36px,5vw,56px)] font-normal tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Here's exactly what happens.
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[17px] leading-[1.6] text-[var(--muted-foreground)]">
            No jargon. No spreadsheets. Just a clear path from "I saw a job" to "I got the offer."
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {([
            ["🔍", "You spot a job",            "Paste a link or the job description. We detect the role, company, and everything automatically. Or save it in one click with our Chrome extension."],
            ["📊", "We score the fit",           "You get a plain-English match score. Good fit, bad fit, and exactly why. No more wasting time on roles that were never right for you."],
            ["📄", "Your resume, rewritten",     "One click rewrites your resume to match that specific role. Every application gets its own version — without you rewriting a single word."],
            ["💬", "Prep for the interview",     "Get the questions they'll probably ask, sample answers based on your own experience, and a company research pack so you show up ready."],
            ["⚡", "Apply in one click",          "Open the application page. Our extension auto-fills your name, email, phone, cover letter, and every other text field — in seconds."],
            ["📋", "Track everything",            "Applied? Waiting? Interviewing? One dashboard shows every job, every status, and every follow-up you need to send. Nothing falls through the cracks."],
          ] as const).map(([emoji, title, body]) => (
            <div
              key={title}
              className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-7"
              style={{ boxShadow: "2px 3px 0 rgba(26,24,20,0.08)" }}
            >
              <span className="text-[32px]">{emoji}</span>
              <h3 className="mt-4 text-[18px] font-bold">{title}</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-[var(--muted-foreground)]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── What you get ── */}
      <section id="what-you-get" className="mx-auto max-w-[1200px] px-8 pb-24 pt-12 sm:px-12">
        <div className="mb-14 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
            What you get
          </span>
          <h2
            className="mt-3 text-[clamp(36px,5vw,56px)] font-normal tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Four things, done well.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {landingThings.map((x) => (
            <div
              key={x.title}
              className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-7"
              style={{ boxShadow: "2px 3px 0 rgba(26,24,20,0.08)" }}
            >
              <div
                className="mb-5 grid h-14 w-14 place-items-center rounded-[18px]"
                style={{ background: "rgba(200,74,31,0.08)" }}
              >
                <LandingThingIcon icon={x.icon} />
              </div>
              <h3 className="text-[18px] font-bold">{x.title}</h3>
              <p className="mt-2 text-[14px] leading-[1.55] text-[var(--muted-foreground)]">{x.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── All capabilities ── */}
      <section className="mx-auto max-w-[1200px] px-8 pb-24 pt-12 sm:px-12">
        <div className="mb-14 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
            Everything included
          </span>
          <h2
            className="mt-3 text-[clamp(36px,5vw,56px)] font-normal tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Built for serious candidates.
          </h2>
          <p className="mx-auto mt-4 max-w-[560px] text-[17px] leading-[1.6] text-[var(--muted-foreground)]">
            Every part of the job search — in one workspace. No spreadsheets, no tabs, no dropped balls.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {capabilityCards.map((c) => (
            <div
              key={c.title}
              className="rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-7"
              style={{ boxShadow: "2px 3px 0 rgba(26,24,20,0.08)" }}
            >
              <h3 className="text-[18px] font-bold">{c.title}</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-[var(--muted-foreground)]">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="mx-auto max-w-[1200px] px-12 pb-24 pt-12">
        <div className="mb-14 text-center">
          <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
            How it works
          </span>
          <h2
            className="mt-3 text-[clamp(36px,5vw,56px)] font-normal tracking-[-0.01em]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Up and running in five minutes.
          </h2>
        </div>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {landingSteps.map((s) => (
            <div
              key={s.n}
              className="relative rounded-3xl border border-[var(--line)] bg-[var(--surface)] p-8"
              style={{ boxShadow: "2px 3px 0 rgba(26,24,20,0.08)" }}
            >
              <div
                className="mb-5 text-[96px] leading-[0.8] text-[var(--accent)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.n}
              </div>
              <h3
                className="text-[22px] font-bold"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {s.title}
              </h3>
              <p className="mt-2.5 text-[15px] leading-[1.55] text-[var(--muted-foreground)]">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Extension ── */}
      <section className="mt-12 bg-[var(--surface-soft)] px-8 py-24 sm:px-12">
        <div className="mx-auto max-w-[1200px]">
          <div className="grid items-center gap-20 lg:grid-cols-[1.1fr_1fr]">
            {/* Left: text */}
            <div>
              <div className="mb-4 flex items-center gap-2.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
                  Chrome extension
                </span>
                <span
                  className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[0.18em]"
                  style={{ background: "rgba(176,122,24,0.08)", border: "1px solid var(--warn)", color: "var(--warn)" }}
                >
                  Coming soon
                </span>
              </div>
              <h2
                className="text-[clamp(40px,5vw,64px)] font-normal leading-none tracking-[-0.02em]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Apply in one click
                <br />
                from any page.
              </h2>
              <p className="mt-6 max-w-[480px] text-[18px] leading-[1.5] text-[var(--muted-foreground)]">
                The NextRole extension sits quietly on every job page. Open an application — it auto-fills every field so you don't have to.
              </p>

              {/* Two columns: save + fill */}
              <div className="mt-8 grid gap-5 sm:grid-cols-2">
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">Save jobs</p>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[var(--muted-foreground)]">
                    See a role on LinkedIn, Greenhouse, Lever, or any company site? One click pulls the title, company, and description straight into your pipeline.
                  </p>
                </div>
                <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
                  <p className="text-[13px] font-semibold uppercase tracking-[0.1em] text-[var(--accent)]">Auto-fill forms</p>
                  <p className="mt-2 text-[14px] leading-[1.6] text-[var(--muted-foreground)]">
                    Fills your name, email, phone, LinkedIn, and writes your cover letter with AI. Works on Greenhouse, Lever, Ashby, Workday, LinkedIn Easy Apply, and more.
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-4">
                {[
                  ["1", "Open any application page",    "Greenhouse, Lever, Ashby, LinkedIn Easy Apply, Workday — or any page with an application form."],
                  ["2", "Click the NextRole button",    "A small panel opens showing every field it found — name, email, phone, cover letter, and more."],
                  ["3", "Hit auto-fill",                "Direct fields fill instantly. AI writes your cover letter, \"why this company\", and experience summaries in seconds."],
                  ["4", "Review and submit",            "Check the fields, make any tweaks, then click Submit — right from the panel."],
                ].map(([n, title, desc]) => (
                  <div key={n} className="flex items-start gap-4">
                    <div
                      className="grid h-8 w-8 shrink-0 place-items-center rounded-full font-mono text-[12px] font-bold text-[var(--surface)]"
                      style={{ background: "var(--accent)" }}
                    >
                      {n}
                    </div>
                    <div>
                      <p className="text-[15px] font-semibold">{title}</p>
                      <p className="mt-1 text-[13px] leading-[1.6] text-[var(--muted-foreground)]">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right: browser popup mock */}
            <div className="grid place-items-center">
              <div className="relative">
                {/* fake browser bar */}
                <div
                  className="flex items-center gap-1.5 rounded-t-2xl border border-b-0 border-[var(--line)] bg-[var(--surface)] px-3 py-2.5"
                  style={{ width: 360 }}
                >
                  <div className="flex gap-1.5">
                    {["var(--bad)", "var(--warn)", "var(--ok)"].map((c, i) => (
                      <span
                        key={i}
                        className="inline-block h-2.5 w-2.5 rounded-full opacity-50"
                        style={{ background: c }}
                      />
                    ))}
                  </div>
                  <div
                    className="ml-2.5 flex flex-1 items-center rounded-md px-2.5 font-mono text-[10px] text-[var(--muted-foreground-2)]"
                    style={{ height: 22, background: "var(--surface-soft)" }}
                  >
                    linkedin.com/jobs/view/3892…
                  </div>
                  <div
                    className="grid h-[22px] w-[26px] place-items-center rounded-md"
                    style={{ background: "var(--accent)" }}
                  >
                    <svg width="12" height="12" viewBox="0 0 26 26" fill="none">
                      <path d="M6 5L17 13L6 21" stroke="var(--surface)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
                {/* popup card */}
                <div
                  className="rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-[18px]"
                  style={{
                    width: 340,
                    marginTop: 6,
                    marginLeft: "auto",
                    boxShadow: "0 18px 40px rgba(26,24,20,0.18)",
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <BrandWordmark />
                    <span
                      className="inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]"
                      style={{ background: "rgba(47,122,58,0.08)", border: "1px solid var(--ok)", color: "var(--ok)" }}
                    >
                      92% match
                    </span>
                  </div>
                  <p
                    className="text-[22px] leading-[1.15]"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    Senior Product Designer
                  </p>
                  <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">Anthropic · Remote</p>
                  <div
                    className="mt-3.5 rounded-xl p-3 text-[12px] leading-[1.5] text-[var(--muted-foreground)]"
                    style={{ background: "var(--surface-soft)" }}
                  >
                    Help shape the design of safe, beneficial AI products at scale. Lead end-to-end design for…
                  </div>
                  <div className="mt-3.5 flex flex-col gap-2">
                    <Button href="/signup" tone="accent">
                      Evaluate with AI
                    </Button>
                    <Button href="/signup">
                      Save to pipeline
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[var(--line-soft)] px-12 py-12 mt-12">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between">
          <Link href="/" aria-label="NextRole home">
            <BrandWordmark />
          </Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground-2)]">
            © 2026 NextRole ·{" "}
            <Link href="/privacy" className="transition hover:text-[var(--foreground)]">Privacy</Link>
            {" · "}
            <Link href="/terms" className="transition hover:text-[var(--foreground)]">Terms</Link>
          </p>
        </div>
      </footer>
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
            {repoParity.map((feature) => (
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
        <Badge tone="accent" className="mb-5">
          Privacy policy
        </Badge>
        <Display>How NextRole handles your data.</Display>
        <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
          This page explains what information the product stores, how it is used
          in the workflow, and what controls the user has over that data.
        </p>
      </section>

      <section className="grid gap-6 px-6 py-8 lg:grid-cols-2 lg:px-10">
        <Surface className="p-5">
          <SectionTitle title="Information we store" subtitle="Core account and workflow data" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>Account information such as email address and authentication records.</p>
            <p>Profile information including CV text, targeting preferences, seniority, compensation goals, and language settings.</p>
            <p>Job workflow data such as saved jobs, tracker statuses, evaluation outputs, resumes, reports, follow-up drafts, story bank entries, and task history.</p>
            <p>Provider configuration data, including encrypted API credentials where applicable.</p>
          </div>
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle title="How the data is used" subtitle="Product functionality only" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>To run evaluations, generate tailored outputs, and keep workflows connected across Tracker, Reports, Resumes, and Interview Prep.</p>
            <p>To store user preferences that influence scanner targeting, evaluation weighting, and personalization recommendations.</p>
            <p>To display task history, exports, analytics, and workflow continuity over time.</p>
          </div>
        </Surface>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] px-6 py-8 lg:px-10">
        <SectionTitle title="Provider and third-party processing" subtitle="Where user selected AI services fit in" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Surface className="p-5">
            <h3 className="text-lg font-bold">API mode</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              When API mode is used, selected job text, CV context, and prompt
              content may be sent to the AI provider chosen by the user so the
              workflow can run.
            </p>
          </Surface>
          <Surface className="p-5">
            <h3 className="text-lg font-bold">Manual mode</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              In manual mode, the app prepares prompts locally and the user
              decides what to submit in Claude, ChatGPT, or another tool.
            </p>
          </Surface>
          <Surface className="p-5">
            <h3 className="text-lg font-bold">Infrastructure</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              Product hosting, authentication, database, and storage providers
              may process operational metadata needed to run the service.
            </p>
          </Surface>
        </div>
      </section>

      <section className="grid gap-6 px-6 py-8 lg:grid-cols-2 lg:px-10">
        <Surface className="p-5">
          <SectionTitle title="User controls" subtitle="What the user can manage" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>Users can update profile data, rotate provider credentials, export workflow data, and delete account data according to the product controls available in Settings.</p>
            <p>Manual mode gives users an alternative when they do not want the app to transmit prompts through API credentials.</p>
          </div>
        </Surface>
        <Surface className="p-5">
          <SectionTitle title="Security and limitations" subtitle="Reasonable protections, no absolute guarantees" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>Provider keys should be encrypted at rest and only used server-side for authorized workflow execution.</p>
            <p>No internet-facing system can promise absolute security, so users should avoid storing information they would not want processed by their selected providers.</p>
            <p>NextRole does not sell user workflow data for advertising purposes.</p>
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
        <Badge tone="accent" className="mb-5">
          Terms of use
        </Badge>
        <Display>The rules for using NextRole.</Display>
        <p className="mt-6 max-w-3xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
          These terms describe the intended use of the product, the user
          responsibilities that come with AI-assisted workflows, and the
          limitations of the service.
        </p>
      </section>

      <section className="grid gap-6 px-6 py-8 lg:grid-cols-2 lg:px-10">
        <Surface className="p-5">
          <SectionTitle title="Service purpose" subtitle="What the product is for" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>NextRole is a candidate productivity tool for evaluating jobs, generating documents, preparing applications, and tracking a search process.</p>
            <p>The product provides recommendations and generated content, but the user remains responsible for final decisions and submissions.</p>
          </div>
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle title="User responsibilities" subtitle="Use the tool thoughtfully" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>Users are responsible for the accuracy, legality, and appropriateness of the information they upload or submit through the product.</p>
            <p>Users are also responsible for complying with the terms of the AI providers, storage providers, and job platforms they choose to use alongside NextRole.</p>
          </div>
        </Surface>
      </section>

      <section className="border-y border-[var(--line)] bg-[var(--surface-soft)] px-6 py-8 lg:px-10">
        <SectionTitle title="Important limitations" subtitle="Please review before relying on outputs" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Surface className="p-5">
            <h3 className="text-lg font-bold">No guarantees</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              NextRole does not guarantee interviews, offers, compensation
              outcomes, or correctness of generated outputs.
            </p>
          </Surface>
          <Surface className="p-5">
            <h3 className="text-lg font-bold">Human review required</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              Users should review generated resumes, outreach, negotiation
              advice, and application answers before using them externally.
            </p>
          </Surface>
          <Surface className="p-5">
            <h3 className="text-lg font-bold">No auto-apply behavior</h3>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              The product is designed to assist and organize work, not to submit
              job applications on the user behalf.
            </p>
          </Surface>
        </div>
      </section>

      <section className="grid gap-6 px-6 py-8 lg:grid-cols-2 lg:px-10">
        <Surface className="p-5">
          <SectionTitle title="Open-source notice" subtitle="MIT-licensed Career Ops attribution" />
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">
            Parts of the product foundation are inspired by or adapted from the
            Career Ops project distributed under the MIT license. Where required,
            the copyright and permission notice should remain included with the
            adapted software.
          </p>
        </Surface>
        <Surface className="p-5">
          <SectionTitle title="Warranty and liability" subtitle="Use at your own judgment" />
          <p className="text-sm leading-7 text-[var(--muted-foreground)]">
            The service is provided on an as-available basis. To the fullest
            extent allowed by law, the maintainers disclaim warranties and are
            not liable for losses arising from reliance on generated outputs,
            provider outages, employment decisions, or third-party platform
            changes.
          </p>
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
    <div className="min-h-screen text-[var(--foreground)]" style={{ fontFamily: "Inter, Trebuchet MS, Segoe UI, sans-serif" }}>
      <PublicHeader activePage="pricing" />

      {/* Hero */}
      <section className="px-6 pb-16 pt-20 text-center sm:px-12">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]">Pricing</p>
        <h1
          className="mx-auto mt-4 max-w-[720px] text-[clamp(40px,6vw,68px)] font-normal leading-[1.05] tracking-[-0.02em]"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Start free.{" "}
          <span className="italic text-[var(--accent)]">Pay when you're ready.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[480px] text-[17px] leading-[1.6] text-[var(--muted-foreground)]">
          Bring your own API key and get the full product free for 14 days — no card required.
        </p>
      </section>

      {/* Main plans grid */}
      <section className="mx-auto max-w-[1100px] px-6 pb-24 sm:px-12">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">

          {/* Free */}
          <div className="flex flex-col rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-7">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Free</p>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-[38px] font-normal leading-none tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)" }}>$0</span>
              <span className="text-[13px] text-[var(--muted-foreground)]">forever</span>
            </div>
            <p className="mt-3 text-[14px] leading-[1.55] text-[var(--muted-foreground)]">
              Explore the workspace, use manual prompt mode, and try the workflow before committing.
            </p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {["Pipeline + tracker", "Manual prompt mode", "CV storage", "Community support"].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px]"><CheckIcon />{f}</li>
              ))}
            </ul>
            <a href="/signup" className="mt-8 block rounded-xl border border-[var(--line-soft)] py-3 text-center text-[14px] font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
              Get started free
            </a>
          </div>

          {/* BYOK — highlighted */}
          <div className="flex flex-col rounded-2xl border-2 border-[var(--accent)] bg-[var(--surface)] p-7 shadow-[0_4px_24px_rgba(200,74,31,0.12)]">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">BYOK</p>
              <span className="rounded-full bg-[var(--accent)] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-white">
                Default plan
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[38px] font-normal leading-none tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)" }}>$12</span>
              <span className="text-[13px] text-[var(--muted-foreground)]">/ month</span>
            </div>
            <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">after 14-day free trial · no card to start</p>
            <p className="mt-3 text-[14px] leading-[1.55] text-[var(--muted-foreground)]">
              Bring your Anthropic, OpenAI, or Gemini API key. Get the full product with unlimited AI usage.
            </p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {[
                "Everything in Free",
                "Full AI workflow — evaluation, resumes, prep",
                "Unlimited runs at your API cost",
                "Anthropic · OpenAI · Gemini",
                "Scanner, batch, deep research",
                "Priority support",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px]"><CheckIcon />{f}</li>
              ))}
            </ul>
            <a href="/signup" className="mt-8 block rounded-xl bg-[var(--accent)] py-3 text-center text-[14px] font-semibold text-white transition hover:opacity-90">
              Start 14-day free trial
            </a>
          </div>

          {/* Managed credits — coming soon */}
          <div className="relative flex flex-col rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-7 opacity-70">
            <div className="mb-3 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Managed</p>
              <span className="rounded-full border border-[var(--line-soft)] bg-[var(--surface-soft)] px-2.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                Coming soon
              </span>
            </div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-[38px] font-normal leading-none tracking-[-0.02em]" style={{ fontFamily: "var(--font-display)" }}>$29</span>
              <span className="text-[13px] text-[var(--muted-foreground)]">/ month</span>
            </div>
            <p className="mt-3 text-[14px] leading-[1.55] text-[var(--muted-foreground)]">
              No API key needed. We handle the AI infrastructure — just use the product.
            </p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {[
                "Everything in BYOK",
                "Hosted AI credits included",
                "No API key required",
                "Usage-based top-ups",
              ].map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px]"><CheckIcon />{f}</li>
              ))}
            </ul>
            <button disabled className="mt-8 block w-full cursor-not-allowed rounded-xl border border-[var(--line-soft)] py-3 text-center text-[14px] font-medium text-[var(--muted-foreground)]">
              Notify me
            </button>
          </div>
        </div>

        {/* What is BYOK callout */}
        <div className="mt-10 rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] px-8 py-7">
          <div className="grid gap-6 md:grid-cols-[1fr_2fr]">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">What is BYOK?</p>
              <p className="mt-2 text-[22px] font-normal leading-[1.2] tracking-[-0.01em]" style={{ fontFamily: "var(--font-display)" }}>Bring Your Own Key</p>
            </div>
            <div className="space-y-3 text-[14px] leading-[1.65] text-[var(--muted-foreground)]">
              <p>
                BYOK means you connect your own Anthropic, OpenAI, or Gemini API key inside NextRole. Every AI evaluation, resume tailoring, and prep run calls the AI provider directly using your key — so you pay only your actual API cost, which is typically a few cents per run.
              </p>
              <p>
                The $12/month subscription covers the NextRole platform, workspace, storage, and all product features. It does not include a credit allowance — your AI usage goes straight to your provider at cost.
              </p>
            </div>
          </div>
        </div>

        {/* FAQ */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            ["Do I need a card to start?", "No. Sign up and start your 14-day BYOK trial with just an email. You only add payment details when the trial ends."],
            ["How much does AI actually cost?", "A job evaluation via Claude Haiku costs ~$0.01–0.03. A resume tailoring run costs ~$0.05–0.10. Far less than a monthly credit plan."],
            ["Can I cancel any time?", "Yes. Cancel before the trial ends and you're never charged. Cancel after and the plan ends at your next billing date."],
          ].map(([q, a]) => (
            <div key={q} className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
              <p className="text-[14px] font-semibold leading-[1.4]">{q}</p>
              <p className="mt-2 text-[13px] leading-[1.65] text-[var(--muted-foreground)]">{a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--line-soft)] px-8 py-8 sm:px-12">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between">
          <Link href="/" aria-label="NextRole home"><BrandWordmark /></Link>
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--muted-foreground-2)]">
            © 2026 NextRole ·{" "}
            <Link href="/privacy" className="transition hover:text-[var(--foreground)]">Privacy</Link>
            {" · "}
            <Link href="/terms" className="transition hover:text-[var(--foreground)]">Terms</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
