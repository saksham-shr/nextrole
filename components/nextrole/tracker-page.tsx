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
  TabbedPanel,
} from "@/components/nextrole/ui";
import { updateJobStatus, deleteJob } from "@/app/actions/jobs";
import type { JobRow, JobStatus } from "@/lib/db/types";

export type JobWithEval = JobRow & {
  evaluations: Array<{ score: number | null; decision: string | null }>;
};

const STATUS_LABELS: Record<JobStatus, string> = {
  pending: "Pending",
  evaluated: "Evaluated",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
  archived: "Archived",
};

const STATUS_TONES: Record<
  JobStatus,
  "default" | "accent" | "ok" | "warn" | "bad"
> = {
  pending: "default",
  evaluated: "accent",
  applied: "accent",
  interview: "warn",
  offer: "ok",
  rejected: "bad",
  archived: "default",
};

const ALL_STATUSES: JobStatus[] = [
  "pending",
  "evaluated",
  "applied",
  "interview",
  "offer",
  "rejected",
  "archived",
];

function latestScore(
  evals: Array<{ score: number | null; decision: string | null }>,
): string {
  const withScore = evals.filter((e) => e.score !== null);
  if (withScore.length === 0) return "—";
  return String(withScore[withScore.length - 1]!.score);
}

function StatusSelect({
  jobId,
  current,
}: {
  jobId: string;
  current: JobStatus;
}) {
  return (
    <form action={updateJobStatus}>
      <input type="hidden" name="job_id" value={jobId} />
      <select
        name="status"
        defaultValue={current}
        onChange={(e) =>
          (e.target.closest("form") as HTMLFormElement)?.requestSubmit()
        }
        className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] outline-none focus:border-[var(--accent)]"
      >
        {ALL_STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}

function TableView({ jobs }: { jobs: JobWithEval[] }) {
  if (jobs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
        No jobs yet. Add one in the pipeline or evaluate a role directly.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead className="bg-[var(--surface-soft)]">
          <tr>
            {[
              "Role",
              "Company",
              "Stage",
              "Score",
              "Archetype",
              "Source",
              "Actions",
            ].map((col) => (
              <th
                key={col}
                className="border-b border-[var(--line)] px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="border-b border-dashed border-[var(--line-soft)] last:border-b-0"
            >
              <td className="px-4 py-3 text-sm font-bold">{job.title}</td>
              <td className="px-4 py-3 text-sm">{job.company}</td>
              <td className="px-4 py-3">
                <StatusSelect jobId={job.id} current={job.status} />
              </td>
              <td className="px-4 py-3">
                <span className="font-mono text-sm font-bold">
                  {latestScore(job.evaluations)}
                </span>
              </td>
              <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                {job.archetype ?? "—"}
              </td>
              <td className="px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                {job.source ?? "—"}
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <Button
                    href={`/dashboard/evaluate?job_id=${job.id}`}
                    ghost
                    tone="accent"
                  >
                    Evaluate
                  </Button>
                  <form action={deleteJob}>
                    <input type="hidden" name="job_id" value={job.id} />
                    <input
                      type="hidden"
                      name="return_to"
                      value="/dashboard/tracker"
                    />
                    <Button type="submit" ghost tone="bad">
                      Delete
                    </Button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function BoardView({ jobs }: { jobs: JobWithEval[] }) {
  const columns: JobStatus[] = [
    "evaluated",
    "applied",
    "interview",
    "offer",
    "rejected",
  ];
  const kanbanCols = columns.map((status) => ({
    title: STATUS_LABELS[status],
    items: jobs
      .filter((j) => j.status === status)
      .map((j) => `${j.title} — ${j.company}`),
  }));
  return <KanbanBoard columns={kanbanCols} />;
}

export function TrackerPageContent({
  jobs,
}: {
  jobs: JobWithEval[];
}) {
  const active = jobs.filter((j) =>
    ["evaluated", "applied", "interview", "offer"].includes(j.status),
  );
  const interviews = jobs.filter((j) => j.status === "interview");
  const highScoreNotApplied = jobs.filter(
    (j) =>
      j.status === "evaluated" &&
      j.evaluations.some((e) => e.score !== null && e.score >= 4),
  );

  // Exclude archived and pending from main tracker view
  const tracked = jobs.filter(
    (j) => j.status !== "pending" && j.status !== "archived",
  );
  const archived = jobs.filter((j) => j.status === "archived");

  return (
    <div className="space-y-6">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>NextRole workspace</Eyebrow>
          <Display className="mt-2 text-4xl sm:text-5xl">Tracker</Display>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
            Run the application pipeline with statuses, notes, and linked assets.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button tone="accent" href="/dashboard/evaluate">
            Evaluate job
          </Button>
          <Button href="/dashboard/pipeline">Add to pipeline</Button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active" value={String(active.length)} sublabel="in pipeline" />
        <StatCard
          label="Interviews"
          value={String(interviews.length)}
          sublabel="in flight"
          tone={interviews.length > 0 ? "warn" : "default"}
        />
        <StatCard
          label="High score"
          value={String(highScoreNotApplied.length)}
          sublabel="score ≥4 not applied"
          tone={highScoreNotApplied.length > 0 ? "accent" : "default"}
        />
        <StatCard
          label="Archived"
          value={String(archived.length)}
          sublabel="closed"
        />
      </div>

      <TabbedPanel
        tabs={[
          {
            id: "table",
            label: "Table view",
            content: <TableView jobs={tracked} />,
          },
          {
            id: "board",
            label: "Board view",
            content: <BoardView jobs={tracked} />,
          },
          {
            id: "archived",
            label: `Archived (${archived.length})`,
            content: <TableView jobs={archived} />,
          },
        ]}
      />

      {highScoreNotApplied.length > 0 && (
        <Surface tone="accent" className="p-5">
          <SectionTitle
            title="High score — not applied"
            subtitle="Score ≥ 4.0 and still evaluated only"
          />
          <div className="mt-3 space-y-2">
            {highScoreNotApplied.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--line-soft)] py-2 last:border-b-0"
              >
                <div>
                  <p className="text-sm font-bold">
                    {job.title} — {job.company}
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    Score {latestScore(job.evaluations)} ·{" "}
                    {job.archetype ?? "unknown archetype"}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Badge tone="ok">
                    {latestScore(job.evaluations)}
                  </Badge>
                  <Button
                    href={`/dashboard/apply?job_id=${job.id}`}
                    tone="accent"
                  >
                    Apply now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      )}
    </div>
  );
}
