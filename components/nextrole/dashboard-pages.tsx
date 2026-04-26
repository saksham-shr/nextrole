"use client";

import {
  Badge,
  Button,
  DataTable,
  Display,
  EmptyState,
  Eyebrow,
  InputField,
  KanbanBoard,
  MiniMetric,
  SectionTitle,
  StatCard,
  Surface,
  TabbedPanel,
  Timeline,
  TogglePills,
} from "@/components/nextrole/ui";
import type { DashboardRoute } from "@/lib/nextrole-data";
import {
  activityFeed,
  discoveries,
  kanbanColumns,
  kpis,
  providers,
  quickActions,
  reports,
  repoParity,
  resumes,
  scanSources,
  stories,
  taskRuns,
  trackerRows,
} from "@/lib/nextrole-data";

function DashboardHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">{title}</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          {subtitle}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {quickActions.slice(0, 4).map((action, index) => (
          <Button
            key={action.href}
            href={action.href}
            tone={index === 0 ? "accent" : "default"}
            ghost={index > 1}
          >
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function DashboardOverview() {
  return (
    <div className="space-y-6">
      <Surface tone="accent" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow>Welcome back</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold">Good morning, Jane.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
              You have 3 roles to review, 2 follow-ups due today, 1 failed batch
              run to retry, and 8 fresh discoveries waiting in the scanner.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button href="/dashboard/evaluate" tone="accent">
              Evaluate job
            </Button>
            <Button href="/dashboard/scanner">Run scan</Button>
            <Button href="/dashboard/tracker" ghost>
              Open tracker
            </Button>
          </div>
        </div>
      </Surface>

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

      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-6">
          <Surface className="p-5">
            <SectionTitle
              title="Needs your attention"
              subtitle="Profile, follow-up, resume, and run health"
            />
            <div className="space-y-4">
              {[
                ["Profile incomplete", "Add target salary and blocked companies to improve ranking."],
                ["1 batch run failed", "Stripe URL import hit a provider error and needs retry."],
                ["2 follow-ups due today", "Notion day-7 and Plaid post-screen thank-you are ready."],
                ["3 evaluated jobs missing tailored CV", "Generate role-specific resume versions before applying."],
              ].map(([title, body], index) => (
                <div
                  key={title}
                  className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[var(--line-soft)] pb-4 last:border-b-0"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={index < 2 ? "warn" : "default"} fill={index < 2}>
                        {index < 2 ? "Due" : "Todo"}
                      </Badge>
                      <p className="text-sm font-bold">{title}</p>
                    </div>
                    <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
                      {body}
                    </p>
                  </div>
                  <Button ghost>Open</Button>
                </div>
              ))}
            </div>
          </Surface>

          <Surface className="p-5">
            <SectionTitle
              title="Pipeline snapshot"
              subtitle="Compact Kanban view across stages"
              action={<Button href="/dashboard/tracker">Open tracker</Button>}
            />
            <KanbanBoard columns={kanbanColumns.map((col) => ({ ...col }))} />
          </Surface>

          <Surface className="p-5">
            <SectionTitle
              title="New opportunities"
              subtitle="Latest discoveries from scanner and intake flows"
            />
            <DataTable
              columns={["Job", "Source", "Fresh", "Quick score", "Reason"]}
              rows={discoveries.map((job) => [
                <div key={`${job.company}-${job.role}`}>
                  <p className="font-bold">{job.role}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {job.company}
                  </p>
                </div>,
                job.source,
                job.freshness,
                <Badge key={`${job.role}-score`} tone="accent">
                  {job.score}
                </Badge>,
                job.reason,
              ])}
            />
          </Surface>
        </div>

        <div className="space-y-6">
          <Surface className="p-5">
            <SectionTitle
              title="Quick actions"
              subtitle="Fast entry points for the whole system"
            />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {quickActions.slice(0, 6).map((action, index) => (
                <Button
                  key={action.href}
                  href={action.href}
                  tone={index === 0 ? "accent" : "default"}
                  ghost={index > 2}
                  className="w-full justify-start"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </Surface>

          <Surface className="p-5">
            <SectionTitle title="Recent activity" />
            <Timeline items={[...activityFeed]} />
          </Surface>

          <Surface tone="accent" className="p-5">
            <SectionTitle
              title="Pattern insight"
              subtitle="Last 30 days across 24 applications"
            />
            <p className="text-sm leading-7 text-[var(--muted-foreground)]">
              Staff IC roles convert 2.4× better than EM roles in this search.
              Consider reducing scanner sources and manual batch entries for EM
              roles while the funnel is still thin.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button href="/dashboard/patterns" tone="accent">
                Open patterns
              </Button>
              <Button href="/dashboard/profile" ghost>
                Tune profile
              </Button>
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}

function EvaluatePage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-5">
          <SectionTitle
            title="Source input"
            subtitle="Paste a URL or raw job description"
          />
          <div className="space-y-4">
            <InputField
              label="Job URL"
              placeholder="https://company.com/jobs/senior-product-engineer"
            />
            <InputField
              label="Raw job description"
              placeholder="Paste the job description text here..."
              textarea
            />
            <div className="grid gap-4 md:grid-cols-3">
              <InputField label="Company" placeholder="Linear" />
              <InputField label="Title" placeholder="Senior Product Engineer" />
              <InputField label="Location" placeholder="Remote · US" />
            </div>
            <InputField
              label="Optional company notes"
              placeholder="Any notes from recruiter screen, website research, or referrals..."
              textarea
            />
            <div className="flex flex-wrap gap-3">
              <Button tone="accent">Fetch preview</Button>
              <Button>Import from pipeline</Button>
              <Button ghost>Use sample input</Button>
            </div>
          </div>
        </Surface>

        <Surface tone="accent" className="p-5">
          <SectionTitle
            title="Run controls"
            subtitle="Execution mode, package type, and save behavior"
          />
          <div className="space-y-5">
            <div>
              <Eyebrow className="mb-3 block">Execution mode</Eyebrow>
              <TogglePills
                items={["Anthropic", "OpenAI", "Manual"]}
                initial="Anthropic"
              />
            </div>
            <div>
              <Eyebrow className="mb-3 block">Run type</Eyebrow>
              <TogglePills
                items={[
                  "Evaluation only",
                  "Evaluation + resume",
                  "Evaluation + prep",
                  "Full pipeline package",
                ]}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <MiniMetric label="Prompt language" value="English · DE · FR · JA" />
              <MiniMetric label="Save destination" value="Tracker + reports library" />
              <MiniMetric label="Priority tag" value="High-signal shortlist" />
              <MiniMetric label="Manual mode" value="Prompt export + validated import" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button tone="accent">Run evaluation</Button>
              <Button>Generate prompt</Button>
              <Button ghost>Paste manual result</Button>
            </div>
          </div>
        </Surface>
      </div>

      <Surface className="p-5">
        <SectionTitle
          title="Job normalization preview"
          subtitle="Parsed metadata, extraction warnings, and content preview"
        />
        <div className="grid gap-4 md:grid-cols-4">
          <MiniMetric label="Extracted title" value="Senior Product Engineer" />
          <MiniMetric label="Company" value="Linear" />
          <MiniMetric label="Location" value="Remote · US" />
          <MiniMetric label="Employment type" value="Full time" />
        </div>
        <div className="mt-4 rounded-[20px] border border-[var(--line-soft)] bg-[var(--surface-soft)] p-4 text-sm leading-7 text-[var(--muted-foreground)]">
          The normalized description preview appears here. In the backend pass
          this will include HTML extraction, deduping, ATS cleanup, freshness
          hints, and structured metadata from the original posting.
        </div>
      </Surface>

      <TabbedPanel
        tabs={[
          {
            id: "summary",
            label: "Summary",
            content: (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge tone="accent" fill>
                    Overall score 87
                  </Badge>
                  <Badge tone="ok" fill>
                    Strong Apply
                  </Badge>
                  <Badge>Queue state: completed</Badge>
                </div>
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  The role strongly matches the product-plus-infrastructure arc,
                  with convincing compensation upside and good alignment to the
                  user’s stated target companies. The biggest risk is resume
                  positioning around quantified roadmap impact.
                </p>
                <div className="grid gap-4 md:grid-cols-2">
                  <MiniMetric label="Top strengths" value="Product + systems blend, remote-friendly, title alignment" />
                  <MiniMetric label="Top risks" value="Needs stronger metrics and more public product depth" />
                </div>
              </div>
            ),
          },
          {
            id: "fit",
            label: "Fit",
            content: (
              <div className="grid gap-4 md:grid-cols-3">
                <MiniMetric label="Role summary" value="Product engineer, senior IC" />
                <MiniMetric label="Archetype match" value="Product engineering · 91" />
                <MiniMetric label="Experience positioning" value="Clear match at senior IC level" />
              </div>
            ),
          },
          {
            id: "comp",
            label: "Compensation & Level",
            content: (
              <div className="grid gap-4 md:grid-cols-3">
                <MiniMetric label="Inferred level" value="Senior / IC4 equivalent" />
                <MiniMetric label="Comp confidence" value="82 · likely within target band" />
                <MiniMetric label="Negotiation angle" value="Product + platform crossover leverage" />
              </div>
            ),
          },
          {
            id: "cv",
            label: "CV Match",
            content: (
              <div className="space-y-4">
                <MiniMetric label="Matched requirements" value="Platform depth, product partnership, ownership" />
                <MiniMetric label="Missing signals" value="More quantified product outcomes and mentoring scope" />
                <MiniMetric label="Screening risk" value="Medium without a tailored summary" />
              </div>
            ),
          },
          {
            id: "personalization",
            label: "Personalization",
            content: (
              <div className="space-y-4">
                <MiniMetric label="Resume changes" value="Rewrite summary, re-order projects, emphasize experiments" />
                <MiniMetric label="Keywords to add" value="Roadmap, experimentation, cross-functional, design systems" />
                <MiniMetric label="Proof points" value="Launch recovery, KPI uplift, product discovery influence" />
              </div>
            ),
          },
          {
            id: "interview",
            label: "Interview Signals",
            content: (
              <div className="space-y-4">
                <MiniMetric label="Likely questions" value="Ownership, collaboration, product judgment, ambiguity" />
                <MiniMetric label="Story opportunities" value="Launch recovery, infra savings, roadmap influence" />
                <MiniMetric label="Prep direction" value="Build 4 rounds around product + systems depth" />
              </div>
            ),
          },
          {
            id: "legitimacy",
            label: "Legitimacy",
            content: (
              <div className="space-y-4">
                <MiniMetric label="Freshness" value="Posted within the last 72 hours" />
                <MiniMetric label="Risk flags" value="No major legitimacy concerns found" />
                <MiniMetric label="Action confidence" value="High confidence to prioritize" />
              </div>
            ),
          },
          {
            id: "raw",
            label: "Notes / Raw Output",
            content: (
              <div className="space-y-4">
                <p className="text-sm leading-7 text-[var(--muted-foreground)]">
                  This panel is where structured JSON, manual prompt traces, and
                  provider-specific debug metadata will live once the backend is
                  connected.
                </p>
                <div className="rounded-[20px] border border-[var(--line-soft)] bg-[var(--surface-soft)] p-4 font-mono text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                  raw_output.summary.score = 87
                  <br />
                  raw_output.mode = anthropic-api
                  <br />
                  raw_output.queue_status = completed
                </div>
              </div>
            ),
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Surface className="p-5">
          <SectionTitle title="Related actions" subtitle="Everything this role can trigger next" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              "Save to tracker",
              "Generate resume",
              "Create interview prep",
              "Compare with another job",
              "Archive",
              "Export report",
            ].map((action, index) => (
              <Button key={action} tone={index === 0 ? "accent" : "default"} className="justify-start">
                {action}
              </Button>
            ))}
          </div>
        </Surface>

        <Surface className="p-5">
          <SectionTitle title="Save and link panel" subtitle="Tracker status, tags, notes, and linked artifacts" />
          <div className="grid gap-4 md:grid-cols-2">
            <MiniMetric label="Job status" value="Evaluated" />
            <MiniMetric label="Linked resume" value="Not generated yet" />
            <MiniMetric label="Linked prep" value="Ready to create" />
            <MiniMetric label="Current state" value="Completed · manual import available" />
          </div>
        </Surface>
      </div>
    </div>
  );
}

function ComparePage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Surface className="p-5">
          <SectionTitle title="Job selector" subtitle="Choose evaluated roles to rank" />
          <TogglePills items={["Linear", "Stripe", "Vercel", "Notion", "Plaid"]} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <MiniMetric label="Selection set" value="3 jobs ready to compare" />
            <MiniMetric label="Default weighting" value="Role fit + growth + logistics" />
          </div>
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle title="Compare criteria" subtitle="Weighted ranking by the Career Ops logic" />
          <TogglePills
            items={[
              "Balanced",
              "Comp-focused",
              "Growth-focused",
              "Low-risk",
            ]}
          />
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {[
              "Role fit",
              "Seniority alignment",
              "Compensation",
              "Growth",
              "Logistics",
              "Legitimacy",
            ].map((metric) => (
              <MiniMetric key={metric} label={metric} value="Weighted" />
            ))}
          </div>
        </Surface>
      </div>

      <Surface className="p-5">
        <SectionTitle title="Comparison matrix" subtitle="Side-by-side role decision support" />
        <DataTable
          columns={["Criteria", "Linear", "Stripe", "Vercel"]}
          rows={[
            ["Overall score", "87", "84", "78"],
            ["Role fit", "91", "86", "80"],
            ["Seniority alignment", "Strong", "Strong", "Moderate"],
            ["Compensation", "High", "High", "Moderate"],
            ["Growth", "Strong", "Strong", "Moderate"],
            ["Logistics", "Excellent", "Moderate", "Strong"],
            ["CV effort required", "Low", "Medium", "Low"],
            ["Legitimacy", "High", "High", "High"],
            ["Urgency", "Apply now", "Interview loop", "Follow-up pending"],
          ].map((row) => row)}
        />
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Surface className="p-5">
          <SectionTitle title="Ranking summary" subtitle="Recommended order of attention" />
          <Timeline
            items={[
              {
                title: "1. Linear · Senior Product Engineer",
                subtitle: "Best overall combination of fit, growth, and low application friction",
              },
              {
                title: "2. Stripe · IC4 Platform",
                subtitle: "Strong fit with higher process cost but strong upside",
              },
              {
                title: "3. Vercel · Senior SWE",
                subtitle: "Good role, but lower strategic upside than the top two",
              },
            ]}
          />
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle title="Next actions" subtitle="What to do after ranking" />
          <div className="grid gap-3">
            {[
              "Prioritize Linear",
              "Generate resume for Linear",
              "Mark Stripe as focus interview",
              "Archive weaker options",
              "Export comparison summary",
            ].map((action, index) => (
              <Button key={action} tone={index === 0 ? "accent" : "default"} className="justify-start">
                {action}
              </Button>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

function BatchPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Surface className="p-5">
          <SectionTitle title="Bulk input zone" subtitle="Paste many jobs, URLs, or import from other surfaces" />
          <InputField
            label="URLs or job descriptions"
            placeholder="Paste newline-separated URLs or multiple job descriptions..."
            textarea
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button tone="accent">Validate batch</Button>
            <Button>Import from pipeline</Button>
            <Button>Import from scanner</Button>
          </div>
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle title="Queue configuration" subtitle="Provider mode, saving rules, and downstream actions" />
          <div className="space-y-5">
            <TogglePills items={["Anthropic", "OpenAI", "Manual"]} />
            <div className="grid gap-4 md:grid-cols-2">
              <MiniMetric label="Save destination" value="Pipeline + tracker" />
              <MiniMetric label="Resume generation" value="Optional on accept" />
              <MiniMetric label="Auto tracker entry" value="Enabled" />
              <MiniMetric label="Duplicate handling" value="Skip + explain" />
            </div>
            <Button tone="accent">Start batch run</Button>
          </div>
        </Surface>
      </div>

      <Surface className="p-5">
        <SectionTitle title="Run progress board" subtitle="Queue and outcomes across the current batch" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Queued", "4", "Waiting for provider slots"],
            ["Running", "2", "2 roles currently being scored"],
            ["Completed", "7", "Ready to review and accept"],
            ["Failed", "1", "Provider timeout on one source"],
            ["Skipped", "3", "Detected duplicates in tracker"],
          ].map(([title, value, body], index) => (
            <StatCard
              key={title}
              label={title}
              value={value}
              sublabel={body}
              tone={index === 2 ? "ok" : index === 3 ? "bad" : "default"}
            />
          ))}
        </div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Surface className="p-5">
          <SectionTitle title="Completed results" subtitle="Review, sort, accept, or reject in bulk" />
          <DataTable
            columns={["Job", "Company", "Score", "Decision", "Action"]}
            rows={discoveries.map((job) => [
              job.role,
              job.company,
              <Badge key={`${job.role}-score`} tone="accent">
                {job.score}
              </Badge>,
              "Consider",
              "Open result",
            ])}
          />
        </Surface>
        <Surface tone="bad" className="p-5">
          <SectionTitle title="Failures" subtitle="Fix and retry broken items" />
          <Timeline
            items={[
              {
                title: "Stripe role import failed",
                subtitle: "URL extraction returned a temporary provider authorization error",
              },
              {
                title: "One duplicate skipped",
                subtitle: "Matched an existing tracker entry and was archived from the run",
              },
            ]}
          />
        </Surface>
      </div>
    </div>
  );
}

function PipelinePage() {
  return (
    <div className="space-y-6">
      <Surface className="p-5">
        <SectionTitle title="Pending items" subtitle="Lightweight intake area before full evaluation" />
        <div className="flex flex-wrap gap-3">
          <TogglePills items={["All", "Scanner", "Manual", "Batch imports", "High priority"]} />
        </div>
        <div className="mt-5">
          <DataTable
            columns={["Role", "Source", "Status", "Reason", "Actions"]}
            rows={discoveries.map((job) => [
              job.role,
              job.source,
              "Pending triage",
              job.reason,
              "Evaluate now · Send to batch · Archive",
            ])}
          />
        </div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[1fr_0.85fr]">
        <Surface className="p-5">
          <SectionTitle title="Dedup suggestions" subtitle="Explain overlaps before they pollute the tracker" />
          <Timeline
            items={[
              {
                title: "Plaid Senior Backend Engineer",
                subtitle: "Looks like a refreshed version of an already tracked role from last week",
              },
              {
                title: "Vercel Senior SWE",
                subtitle: "Imported through batch but already exists as an active application entry",
              },
            ]}
          />
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle title="Bulk actions" subtitle="Fast routing for intake and triage" />
          <div className="grid gap-3">
            {[
              "Evaluate selected now",
              "Send selected to batch",
              "Mark duplicates",
              "Archive low-signal roles",
              "Edit metadata",
            ].map((action, index) => (
              <Button key={action} tone={index === 0 ? "accent" : "default"} className="justify-start">
                {action}
              </Button>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

function ScannerPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Last run", "Today · 09:14"],
          ["Configured sources", "12 active"],
          ["Discovered this week", "31 roles"],
          ["Duplicates skipped", "9"],
          ["Sources needing review", "2"],
        ].map(([label, value], index) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            tone={index === 2 ? "accent" : "default"}
          />
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
        <Surface className="p-5">
          <SectionTitle title="Saved sources" subtitle="Configured company sets, ATS feeds, and custom targets" />
          <DataTable
            columns={["Source", "Type", "Target roles", "Region", "Success"]}
            rows={scanSources.map((source) => [
              source.name,
              source.type,
              source.roles,
              source.region,
              source.success,
            ])}
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button tone="accent">Add source</Button>
            <Button>Test source</Button>
            <Button ghost>Pause selected</Button>
          </div>
        </Surface>

        <Surface tone="accent" className="p-5">
          <SectionTitle title="Scan filters and controls" subtitle="Role family, geography, work mode, and blocklists" />
          <div className="grid gap-4 md:grid-cols-2">
            <InputField label="Keywords" placeholder="Platform, product eng, staff IC" />
            <InputField label="Location" placeholder="US, Remote, EU" />
            <InputField label="Salary floor" placeholder="$220k total comp target" />
            <InputField label="Blocklist" placeholder="Avoid agencies, fintech ops, pure EM" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Button tone="accent">Scan all</Button>
            <Button>Scan selected</Button>
            <Button ghost>Preview targets</Button>
          </div>
        </Surface>
      </div>

      <Surface className="p-5">
        <SectionTitle title="Discovered jobs" subtitle="Fresh opportunities ready for pipeline or direct evaluation" />
        <DataTable
          columns={["Job", "Company", "Freshness", "Reason", "Actions"]}
          rows={discoveries.map((job) => [
            job.role,
            job.company,
            job.freshness,
            job.reason,
            "Add to pipeline · Evaluate directly · Ignore",
          ])}
        />
      </Surface>

      <Surface tone="bad" className="p-5">
        <SectionTitle title="Dedup and skipped list" subtitle="Visibility into what the system ignored and why" />
        <Timeline
          items={[
            {
              title: "Skipped 3 duplicates from career site refreshes",
              subtitle: "Already active in tracker with the same company/title combination",
            },
            {
              title: "Source review needed for one ATS feed",
              subtitle: "Returned stale results that were all older than the freshness threshold",
            },
          ]}
        />
      </Surface>
    </div>
  );
}

function TrackerPage() {
  return (
    <div className="space-y-6">
      <Surface tone="accent" className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <SectionTitle
              title="Tracker command center"
              subtitle="Backbone of the product: statuses, artifacts, notes, and history"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              "All Active",
              "Needs Action",
              "Interviews",
              "High Score / Not Applied",
              "Follow-up Due",
              "Archived",
            ].map((view, index) => (
              <Badge key={view} tone={index === 0 ? "accent" : "default"} fill={index === 0}>
                {view}
              </Badge>
            ))}
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Active jobs", "24"],
          ["Interviews", "6"],
          ["Follow-up due", "4"],
          ["Assets linked", "31"],
        ].map(([label, value]) => (
          <StatCard key={label} label={label} value={value} />
        ))}
      </div>

      <Surface className="p-5">
        <SectionTitle title="Filter bar" subtitle="Stage, score, archetype, source, and asset filters" />
        <div className="flex flex-wrap gap-2">
          <TogglePills
            items={[
              "Status",
              "Score",
              "Archetype",
              "Company",
              "Source",
              "Follow-up",
              "Has resume",
              "Has report",
              "Has prep",
            ]}
          />
        </div>
      </Surface>

      <TabbedPanel
        tabs={[
          {
            id: "table",
            label: "Table view",
            content: (
              <DataTable
                columns={[
                  "Job",
                  "Company",
                  "Stage",
                  "Score",
                  "Archetype",
                  "Source",
                  "Next action",
                  "Follow-up due",
                ]}
                rows={trackerRows.map((row) => [
                  row.job,
                  row.company,
                  row.stage,
                  row.score,
                  row.archetype,
                  row.source,
                  row.nextAction,
                  row.followup,
                ])}
              />
            ),
          },
          {
            id: "board",
            label: "Board view",
            content: <KanbanBoard columns={kanbanColumns.map((col) => ({ ...col }))} />,
          },
          {
            id: "grouped",
            label: "Grouped view",
            content: (
              <div className="grid gap-4 md:grid-cols-2">
                <Surface className="p-4">
                  <SectionTitle title="Needs action" />
                  <Timeline
                    items={[
                      {
                        title: "Linear role needs tailored resume",
                        subtitle: "Strong score but not applied yet",
                      },
                      {
                        title: "Vercel follow-up due tomorrow",
                        subtitle: "Day-7 bump ready in follow-up page",
                      },
                    ]}
                  />
                </Surface>
                <Surface className="p-4">
                  <SectionTitle title="Interviews in flight" />
                  <Timeline
                    items={[
                      {
                        title: "Stripe onsite prep pack ready",
                        subtitle: "4 rounds, 6 stories, 1 company dossier",
                      },
                      {
                        title: "Retool hiring manager screen",
                        subtitle: "Question bank drafted and linked to story bank",
                      },
                    ]}
                  />
                </Surface>
              </div>
            ),
          },
        ]}
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Surface className="p-5">
          <SectionTitle title="Details drawer preview" subtitle="What opens from a tracker row" />
          <TogglePills items={["Overview", "Report", "Resume", "Interview Prep", "Follow-up", "Notes", "Activity"]} />
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <MiniMetric label="Role" value="Stripe IC4 platform role" />
            <MiniMetric label="Current stage" value="Interview" />
            <MiniMetric label="Report link" value="Full evaluation report attached" />
            <MiniMetric label="Resume link" value="Tailored resume v2 attached" />
          </div>
        </Surface>
        <Surface className="p-5">
          <SectionTitle title="Timeline and history" subtitle="Every major event on the job" />
          <Timeline
            items={[
              {
                title: "Created from scanner discovery",
                subtitle: "Added to pipeline then evaluated",
              },
              {
                title: "Evaluation completed",
                subtitle: "Score 84 with strong fit to platform archetype",
              },
              {
                title: "Resume generated",
                subtitle: "Tailored PDF saved and linked",
              },
              {
                title: "Interview scheduled",
                subtitle: "Onsite pack created with company research",
              },
            ]}
          />
        </Surface>
      </div>
    </div>
  );
}

function ReportsPage() {
  return (
    <div className="space-y-6">
      <Surface className="p-5">
        <SectionTitle title="Filters" subtitle="Date, company, score, provider, and report type" />
        <TogglePills
          items={["Last 7 days", "High score", "Anthropic", "Manual mode", "Full evaluation"]}
        />
      </Surface>
      <Surface className="p-5">
        <SectionTitle title="Reports library" subtitle="All generated evaluation reports" />
        <DataTable
          columns={["Report", "Company", "Score", "Type", "Actions"]}
          rows={reports.map((report) => [
            report.title,
            report.company,
            report.score,
            report.type,
            `Open · Compare · Resume`,
          ])}
        />
      </Surface>
    </div>
  );
}

function ReportDetailPage() {
  return (
    <div className="space-y-6">
      <Surface tone="accent" className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow>Report detail</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold">
              Stripe IC4 platform report
            </h2>
            <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
              Full long-form report layout with summary rail, decision blocks,
              provenance metadata, and linked downstream actions.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge tone="accent" fill>
              Score 84
            </Badge>
            <Badge tone="ok" fill>
              Strong Apply
            </Badge>
          </div>
        </div>
      </Surface>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Surface className="p-5">
          <SectionTitle title="Executive summary and blocks" subtitle="Reader-focused report layout" />
          <div className="space-y-4 text-sm leading-7 text-[var(--muted-foreground)]">
            <p>
              This page represents the final report reading experience: sticky
              summary rail on desktop, block navigation, export controls, linked
              resume generation, and compare actions back into the pipeline.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              <MiniMetric label="Top strength" value="Strong platform fit and seniority alignment" />
              <MiniMetric label="Top risk" value="Needs sharper product impact bullets in base CV" />
              <MiniMetric label="Interview angle" value="Systems + collaboration stories likely matter" />
              <MiniMetric label="Legitimacy" value="Fresh and high confidence" />
            </div>
          </div>
        </Surface>
        <Surface className="p-5">
          <SectionTitle title="Linked actions" subtitle="Everything this report can trigger" />
          <div className="grid gap-3">
            {[
              "Open linked tracker item",
              "Generate tailored resume",
              "Create interview prep",
              "Compare with another role",
              "Rerun evaluation",
            ].map((action, index) => (
              <Button key={action} tone={index === 0 ? "accent" : "default"} className="justify-start">
                {action}
              </Button>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

function ResumesPage() {
  return (
    <div className="space-y-6">
      <Surface tone="accent" className="p-5">
        <SectionTitle title="Base CV readiness" subtitle="Document health before generating more variants" />
        <div className="grid gap-4 md:grid-cols-4">
          <MiniMetric label="Base CV completeness" value="87%" />
          <MiniMetric label="Proof points loaded" value="23" />
          <MiniMetric label="Recent tailored resumes" value="8" />
          <MiniMetric label="PDF exports" value="12" />
        </div>
      </Surface>
      <div className="grid gap-4 lg:grid-cols-2">
        {resumes.map((resume) => (
          <Surface key={resume.id} className="p-5">
            <Eyebrow>{resume.company}</Eyebrow>
            <h3 className="mt-2 text-lg font-bold">{resume.title}</h3>
            <div className="mt-4 flex flex-wrap gap-2">
              <Badge tone="accent">{resume.coverage} keyword coverage</Badge>
              <Badge>{resume.status}</Badge>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button href={`/dashboard/resumes/${resume.id}`} tone="accent">
                Open resume
              </Button>
              <Button>Download PDF</Button>
            </div>
          </Surface>
        ))}
      </div>
    </div>
  );
}

function ResumeDetailPage() {
  return (
    <div className="space-y-6">
      <Surface tone="accent" className="p-5">
        <SectionTitle title="Resume preview" subtitle="Rendered variant linked to a target role" />
        <div className="grid gap-4 md:grid-cols-4">
          <MiniMetric label="Target company" value="Vercel" />
          <MiniMetric label="Coverage" value="91%" />
          <MiniMetric label="Status" value="Final" />
          <MiniMetric label="Source report" value="Open linked report" />
        </div>
      </Surface>
      <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <Surface className="p-6">
          <EmptyState
            title="Rendered resume preview area"
            body="The frontend is ready for the HTML resume preview pane, visual diffing against the base CV, and downloadable PDF actions once the backend generation pipeline is wired."
          />
        </Surface>
        <Surface className="p-5">
          <SectionTitle title="Metadata and actions" subtitle="Change summary, coverage, and artifact links" />
          <div className="grid gap-4">
            <MiniMetric label="Change summary" value="Summary rewritten, projects reordered, keywords injected" />
            <MiniMetric label="Linked job" value="Vercel Senior SWE" />
            <MiniMetric label="Compare to base CV" value="Ready" />
          </div>
          <div className="mt-5 grid gap-3">
            {[
              "Download PDF",
              "Regenerate resume",
              "Duplicate variant",
              "Open linked tracker item",
            ].map((action, index) => (
              <Button key={action} tone={index === 0 ? "accent" : "default"} className="justify-start">
                {action}
              </Button>
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

function CvPage() {
  return (
    <div className="space-y-6">
      <Surface className="p-5">
        <SectionTitle title="Base CV editor" subtitle="Summary, experience, projects, education, and skills" />
        <div className="grid gap-4">
          <InputField label="Professional summary" placeholder="Candidate summary..." textarea />
          <InputField label="Experience and projects" placeholder="Paste structured CV content..." textarea />
        </div>
      </Surface>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Surface className="p-5">
          <SectionTitle title="Proof-point digest" subtitle="Achievements, metrics, and stories that power tailoring" />
          <Timeline
            items={[
              {
                title: "Reduced infrastructure spend by 28%",
                subtitle: "Great proof point for backend/platform roles",
              },
              {
                title: "Recovered a launch under deadline pressure",
                subtitle: "Strong interview and resume story for ownership",
              },
              {
                title: "Influenced roadmap without formal authority",
                subtitle: "Useful for PM, product eng, and staff IC narratives",
              },
            ]}
          />
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle title="Completeness checks" subtitle="What the system still wants from the base CV" />
          <Timeline
            items={[
              {
                title: "Add more measurable product outcomes",
                subtitle: "Current base CV is strong on systems depth but lighter on GTM impact",
              },
              {
                title: "Strengthen recent leadership examples",
                subtitle: "Needed for staff-level and cross-functional role targeting",
              },
            ]}
          />
        </Surface>
      </div>
    </div>
  );
}

function ProfilePage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Surface className="p-5">
        <SectionTitle title="Targeting profile" subtitle="Role families, geographies, compensation, and exclusions" />
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Target role families" placeholder="Platform, product eng, staff IC" />
          <InputField label="Role exclusions" placeholder="Pure EM, agency-heavy roles" />
          <InputField label="Geography" placeholder="US remote, NYC, EU optional" />
          <InputField label="Work preference" placeholder="Remote, hybrid, occasional onsite" />
          <InputField label="Compensation target" placeholder="$220k+ total comp" />
          <InputField label="Industry targets" placeholder="Developer tools, fintech infra, product-led SaaS" />
        </div>
      </Surface>
      <Surface tone="accent" className="p-5">
        <SectionTitle title="System impact" subtitle="How profile choices affect the rest of the product" />
        <div className="grid gap-4">
          {[
            "Scanner filters and source ranking",
            "Evaluation weighting and compare logic",
            "Pattern analysis recommendations",
            "Resume prioritization and keyword emphasis",
          ].map((item) => (
            <MiniMetric key={item} label="Used by" value={item} />
          ))}
        </div>
      </Surface>
    </div>
  );
}

function ProvidersPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-3">
        {providers.map((provider, index) => (
          <Surface key={provider.name} tone={index === 2 ? "accent" : "default"} className="p-5">
            <Eyebrow>{provider.mode}</Eyebrow>
            <h3 className="mt-2 text-lg font-bold">{provider.name}</h3>
            <div className="mt-4 grid gap-3">
              <MiniMetric label="Status" value={provider.status} />
              <MiniMetric label="Last run" value={provider.lastRun} />
              <MiniMetric label="Default model" value={provider.model} />
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button tone={index === 2 ? "accent" : "default"}>
                {index === 2 ? "Open guide" : "Connect or update"}
              </Button>
              <Button ghost>{index === 2 ? "Import result" : "Test provider"}</Button>
            </div>
          </Surface>
        ))}
      </div>
      <Surface className="p-5">
        <SectionTitle title="Manual mode guide" subtitle="Prompt export and result import experience" />
        <div className="grid gap-4 md:grid-cols-2">
          <MiniMetric label="Generate prompt" value="Copyable and downloadable prompt package" />
          <MiniMetric label="Paste result" value="Validated import back into the workflow" />
          <MiniMetric label="Works for" value="Evaluate, compare, apply, follow-up, prep, deep research" />
          <MiniMetric label="Why it exists" value="Claude Pro and ChatGPT Plus are not API quota" />
        </div>
      </Surface>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Surface className="p-5">
        <SectionTitle title="Account and defaults" subtitle="Security, notifications, language, and output preferences" />
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Display name" placeholder="Jane Candidate" />
          <InputField label="Email" placeholder="jane@example.com" />
          <InputField label="Default language" placeholder="English output with DE/FR/JA packs available" />
          <InputField label="Notification summary" placeholder="Daily digest, task failures, follow-up reminders" />
        </div>
      </Surface>
      <Surface tone="accent" className="p-5">
        <SectionTitle title="Account actions" subtitle="Export, security, and deletion controls" />
        <div className="grid gap-3">
          {[
            "Change password",
            "Export account data",
            "Download reports archive",
            "Review connected sessions",
            "Delete account",
          ].map((action, index) => (
            <Button key={action} tone={index === 4 ? "bad" : "default"} className="justify-start">
              {action}
            </Button>
          ))}
        </div>
      </Surface>
    </div>
  );
}

function InterviewPrepPage() {
  return (
    <div className="space-y-6">
      <Surface className="p-5">
        <SectionTitle title="Prep selector" subtitle="Generate packs from tracker roles or reports" />
        <TogglePills items={["Stripe IC4 platform", "Linear product engineer", "Create new prep pack"]} />
      </Surface>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.95fr]">
        <Surface tone="accent" className="p-5">
          <SectionTitle title="Round-by-round plan" subtitle="Recruiter, hiring manager, technical, panel, final" />
          <Timeline
            items={[
              {
                title: "Recruiter screen",
                subtitle: "High-level narrative, compensation range, timing, and motivation",
              },
              {
                title: "Hiring manager",
                subtitle: "Ownership stories, tradeoffs, product judgment, and impact metrics",
              },
              {
                title: "Technical / portfolio",
                subtitle: "Systems depth, architecture choices, and collaboration examples",
              },
              {
                title: "Panel / final",
                subtitle: "Leadership, ambiguity, influence, and cross-functional trust",
              },
            ]}
          />
        </Surface>
        <Surface className="p-5">
          <SectionTitle title="Matched stories and notes" subtitle="Story bank alignment plus user prep notes" />
          <div className="space-y-4">
            {stories.map((story) => (
              <MiniMetric
                key={story.title}
                label={`${story.competency} · ${story.archetype}`}
                value={story.title}
              />
            ))}
          </div>
        </Surface>
      </div>
    </div>
  );
}

function StoryBankPage() {
  return (
    <div className="space-y-6">
      <Surface className="p-5">
        <SectionTitle title="Story library" subtitle="Card, table, and competency coverage views" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {stories.map((story) => (
            <Surface key={story.title} className="p-4">
              <Eyebrow>{story.competency}</Eyebrow>
              <h3 className="mt-2 text-lg font-bold">{story.title}</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge>{story.archetype}</Badge>
                <Badge tone={story.impact === "High" ? "accent" : "default"}>
                  {story.impact} impact
                </Badge>
              </div>
            </Surface>
          ))}
        </div>
      </Surface>
      <Surface tone="accent" className="p-5">
        <SectionTitle title="Coverage map" subtitle="Behavioral competency gaps the app should surface" />
        <div className="grid gap-4 md:grid-cols-4">
          {[
            "Leadership",
            "Ambiguity",
            "Conflict",
            "Ownership",
            "Failure",
            "Influence",
            "Execution",
            "Technical depth",
          ].map((competency) => (
            <MiniMetric key={competency} label="Coverage" value={competency} />
          ))}
        </div>
      </Surface>
    </div>
  );
}

function ApplyPage() {
  return (
    <div className="space-y-6">
      <Surface tone="accent" className="p-5">
        <SectionTitle title="Application assistant" subtitle="Tailored answers without auto-submission" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[
            "Why this company",
            "Why this role",
            "Tell us about yourself",
            "Salary expectations",
            "Notable project",
            "Cover letter response",
          ].map((question) => (
            <MiniMetric key={question} label="Draft template" value={question} />
          ))}
        </div>
      </Surface>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Surface className="p-5">
          <SectionTitle title="Drafted answers" subtitle="Rewrite, shorten, formalize, or save per role" />
          <InputField
            label="Answer draft"
            placeholder="Generated answers will appear here once the backend prompt runner is wired..."
            textarea
          />
          <div className="mt-4 flex flex-wrap gap-3">
            <Button tone="accent">Copy answer</Button>
            <Button>Shorten</Button>
            <Button>Formalize</Button>
            <Button ghost>Save notes</Button>
          </div>
        </Surface>
        <Surface className="p-5">
          <SectionTitle title="Manual checklist" subtitle="Keep the human in the loop before every application" />
          <Timeline
            items={[
              {
                title: "Verify salary and location fields manually",
                subtitle: "The product drafts guidance but never submits for you",
              },
              {
                title: "Confirm links and attachments",
                subtitle: "Match the tailored resume and any portfolio links to the target role",
              },
              {
                title: "Update tracker after submission",
                subtitle: "Move status to Applied so follow-up timing starts",
              },
            ]}
          />
        </Surface>
      </div>
    </div>
  );
}

function FollowupPage() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ["Overdue", "1"],
          ["Due today", "2"],
          ["Due this week", "4"],
          ["Waiting", "7"],
        ].map(([label, value], index) => (
          <StatCard
            key={label}
            label={label}
            value={value}
            tone={index === 0 ? "bad" : index === 1 ? "warn" : "default"}
          />
        ))}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
        <Surface className="p-5">
          <SectionTitle title="Follow-up queue" subtitle="Generated drafts and timing logic tied to tracker entries" />
          <DataTable
            columns={["Job", "Stage", "Urgency", "Draft type", "Action"]}
            rows={[
              ["Notion Staff PM", "Applied", "Due today", "Day-7 bump", "Open draft"],
              ["Plaid Senior Backend", "Screen completed", "Due this week", "Post-screen thank you", "Open draft"],
              ["Vercel Senior SWE", "Applied", "Waiting", "No-response bump", "Snooze"],
            ]}
          />
        </Surface>
        <Surface tone="accent" className="p-5">
          <SectionTitle title="Draft workspace" subtitle="Message types the product needs to support" />
          <Timeline
            items={[
              {
                title: "Recruiter follow-up",
                subtitle: "Friendly bump after application with renewed interest",
              },
              {
                title: "Hiring manager nudge",
                subtitle: "Targeted note after a warm introduction or prior touchpoint",
              },
              {
                title: "Post-interview thank-you",
                subtitle: "Close the loop while reinforcing role fit and interest",
              },
            ]}
          />
        </Surface>
      </div>
    </div>
  );
}

function PatternsPage() {
  return (
    <div className="space-y-6">
      <Surface tone="accent" className="p-5">
        <SectionTitle title="Funnel overview" subtitle="Conversion visibility across evaluation, application, interviews, and offers" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          {[
            ["Evaluated", "142"],
            ["Applied", "62"],
            ["Screens", "18"],
            ["Onsides / Finals", "9"],
            ["Offers", "1"],
          ].map(([label, value]) => (
            <StatCard key={label} label={label} value={value} />
          ))}
        </div>
      </Surface>
      <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Surface className="p-5">
          <SectionTitle title="Segment breakdowns" subtitle="Archetype, company type, location, and stage performance" />
          <div className="grid gap-4 md:grid-cols-2">
            <MiniMetric label="Best converting archetype" value="Staff IC roles" />
            <MiniMetric label="Weakest segment" value="EM roles from broad ATS sources" />
            <MiniMetric label="Strongest geography" value="Remote-first US product infra" />
            <MiniMetric label="Most common drop-off" value="Applied → screen" />
          </div>
        </Surface>
        <Surface className="p-5">
          <SectionTitle title="Recommendations" subtitle="What the app should push the user toward next" />
          <Timeline
            items={[
              {
                title: "Target fewer low-signal EM roles",
                subtitle: "Staff IC roles are converting meaningfully better in this search",
              },
              {
                title: "Improve resume metrics on product-facing roles",
                subtitle: "Strong evaluations are not always turning into interviews",
              },
              {
                title: "Increase follow-up consistency",
                subtitle: "Response rate appears higher when a day-7 bump is sent",
              },
            ]}
          />
        </Surface>
      </div>
    </div>
  );
}

function DeepResearchPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Surface className="p-5">
        <SectionTitle title="Deep company research" subtitle="Standalone or launched from a tracker role" />
        <InputField label="Company or job" placeholder="Stripe, Linear, or a linked tracker role" />
        <InputField
          label="Research brief"
          placeholder="Focus on market position, product strategy, risks, and interview talking points..."
          textarea
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button tone="accent">Generate dossier</Button>
          <Button>Launch from tracker item</Button>
        </div>
      </Surface>
      <Surface tone="accent" className="p-5">
        <SectionTitle title="Expected output" subtitle="What the full backend should populate here" />
        <Timeline
          items={[
            {
              title: "Company context and product strategy",
              subtitle: "Leadership, market, product shape, risk signals",
            },
            {
              title: "Role context and hiring signals",
              subtitle: "How this specific role fits the company’s direction",
            },
            {
              title: "Questions to ask",
              subtitle: "Useful prompts for recruiter, hiring manager, and panel rounds",
            },
          ]}
        />
      </Surface>
    </div>
  );
}

function ContactPage() {
  return (
    <div className="space-y-6">
      <Surface className="p-5">
        <SectionTitle title="Target selector" subtitle="Recruiter intro, hiring manager outreach, peer networking, and warm follow-ups" />
        <div className="grid gap-4 md:grid-cols-2">
          <InputField label="Target company / role" placeholder="Stripe IC4 platform role" />
          <InputField label="Relationship context" placeholder="Recruiter, manager, peer, referral" />
          <InputField label="Tone" placeholder="Warm, concise, high-signal" />
          <InputField label="Outcome wanted" placeholder="Referral, intro call, status update" />
        </div>
      </Surface>
      <Surface tone="accent" className="p-5">
        <SectionTitle title="Draft variants" subtitle="Networking messages tied to real job context" />
        <div className="grid gap-4 md:grid-cols-2">
          {[
            "Recruiter intro",
            "Hiring manager outreach",
            "Peer networking note",
            "Post-application nudge",
          ].map((variant) => (
            <MiniMetric key={variant} label="Variant" value={variant} />
          ))}
        </div>
      </Surface>
    </div>
  );
}

function TrainingPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Surface className="p-5">
        <SectionTitle title="Training evaluator" subtitle="Assess courses and certificates against role goals" />
        <InputField label="Course or certification" placeholder="AWS cert, PM course, AI systems program" />
        <InputField
          label="What are you considering?"
          placeholder="Paste course details, outcomes, or syllabus..."
          textarea
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button tone="accent">Evaluate training</Button>
          <Button ghost>Compare alternatives</Button>
        </div>
      </Surface>
      <Surface tone="accent" className="p-5">
        <SectionTitle title="Assessment dimensions" subtitle="What the backend scoring model will fill in" />
        <div className="grid gap-4">
          <MiniMetric label="Role fit" value="Does this help the target role family?" />
          <MiniMetric label="Time / ROI" value="Is the effort justified compared with projects or applications?" />
          <MiniMetric label="Alternative path" value="Could a project or deeper job targeting perform better?" />
        </div>
      </Surface>
    </div>
  );
}

function ProjectPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Surface className="p-5">
        <SectionTitle title="Project evaluator" subtitle="Score portfolio ideas by hiring signal and leverage" />
        <InputField label="Project idea" placeholder="AI support copilot, observability dashboard, product experiment case study" />
        <InputField
          label="Project details"
          placeholder="Describe the scope, user, stack, and story you want this project to tell..."
          textarea
        />
        <div className="mt-4 flex flex-wrap gap-3">
          <Button tone="accent">Evaluate project</Button>
          <Button>Compare alternatives</Button>
        </div>
      </Surface>
      <Surface tone="accent" className="p-5">
        <SectionTitle title="Hiring-signal lenses" subtitle="How the platform should judge project usefulness" />
        <div className="grid gap-4">
          <MiniMetric label="Differentiation" value="Will this stand out in the target job family?" />
          <MiniMetric label="Portfolio fit" value="Does it fill a gap in the current CV and project set?" />
          <MiniMetric label="Scope sanity" value="Can the candidate actually finish this?" />
          <MiniMetric label="Narrative strength" value="Will it produce strong interview and resume stories?" />
        </div>
      </Surface>
    </div>
  );
}

function ActivityPage() {
  return (
    <div className="space-y-6">
      <Surface className="p-5">
        <SectionTitle title="Task runs" subtitle="Transparent history for evaluate, compare, batch, scan, PDF, prep, and follow-up jobs" />
        <DataTable
          columns={["Run", "Type", "Status", "Output"]}
          rows={taskRuns.map((task) => [
            task.name,
            task.type,
            task.status,
            task.output,
          ])}
        />
      </Surface>
      <Surface tone="accent" className="p-5">
        <SectionTitle title="System parity checklist" subtitle="Frontend coverage tied directly to the repo feature map" />
        <div className="flex flex-wrap gap-2">
          {repoParity.map((feature) => (
            <Badge key={feature}>{feature}</Badge>
          ))}
        </div>
      </Surface>
    </div>
  );
}

export function DashboardRoutePage({ route }: { route: DashboardRoute }) {
  return (
    <div className="space-y-6">
      <DashboardHeader title={route.title} subtitle={route.subtitle} />
      {renderRoute(route)}
    </div>
  );
}

function renderRoute(route: DashboardRoute) {
  switch (route.key) {
    case "dashboard":
      return <DashboardOverview />;
    case "evaluate":
      return <EvaluatePage />;
    case "compare":
      return <ComparePage />;
    case "batch":
      return <BatchPage />;
    case "pipeline":
      return <PipelinePage />;
    case "scanner":
      return <ScannerPage />;
    case "tracker":
      return <TrackerPage />;
    case "reports":
      return <ReportsPage />;
    case "reports.detail":
      return <ReportDetailPage />;
    case "resumes":
      return <ResumesPage />;
    case "resumes.detail":
      return <ResumeDetailPage />;
    case "cv":
      return <CvPage />;
    case "profile":
      return <ProfilePage />;
    case "providers":
      return <ProvidersPage />;
    case "settings":
      return <SettingsPage />;
    case "interview-prep":
      return <InterviewPrepPage />;
    case "story-bank":
      return <StoryBankPage />;
    case "apply":
      return <ApplyPage />;
    case "followup":
      return <FollowupPage />;
    case "patterns":
      return <PatternsPage />;
    case "deep":
      return <DeepResearchPage />;
    case "contact":
      return <ContactPage />;
    case "training":
      return <TrainingPage />;
    case "project":
      return <ProjectPage />;
    case "activity":
      return <ActivityPage />;
    default:
      return (
        <EmptyState
          title="This route is not configured yet"
          body="The dashboard catch-all is working, but this route key was not matched to a page implementation."
        />
      );
  }
}
