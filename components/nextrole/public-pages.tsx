import {
  Badge,
  Button,
  Display,
  Eyebrow,
  MiniMetric,
  SectionTitle,
  StatCard,
  Surface,
} from "@/components/nextrole/ui";
import { kpis, repoParity } from "@/lib/nextrole-data";

export function LandingPage() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <Surface className="overflow-hidden">
        <header className="flex flex-wrap items-center gap-4 border-b border-[var(--line)] px-6 py-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-3 w-3 rounded-full bg-[var(--accent)]" />
              <span className="font-[var(--font-caveat)] text-3xl font-bold">
                nextrole
              </span>
            </div>
          </div>
          <nav className="ml-auto hidden items-center gap-6 text-sm font-bold text-[var(--muted-foreground)] md:flex">
            <a href="#workflow">How it works</a>
            <a href="#capabilities">Capabilities</a>
            <a href="#artifacts">Artifacts</a>
            <a href="#faq">FAQ</a>
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
              send follow-ups, and improve your funnel — all from one connected
              workspace built for serious job seekers.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button href="/signup" tone="accent">
                Start free setup
              </Button>
              <Button href="/dashboard">See workflow</Button>
            </div>
            <div className="mt-8 flex flex-wrap gap-2">
              <Badge>Anthropic API</Badge>
              <Badge>OpenAI API</Badge>
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
            subtitle="Everything the repo does, turned into product surfaces"
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {[
              ["Evaluate roles", "Paste URLs or job text and score fit, compensation, risks, and CV alignment."],
              ["Scan portals", "Run saved source scans against target roles, geography, and company preferences."],
              ["Tailor resumes", "Generate role-specific resume variants, HTML previews, and PDF exports."],
              ["Track applications", "Use tracker views, detail drawers, notes, and linked artifacts per role."],
              ["Prepare interviews", "Create round plans, story matches, and company research packs."],
              ["Improve your funnel", "See patterns, conversion breakdowns, and strategy recommendations."],
            ].map(([title, body]) => (
              <Surface key={title} className="p-5">
                <h3 className="text-lg font-bold">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
                  {body}
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
            {[
              ["1", "Add your CV and targets", "Build the base profile and targeting logic."],
              ["2", "Discover or paste jobs", "Use scanner, pipeline, batch, or one-off evaluate."],
              ["3", "Evaluate fit and risks", "Get structured reports and action recommendations."],
              ["4", "Generate materials", "Create tailored resumes, apply answers, and interview prep."],
              ["5", "Track and improve", "Run follow-ups, analytics, and targeting adjustments."],
            ].map(([step, title, body]) => (
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
              subtitle="Jobs, reports, resumes, prep packs, follow-ups, and patterns"
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
            Every workflow you need — evaluate, scan, track, tailor resumes,
            prep interviews, send follow-ups, and analyse patterns — built into
            one product from day one.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button href="/signup" tone="accent">
              Create free account
            </Button>
            <Button href="/login" ghost className="border-white/30 text-[var(--surface)]">
              I already have an account
            </Button>
          </div>
        </section>
      </Surface>
    </main>
  );
}
