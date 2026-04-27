"use client";

import {
  Badge,
  Button,
  Display,
  EmptyState,
  Eyebrow,
  StatCard,
  Surface,
} from "@/components/nextrole/ui";
import type { TaskRunRow } from "@/lib/db/types";

export type TaskRunWithJob = TaskRunRow & {
  jobs: { title: string; company: string } | null;
};

const TASK_TYPE_LABELS: Record<string, string> = {
  evaluate: "Evaluate",
  compare: "Compare",
  batch: "Batch",
  scan: "Scan",
  pdf: "PDF",
  interview_prep: "Interview Prep",
  followup: "Follow-up",
  patterns: "Patterns",
  deep_research: "Deep Research",
  apply: "Apply",
};

const STATUS_TONES: Record<string, "default" | "accent" | "ok" | "warn" | "bad"> = {
  queued: "default",
  running: "warn",
  completed: "ok",
  failed: "bad",
  cancelled: "default",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function outputSummary(output: Record<string, unknown> | null): string | null {
  if (!output) return null;
  const parts: string[] = [];
  if (typeof output.score === "number") parts.push(`Score: ${output.score}`);
  if (typeof output.decision === "string") parts.push(`Decision: ${output.decision}`);
  if (typeof output.count === "number") parts.push(`${output.count} items`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function ActivityPageContent({ runs }: { runs: TaskRunWithJob[] }) {
  const completed = runs.filter((r) => r.status === "completed").length;
  const failed = runs.filter((r) => r.status === "failed").length;
  const running = runs.filter((r) => r.status === "running").length;

  return (
    <div className="space-y-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>NextRole workspace</Eyebrow>
          <Display className="mt-2 text-4xl sm:text-5xl">Activity</Display>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
            Background runs, artifacts, retries, and system-visible history.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href="/api/export?type=evaluations&format=csv" ghost>
            Export evals CSV
          </Button>
          <Button href="/api/export?type=reports&format=csv" ghost>
            Export reports CSV
          </Button>
          <Button href="/api/export?type=evaluations&format=json" ghost>
            Export JSON
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total runs" value={String(runs.length)} sublabel="all time" />
        <StatCard
          label="Completed"
          value={String(completed)}
          sublabel="successful"
          tone="ok"
        />
        <StatCard
          label="Failed"
          value={String(failed)}
          sublabel="need attention"
          tone={failed > 0 ? "bad" : "default"}
        />
        <StatCard
          label="Running"
          value={String(running)}
          sublabel="in progress"
          tone={running > 0 ? "warn" : "default"}
        />
      </div>

      {runs.length === 0 ? (
        <EmptyState
          title="No activity yet"
          body="Run an evaluation, batch job, or scan to see task history here."
          action={
            <Button href="/dashboard/evaluate" tone="accent">
              Evaluate a job
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {runs.map((run) => (
            <Surface key={run.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <Badge tone={STATUS_TONES[run.status] ?? "default"}>{run.status}</Badge>
                  <div>
                    <p className="text-sm font-semibold">
                      {TASK_TYPE_LABELS[run.type] ?? run.type}
                      {run.jobs
                        ? ` — ${run.jobs.title} at ${run.jobs.company}`
                        : ""}
                    </p>
                    {run.error && (
                      <p className="mt-1 text-xs text-[var(--bad)]">{run.error}</p>
                    )}
                    {run.progress_message && !run.error && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {run.progress_message}
                      </p>
                    )}
                    {outputSummary(run.output) && (
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                        {outputSummary(run.output)}
                      </p>
                    )}
                  </div>
                </div>
                <span className="font-mono text-xs text-[var(--muted-foreground)]">
                  {timeAgo(run.created_at)}
                </span>
              </div>
            </Surface>
          ))}
        </div>
      )}
    </div>
  );
}
