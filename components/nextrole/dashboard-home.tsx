"use client";

import {
  Badge,
  Button,
  Display,
  Eyebrow,
  KanbanBoard,
  SectionTitle,
  StatCard,
  Surface,
  Timeline,
} from "@/components/nextrole/ui";

type AttentionItem = {
  title: string;
  body: string;
  href: string;
  tone: "warn" | "default";
};

type TaskRun = {
  id: string;
  type: string;
  status: string;
  progress_message: string | null;
  error: string | null;
  created_at: string;
};

type KanbanCol = {
  title: string;
  items: string[];
};

const STATUS_TONE: Record<string, "ok" | "bad" | "warn" | "default"> = {
  completed: "ok",
  failed: "bad",
  running: "warn",
  queued: "default",
  cancelled: "default",
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

const QUICK_ACTIONS = [
  { label: "Evaluate job", href: "/dashboard/evaluate", accent: true },
  { label: "Add to pipeline", href: "/dashboard/pipeline", accent: false },
  { label: "Open tracker", href: "/dashboard/tracker", accent: false },
  { label: "Run scanner", href: "/dashboard/scanner", accent: false },
  { label: "Settings / CV", href: "/dashboard/settings", accent: false },
  { label: "Providers", href: "/dashboard/providers", accent: false },
];

export function DashboardHome({
  userName,
  hasCV,
  hasProvider,
  kpis,
  attentionItems,
  kanban,
  recentRuns,
}: {
  userName: string;
  hasCV: boolean;
  hasProvider: boolean;
  kpis: {
    active: number;
    interviews: number;
    offers: number;
    highScore: number;
    pending: number;
  };
  attentionItems: AttentionItem[];
  kanban: KanbanCol[];
  recentRuns: TaskRun[];
}) {
  const setupComplete = hasCV && hasProvider;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Dashboard</Display>
      </div>

      {/* Welcome banner */}
      <Surface tone={setupComplete ? "accent" : "warn"} className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Eyebrow>Welcome back</Eyebrow>
            <h2 className="mt-2 text-2xl font-bold">
              {setupComplete
                ? `Good to see you, ${userName}.`
                : `Hi ${userName} — let's finish setup.`}
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--muted-foreground)]">
              {setupComplete
                ? kpis.active === 0
                  ? "Pipeline is empty — add a role and run your first evaluation to get started."
                  : `${kpis.active} active ${kpis.active === 1 ? "role" : "roles"} in the pipeline.${kpis.interviews > 0 ? ` ${kpis.interviews} in interview.` : ""}${kpis.highScore > 0 ? ` ${kpis.highScore} high-score ${kpis.highScore === 1 ? "role" : "roles"} not yet applied.` : ""}`
                : "Add your CV in Settings and an API key in Providers before running your first evaluation."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {setupComplete ? (
              <>
                <Button href="/dashboard/evaluate" tone="accent">
                  Evaluate job
                </Button>
                <Button href="/dashboard/pipeline">Add to pipeline</Button>
                <Button href="/dashboard/tracker" ghost>
                  Open tracker
                </Button>
              </>
            ) : (
              <>
                {!hasCV && (
                  <Button href="/dashboard/settings" tone="accent">
                    Add CV
                  </Button>
                )}
                {!hasProvider && (
                  <Button href="/dashboard/providers" tone={hasCV ? "accent" : "default"}>
                    Add provider
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </Surface>

      {/* KPI row */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard
          label="Active"
          value={String(kpis.active)}
          sublabel="in pipeline"
          tone={kpis.active > 0 ? "accent" : "default"}
        />
        <StatCard
          label="Interviews"
          value={String(kpis.interviews)}
          sublabel="in flight"
          tone={kpis.interviews > 0 ? "warn" : "default"}
        />
        <StatCard
          label="Offers"
          value={String(kpis.offers)}
          sublabel="received"
          tone={kpis.offers > 0 ? "ok" : "default"}
        />
        <StatCard
          label="High score"
          value={String(kpis.highScore)}
          sublabel="score ≥4 not applied"
          tone={kpis.highScore > 0 ? "accent" : "default"}
        />
        <StatCard
          label="Pending triage"
          value={String(kpis.pending)}
          sublabel="in intake"
          tone={kpis.pending > 0 ? "default" : "default"}
        />
      </div>

      {/* Main two-column layout */}
      <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        {/* Left column */}
        <div className="space-y-6">
          {/* Attention items */}
          {attentionItems.length > 0 && (
            <Surface className="p-5">
              <SectionTitle
                title="Needs your attention"
                subtitle={`${attentionItems.length} ${attentionItems.length === 1 ? "item" : "items"} requiring action`}
              />
              <div className="space-y-1">
                {attentionItems.map((item) => (
                  <div
                    key={item.title}
                    className="flex flex-wrap items-start justify-between gap-4 border-b border-dashed border-[var(--line-soft)] py-3 last:border-b-0"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge tone={item.tone} fill={item.tone === "warn"}>
                          {item.tone === "warn" ? "Action" : "Todo"}
                        </Badge>
                        <p className="text-sm font-bold">{item.title}</p>
                      </div>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                        {item.body}
                      </p>
                    </div>
                    <Button href={item.href} ghost tone={item.tone}>
                      Open
                    </Button>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {/* Empty state when no attention needed */}
          {attentionItems.length === 0 && setupComplete && (
            <Surface tone="ok" className="p-5">
              <SectionTitle
                title="All clear"
                subtitle="No open attention items — your setup is complete and pipeline is healthy"
              />
            </Surface>
          )}

          {/* Pipeline Kanban snapshot */}
          <Surface className="p-5">
            <SectionTitle
              title="Pipeline snapshot"
              subtitle="Current jobs across active stages"
              action={<Button href="/dashboard/tracker">Open tracker</Button>}
            />
            {kanban.every((col) => col.items.length === 0) ? (
              <div className="py-6 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  No active jobs yet — add roles in the pipeline and run evaluations to populate this.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <Button tone="accent" href="/dashboard/pipeline">
                    Add to pipeline
                  </Button>
                </div>
              </div>
            ) : (
              <KanbanBoard columns={kanban} />
            )}
          </Surface>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Quick actions */}
          <Surface className="p-5">
            <SectionTitle
              title="Quick actions"
              subtitle="Fast entry points"
            />
            <div className="grid gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.href}
                  href={action.href}
                  tone={action.accent ? "accent" : "default"}
                  className="w-full justify-start"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </Surface>

          {/* Recent task runs */}
          <Surface className="p-5">
            <SectionTitle
              title="Recent activity"
              subtitle="Task runs and background jobs"
              action={<Button href="/dashboard/activity" ghost>All activity</Button>}
            />
            {recentRuns.length === 0 ? (
              <p className="py-4 text-center text-sm text-[var(--muted-foreground)]">
                No tasks run yet.
              </p>
            ) : (
              <Timeline
                items={recentRuns.map((run) => ({
                  title: (
                    <span className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[run.status] ?? "default"}>
                        {run.status}
                      </Badge>
                      <span>{run.type}</span>
                    </span>
                  ) as unknown as string,
                  subtitle: run.error ?? run.progress_message ?? run.type,
                  time: timeAgo(run.created_at),
                }))}
              />
            )}
          </Surface>
        </div>
      </div>
    </div>
  );
}
