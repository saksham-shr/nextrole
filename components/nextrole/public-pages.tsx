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

function SiteHeader() {
  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-[var(--line)] px-6 py-4">
      <div>
        <Link href="/" aria-label="NextRole home">
          <BrandWordmark />
        </Link>
      </div>
      <nav className="ml-auto hidden items-center gap-6 text-sm font-bold text-[var(--muted-foreground)] md:flex">
        <Link href="/#workflow">How it works</Link>
        <Link href="/#capabilities">Capabilities</Link>
        <Link href="/documentation">Documentation</Link>
        <Link href="/#artifacts">Artifacts</Link>
        <Link href="/#faq">FAQ</Link>
      </nav>
      <div className="ml-auto flex items-center gap-3 md:ml-0">
        <Button href="/login" ghost>
          Log in
        </Button>
        <Button href="/signup" tone="accent">
          Start free setup
        </Button>
      </div>
    </header>
  );
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

export function LandingPage() {
  return (
    <MarketingShell>
      <section className="grid gap-8 border-b border-[var(--line)] px-6 py-8 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-12">
        <div>
          <Badge tone="accent" className="mb-5">
            Job Search OS · Candidate-first
          </Badge>
          <Display>
            Run your job search
            <br />
            like a real pipeline.
          </Display>
          <p className="mt-6 max-w-2xl text-base leading-8 text-[var(--muted-foreground)] sm:text-lg">
            Discover roles, evaluate fit, tailor resumes, prep interviews,
            send follow-ups, and improve your funnel all from one connected
            workspace built for serious job seekers.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/signup" tone="accent">
              Start free setup
            </Button>
            <Button href="/dashboard">See workflow</Button>
            <Button href="/documentation" ghost>
              Read documentation
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap gap-2">
            <Badge>Anthropic API</Badge>
            <Badge>OpenAI API</Badge>
            <Badge>Gemini API</Badge>
            <Badge tone="accent">Manual Chat Mode</Badge>
          </div>
        </div>

        <Surface tone="accent" className="p-5">
          <Eyebrow>Live product preview</Eyebrow>
          <div className="mt-4 rounded-[20px] border border-[var(--line)] bg-[var(--surface)] p-4">
            <div className="flex items-start gap-4">
              <StatCard label="Score" value="87" tone="accent" />
              <div className="flex-1">
                <h2 className="text-lg font-bold">Linear · Senior Product Engineer</h2>
                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  Evaluated 2 minutes ago · decision strong apply
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="ok">Fit 91</Badge>
                  <Badge tone="warn">3 missing keywords</Badge>
                  <Badge>Comp confidence 82</Badge>
                </div>
              </div>
            </div>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <MiniMetric label="Top strength" value="Role fit to product and infra mix" />
              <MiniMetric label="Top risk" value="Needs stronger quantified roadmap impact" />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button tone="accent">Tailor resume</Button>
              <Button>Save to tracker</Button>
              <Button ghost>Create prep pack</Button>
            </div>
          </div>
        </Surface>
      </section>

      <section id="capabilities" className="px-6 py-8 lg:px-10">
        <SectionTitle
          title="All the major workflows, one place"
          subtitle="Everything Career Ops does, turned into product surfaces"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {capabilityCards.map((item) => (
            <Surface key={item.title} className="p-5">
              <h3 className="text-lg font-bold">{item.title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                {item.body}
              </p>
            </Surface>
          ))}
        </div>
      </section>

      <section id="workflow" className="border-y border-[var(--line)] bg-[var(--surface-soft)] px-6 py-8 lg:px-10">
        <SectionTitle
          title="How the workflow runs"
          subtitle="Five connected steps from intake to pattern improvement"
        />
        <div className="grid gap-4 lg:grid-cols-5">
          {workflowSteps.map(([step, title, body]) => (
            <Surface key={step} className="p-5 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-[var(--accent)] bg-[var(--accent)] font-[var(--font-caveat)] text-2xl font-bold text-[var(--surface)]">
                {step}
              </div>
              <h3 className="mt-4 text-lg font-bold">{title}</h3>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                {body}
              </p>
            </Surface>
          ))}
        </div>
      </section>

      <section id="artifacts" className="grid gap-6 px-6 py-8 lg:grid-cols-[1fr_1fr] lg:px-10">
        <Surface className="p-5">
          <SectionTitle
            title="Outputs that persist"
            subtitle="Jobs, reports, resumes, prep packs, follow-ups, patterns, and exports"
          />
          <div className="flex flex-wrap gap-2">
            {repoParity.map((feature) => (
              <Badge key={feature}>{feature}</Badge>
            ))}
          </div>
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle
            title="Mode flexibility"
            subtitle="Use APIs or run manual chat imports with existing subscriptions"
          />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>
              API mode runs evaluations, batch jobs, scanner flows, resume
              generation, and prep packs directly inside the app.
            </p>
            <p>
              Manual mode generates prompts for Claude Pro or ChatGPT Plus,
              then validates pasted outputs so the rest of the workflow still
              runs inside NextRole.
            </p>
          </div>
        </Surface>
      </section>

      <section className="border-t border-[var(--line)] px-6 py-8 lg:px-10">
        <SectionTitle
          title="Operational dashboard metrics"
          subtitle="The product is built to feel like a system, not a single form"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          {kpis.map((kpi) => (
            <StatCard
              key={kpi.label}
              label={kpi.label}
              value={kpi.value}
              sublabel={kpi.sublabel}
              tone={kpi.tone}
            />
          ))}
        </div>
      </section>

      <section id="faq" className="border-t border-[var(--line)] bg-[var(--surface-ink)] px-6 py-8 text-[var(--surface)] lg:px-10">
        <Display className="text-[var(--surface)] sm:text-5xl">
          Stop juggling tabs.
          <br />
          Start running a search.
        </Display>
        <p className="mt-5 max-w-3xl text-sm leading-7 text-[#d8d2c8] sm:text-base">
          Every workflow you need evaluate, scan, track, tailor resumes,
          prep interviews, send follow-ups, and analyze patterns built into
          one product from day one.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/signup" tone="accent">
            Create free account
          </Button>
          <Button href="/documentation" ghost className="border-white/30 text-[var(--surface)]">
            Read the docs
          </Button>
        </div>
        <div className="mt-10 grid gap-4 lg:grid-cols-3">
          {faqItems.map((item) => (
            <div key={item.title} className="rounded-[18px] border border-white/15 bg-white/5 p-4">
              <p className="text-sm font-bold">{item.title}</p>
              <p className="mt-3 text-sm leading-7 text-[#d8d2c8]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>
    </MarketingShell>
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
