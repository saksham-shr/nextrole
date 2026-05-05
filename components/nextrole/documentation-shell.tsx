import Link from "next/link";
import { BrandWordmark } from "@/components/nextrole/brand";
import { Button } from "@/components/nextrole/ui";
import { PublicHeader } from "@/components/nextrole/public-pages";

const sideNav = [
  {
    title: "Getting Started",
    items: [
      ["overview", "What is NextRole?"],
      ["trial", "14-day free trial"],
      ["setup", "Initial setup"],
      ["modes", "Execution modes"],
    ],
  },
  {
    title: "Core Workflows",
    items: [
      ["workflow", "How to use the product"],
      ["evaluate", "Evaluate and compare"],
      ["scanner", "Scanner, batch, and pipeline"],
      ["tracker", "Tracker and follow-up"],
      ["documents", "Reports and resumes"],
    ],
  },
  {
    title: "Coaching and Insights",
    items: [
      ["prep", "Interview prep and story bank"],
      ["apply", "Apply, contact, negotiate"],
      ["patterns", "Patterns and analytics"],
    ],
  },
] as const;

const onThisPage = [
  ["overview", "What is NextRole?"],
  ["setup", "How to get started"],
  ["modes", "API and manual modes"],
  ["workflow", "Recommended workflow"],
  ["workspace", "Workspace reference"],
  ["faq", "FAQ"],
] as const;

const workspaceEntries = [
  ["Dashboard", "Search health, urgent actions, KPIs, latest outputs, and pipeline signals."],
  ["Evaluate + Compare", "Run deep role analysis, compare options, and choose next actions."],
  ["Batch + Scanner + Pipeline", "Discover jobs, deduplicate, and move strong roles into structured review."],
  ["Tracker", "Manage statuses, notes, artifacts, liveness, and follow-up timing in one place."],
  ["Reports + Resumes + CV", "Store long-form evaluations, tailored resumes, exports, and your canonical CV source."],
  ["Interview Prep + Story Bank", "Prepare for recruiter, hiring manager, technical, and panel rounds with reusable stories."],
  ["Apply + Contact + Negotiate", "Draft application answers, outreach, and compensation responses without auto-submitting."],
  ["Patterns + Activity + Prompts", "Track outcomes, retries, task history, and reusable prompt templates over time."],
] as const;

function DocsHeader() {
  return <PublicHeader activePage="docs" />;
}

export function DocumentationShellPage() {
  return (
    <main className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <DocsHeader />
      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-0 px-5 sm:px-8 lg:grid-cols-[280px_minmax(0,1fr)_240px]">
        <aside className="hidden border-r border-[var(--line)] pr-8 pt-10 lg:block">
          <div className="sticky top-0 h-screen overflow-y-auto pb-10">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-base font-semibold text-[var(--foreground)]">Using NextRole</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Full product guide for the job search operating system.
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
              <p className="text-base font-semibold text-[var(--foreground)]">Latest Version</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">Web app workspace</p>
            </div>
          </div>

          <div className="mt-8 space-y-8 pb-10">
            {sideNav.map((group) => (
              <div key={group.title}>
                <p className="mb-3 text-lg font-semibold text-[var(--foreground)]">{group.title}</p>
                <div className="space-y-3">
                  {group.items.map(([href, label]) => (
                    <a key={href} href={`#${href}`} className="block text-base text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">
                      {label}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>
          </div>
        </aside>

        <article className="min-w-0 px-0 py-10 lg:px-12 xl:px-16">
          <div className="max-w-4xl">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-[var(--muted-foreground-2)]">
              Documentation
            </p>
            <h1 className="mt-4 text-5xl font-semibold tracking-tight text-[var(--foreground)] sm:text-6xl">
              NextRole Docs
            </h1>
            <p className="mt-6 max-w-3xl text-lg leading-8 text-[var(--muted-foreground)]">
              Everything you need to understand the product flow, setup, AI execution
              modes, workspace pages, outputs, and the way the product works in
              practice.
            </p>

            <section id="overview" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">What is NextRole?</h2>
              <div className="mt-8 space-y-6 text-lg leading-9 text-[var(--muted-foreground)]">
                <p>
                  NextRole is a candidate-first job search operating system. It is
                  designed to help one user run the entire search process from intake
                  through evaluation, resume tailoring, application tracking, interview
                  prep, follow-up, and pattern improvement.
                </p>
                <p>
                  Instead of scattering your search across notes, browser tabs,
                  spreadsheets, and separate AI chats, NextRole keeps jobs, reports,
                  resumes, follow-up drafts, and analytics connected in one workspace.
                </p>
              </div>
            </section>

            <section id="trial" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">14-day free trial</h2>
              <div className="mt-8 rounded-3xl border border-[var(--accent)] bg-[#fcefe7] p-6">
                <p className="text-lg font-semibold text-[var(--foreground)]">
                  Every new account starts with a 14-day free trial. No credit card required.
                </p>
                <p className="mt-3 text-base leading-8 text-[var(--muted-foreground)]">
                  The signup and login flows are positioned around a free trial experience.
                  This is currently product messaging and onboarding guidance, not a live
                  billing system.
                </p>
              </div>
            </section>

            <section id="setup" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">How to get started</h2>
              <div className="mt-8 space-y-6 text-lg leading-9 text-[var(--muted-foreground)]">
                <p>Use this sequence to make the product useful quickly:</p>
                <ol className="list-decimal space-y-4 pl-6">
                  <li>Create your account and enter the onboarding flow.</li>
                  <li>Add your base CV and proof-point source material.</li>
                  <li>Set target roles, locations, compensation, and work preferences.</li>
                  <li>Choose API mode or Manual Chat Mode.</li>
                  <li>Run your first evaluation or scan to seed the tracker.</li>
                </ol>
              </div>
            </section>

            <section id="modes" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">API and manual modes</h2>
              <div className="mt-8 space-y-6 text-lg leading-9 text-[var(--muted-foreground)]">
                <p>
                  NextRole supports Anthropic API, OpenAI API, Gemini API, and Manual
                  Chat Mode. Manual mode is the fallback for users who want to use
                  Claude Pro or ChatGPT Plus without API credits.
                </p>
                <p>
                  In manual mode, the app prepares the exact prompt payload, the user
                  runs it in their chosen chat product, and then pastes the structured
                  output back into NextRole so the workflow can continue.
                </p>
              </div>
            </section>

            <section id="workflow" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">Recommended workflow</h2>
              <div className="mt-8 space-y-6 text-lg leading-9 text-[var(--muted-foreground)]">
                <p>The product works best when used as a loop, not as a one-off form:</p>
                <ol className="list-decimal space-y-4 pl-6">
                  <li>Discover or import roles with Scanner, Pipeline, Batch, or Evaluate.</li>
                  <li>Run evaluation and save the output into Tracker.</li>
                  <li>Generate reports, resumes, prep packs, and apply drafts from the same job.</li>
                  <li>Advance the tracker status as you apply, interview, or receive outcomes.</li>
                  <li>Use Follow-up, Activity, and Patterns to improve the next cycle.</li>
                </ol>
              </div>
            </section>

            <section id="evaluate" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">Evaluate and compare</h2>
              <div className="mt-8 space-y-6 text-lg leading-9 text-[var(--muted-foreground)]">
                <p>
                  The Evaluate page is the main single-role analysis surface. It accepts
                  URLs or pasted job descriptions, runs structured scoring, surfaces fit
                  signals, CV gaps, level strategy, personalization guidance, interview
                  signals, legitimacy checks, and an action recommendation.
                </p>
                <p>
                  Compare lets you rank multiple evaluated jobs side by side and decide
                  where your energy should go next.
                </p>
              </div>
            </section>

            <section id="scanner" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">Scanner, batch, and pipeline</h2>
              <div className="mt-8 space-y-6 text-lg leading-9 text-[var(--muted-foreground)]">
                <p>
                  Scanner helps you discover roles from saved sources. Batch evaluates many
                  roles in one run. Pipeline acts as the intake queue before roles become
                  serious tracked opportunities.
                </p>
                <p>
                  These pages work together: scan to discover, pipeline to triage, batch to
                  process at scale, and tracker to preserve only the roles that matter.
                </p>
              </div>
            </section>

            <section id="tracker" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">Tracker and follow-up</h2>
              <div className="mt-8 space-y-6 text-lg leading-9 text-[var(--muted-foreground)]">
                <p>
                  Tracker is the operational hub. Every serious opportunity should land there
                  because it links evaluation, reports, resumes, interview prep, follow-up,
                  and activity history to one job record.
                </p>
                <p>
                  Follow-up then uses timing and urgency buckets to keep applications moving
                  after submission.
                </p>
              </div>
            </section>

            <section id="documents" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">Reports, resumes, and CV</h2>
              <div className="mt-8 space-y-6 text-lg leading-9 text-[var(--muted-foreground)]">
                <p>
                  Reports capture the full evaluation record. Resumes store tailored versions
                  linked back to the target role. The CV page keeps the canonical source
                  material that improves all downstream outputs.
                </p>
              </div>
            </section>

            <section id="workspace" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">Workspace reference</h2>
              <div className="mt-8 overflow-hidden rounded-3xl border border-[var(--line)]">
                <table className="min-w-full border-collapse">
                  <thead className="bg-[var(--surface-soft)]">
                    <tr>
                      <th className="border-b border-[var(--line)] px-5 py-4 text-left text-sm font-semibold text-[var(--foreground)]">Area</th>
                      <th className="border-b border-[var(--line)] px-5 py-4 text-left text-sm font-semibold text-[var(--foreground)]">Purpose</th>
                    </tr>
                  </thead>
                  <tbody>
                    {workspaceEntries.map(([area, description]) => (
                      <tr key={area} className="border-b border-[var(--line-soft)] last:border-b-0">
                        <td className="px-5 py-4 align-top text-sm font-semibold text-[var(--foreground)]">{area}</td>
                        <td className="px-5 py-4 text-sm leading-7 text-[var(--muted-foreground)]">{description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="prep" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">Interview prep and story bank</h2>
              <div className="mt-8 space-y-6 text-lg leading-9 text-[var(--muted-foreground)]">
                <p>
                  Interview Prep builds company-specific prep packs with likely rounds,
                  question sets, and story suggestions. Story Bank helps you accumulate and
                  refine STAR stories over time so each future prep pack gets stronger.
                </p>
              </div>
            </section>

            <section id="apply" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">Apply, contact, and negotiate</h2>
              <div className="mt-8 space-y-6 text-lg leading-9 text-[var(--muted-foreground)]">
                <p>
                  Apply drafts screening answers and motivation statements. Contact generates
                  recruiter and networking messages. Negotiate builds BATNA analysis, geo
                  rebuttals, and ready-to-send compensation responses.
                </p>
              </div>
            </section>

            <section id="patterns" className="mt-14 border-t border-[var(--line)] pt-14">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">Patterns and analytics</h2>
              <div className="mt-8 space-y-6 text-lg leading-9 text-[var(--muted-foreground)]">
                <p>
                  Patterns shows funnel health, source quality, archetype breakdowns, and
                  targeting recommendations. Activity logs background runs, retries, and
                  system-visible workflow history.
                </p>
              </div>
            </section>

            <section id="faq" className="mt-14 border-t border-[var(--line)] pt-14 pb-16">
              <h2 className="text-4xl font-semibold text-[var(--foreground)]">FAQ</h2>
              <div className="mt-8 space-y-8 text-lg leading-9 text-[var(--muted-foreground)]">
                <div>
                  <h3 className="text-2xl font-semibold text-[var(--foreground)]">Does NextRole submit applications for me?</h3>
                  <p className="mt-3">No. It prepares and organizes the work, but submission remains human-controlled.</p>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-[var(--foreground)]">Can I use it without API credits?</h3>
                  <p className="mt-3">Yes. Manual Chat Mode exists for exactly that reason.</p>
                </div>
                <div>
                  <h3 className="text-2xl font-semibold text-[var(--foreground)]">What should I keep updated regularly?</h3>
                  <p className="mt-3">Your CV source, targeting profile, tracker statuses, follow-up timing, and provider defaults.</p>
                </div>
              </div>
            </section>
          </div>
        </article>

        <aside className="hidden border-l border-[var(--line)] pl-8 pt-10 xl:block">
          <div className="sticky top-10">
            <p className="text-2xl font-semibold text-[var(--foreground)]">On this page</p>
            <div className="mt-6 space-y-4">
              {onThisPage.map(([href, label]) => (
                <a key={href} href={`#${href}`} className="block text-base text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">
                  {label}
                </a>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </main>
  );
}
