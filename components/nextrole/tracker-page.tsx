"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
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

type SavedView = "active" | "needs_action" | "interviews" | "high_score" | "archived";

const SAVED_VIEWS: Array<{ id: SavedView; label: string }> = [
  { id: "active", label: "All Active" },
  { id: "needs_action", label: "Needs Action" },
  { id: "interviews", label: "Interviews" },
  { id: "high_score", label: "High Score / Not Applied" },
  { id: "archived", label: "Archived" },
];

function latestScore(
  evals: Array<{ score: number | null; decision: string | null }>,
): string {
  const withScore = evals.filter((e) => e.score !== null);
  if (withScore.length === 0) return "—";
  return String(withScore[withScore.length - 1]!.score);
}

function latestDecision(
  evals: Array<{ score: number | null; decision: string | null }>,
): string | null {
  const withDecision = evals.filter((e) => e.decision !== null);
  return withDecision[withDecision.length - 1]?.decision ?? null;
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

// ── Liveness check panel ─────────────────────────────────────

type LivenessStatus = "idle" | "checking" | "live" | "closed" | "unknown";

const LIVENESS_REASON_LABELS: Record<string, string> = {
  ok: "URL responded 200 — listing appears active",
  http_not_found: "URL returned 404 / 410 — listing removed",
  http_error: "URL returned an error status",
  content_closed: "Page content signals this role is filled or closed",
  fetch_error: "Could not reach the URL — check your connection",
  no_url: "No URL saved for this job",
};

function LivenessPanel({ job }: { job: JobWithEval }) {
  const [status, setStatus] = useState<LivenessStatus>("idle");
  const [reason, setReason] = useState<string>("");
  const [archiving, setArchiving] = useState(false);
  const [archived, setArchived] = useState(false);

  const check = useCallback(async () => {
    setStatus("checking");
    setReason("");
    try {
      const res = await fetch(`/api/liveness?job_id=${job.id}`);
      const data = (await res.json()) as {
        live: boolean | null;
        reason: string;
        status_code?: number;
      };
      if (data.live === true) setStatus("live");
      else if (data.live === false) setStatus("closed");
      else setStatus("unknown");
      setReason(data.reason ?? "");
    } catch {
      setStatus("unknown");
      setReason("fetch_error");
    }
  }, [job.id]);

  async function archive() {
    setArchiving(true);
    const fd = new FormData();
    fd.set("job_id", job.id);
    fd.set("status", "archived");
    await updateJobStatus(fd);
    setArchived(true);
    setArchiving(false);
  }

  if (!job.url) return null;

  return (
    <div className="border-b border-dashed border-[var(--line-soft)] px-5 py-4">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
        Liveness
      </p>

      {status === "idle" && (
        <Button ghost onClick={check} className="w-full justify-center">
          Check if listing is still live
        </Button>
      )}

      {status === "checking" && (
        <p className="text-center font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          Checking…
        </p>
      )}

      {status === "live" && (
        <div className="flex items-center gap-3">
          <Badge tone="ok">Live</Badge>
          <span className="text-xs text-[var(--muted-foreground)]">
            {LIVENESS_REASON_LABELS[reason] ?? reason}
          </span>
          <button
            onClick={check}
            className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Recheck
          </button>
        </div>
      )}

      {status === "closed" && (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <Badge tone="bad">Closed</Badge>
            <span className="text-xs leading-relaxed text-[var(--muted-foreground)]">
              {LIVENESS_REASON_LABELS[reason] ?? reason}
            </span>
          </div>
          {!archived && job.status !== "archived" && (
            <Button
              tone="bad"
              ghost
              onClick={archive}
              disabled={archiving}
              className="w-full justify-center"
            >
              {archiving ? "Archiving…" : "Archive this job"}
            </Button>
          )}
          {(archived || job.status === "archived") && (
            <p className="text-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ok)]">
              Archived ✓
            </p>
          )}
        </div>
      )}

      {status === "unknown" && (
        <div className="flex items-center gap-3">
          <Badge tone="warn">Unknown</Badge>
          <span className="text-xs text-[var(--muted-foreground)]">
            {LIVENESS_REASON_LABELS[reason] ?? "Could not determine status"}
          </span>
          <button
            onClick={check}
            className="ml-auto font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

// ── Job detail drawer ────────────────────────────────────────

const WORKFLOW_LINKS = [
  { label: "Evaluate", param: "evaluate", icon: "⚡" },
  { label: "Resume", param: "resumes", icon: "📄" },
  { label: "Apply", param: "apply", icon: "✉️" },
  { label: "Interview Prep", param: "interview-prep", icon: "🎯" },
  { label: "Follow-up", param: "followup", icon: "🔔" },
  { label: "Deep Research", param: "deep", icon: "🔬" },
  { label: "Contact", param: "contact", icon: "🤝" },
  { label: "Report", param: "reports", icon: "📊" },
] as const;

function JobDrawer({
  job,
  onClose,
}: {
  job: JobWithEval;
  onClose: () => void;
}) {
  const score = latestScore(job.evaluations);
  const decision = latestDecision(job.evaluations);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/20 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col overflow-y-auto border-l border-[var(--line)] bg-[var(--surface)] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-[var(--line)] p-5">
          <div className="min-w-0 flex-1">
            <Eyebrow>Job detail</Eyebrow>
            <p className="mt-1 text-lg font-bold leading-snug">{job.title}</p>
            <p className="text-sm text-[var(--muted-foreground)]">{job.company}</p>
            {job.archetype && (
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                {job.archetype}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-full border border-[var(--line)] p-2 text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)] transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Status + score */}
        <div className="flex flex-wrap items-center gap-3 border-b border-dashed border-[var(--line-soft)] px-5 py-4">
          <Badge tone={STATUS_TONES[job.status]}>{STATUS_LABELS[job.status]}</Badge>
          {score !== "—" && (
            <Badge tone={parseFloat(score) >= 4 ? "ok" : parseFloat(score) >= 3 ? "warn" : "bad"}>
              Score {score}
            </Badge>
          )}
          {decision && (
            <Badge tone="accent">{decision}</Badge>
          )}
          {job.source && (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              via {job.source}
            </span>
          )}
        </div>

        {/* Change status */}
        <div className="border-b border-dashed border-[var(--line-soft)] px-5 py-4">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Change status
          </p>
          <StatusSelect jobId={job.id} current={job.status} />
        </div>

        {/* Workflow links */}
        <div className="border-b border-dashed border-[var(--line-soft)] px-5 py-4">
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Open workflow
          </p>
          <div className="grid grid-cols-2 gap-2">
            {WORKFLOW_LINKS.map(({ label, param, icon }) => (
              <a
                key={param}
                href={`/dashboard/${param}?job_id=${job.id}`}
                className="flex items-center gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm font-bold transition hover:border-[var(--accent)] hover:bg-[#fcefe7]"
              >
                <span>{icon}</span>
                <span>{label}</span>
              </a>
            ))}
          </div>
        </div>

        {/* Metadata */}
        <div className="px-5 py-4 space-y-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
            Details
          </p>
          <div className="space-y-2">
            {[
              { label: "Source", value: job.source },
              { label: "Archetype", value: job.archetype },
              { label: "Added", value: new Date(job.created_at).toLocaleDateString() },
              { label: "Updated", value: new Date(job.updated_at).toLocaleDateString() },
            ]
              .filter((r) => r.value)
              .map(({ label, value }) => (
                <div key={label} className="flex items-start justify-between gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    {label}
                  </span>
                  <span className="text-right text-sm font-medium">{value}</span>
                </div>
              ))}
            {job.url && (
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                  URL
                </span>
                <a
                  href={job.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-right text-sm font-medium text-[var(--accent)] hover:underline break-all"
                >
                  Open →
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Liveness check */}
        <LivenessPanel job={job} />

        {/* Danger zone */}
        <div className="mt-auto border-t border-[var(--line)] px-5 py-4">
          <form action={deleteJob}>
            <input type="hidden" name="job_id" value={job.id} />
            <input type="hidden" name="return_to" value="/dashboard/tracker" />
            <Button type="submit" tone="bad" ghost className="w-full justify-center">
              Delete job
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}

// ── Table view ───────────────────────────────────────────────

function TableView({
  jobs,
  onSelect,
  focusedIndex = -1,
}: {
  jobs: JobWithEval[];
  onSelect: (job: JobWithEval) => void;
  focusedIndex?: number;
}) {
  if (jobs.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
        No jobs in this view.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse">
        <thead className="bg-[var(--surface-soft)]">
          <tr>
            {["Role", "Company", "Stage", "Score", "Archetype", "Source", ""].map(
              (col) => (
                <th
                  key={col}
                  className="border-b border-[var(--line)] px-4 py-3 text-left font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]"
                >
                  {col}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {jobs.map((job, i) => (
            <tr
              key={job.id}
              onClick={() => onSelect(job)}
              className={`cursor-pointer border-b border-dashed border-[var(--line-soft)] last:border-b-0 hover:bg-[var(--surface-soft)] transition-colors ${
                i === focusedIndex ? "bg-[rgba(200,74,31,0.07)] outline outline-1 outline-[var(--accent)]" : ""
              }`}
            >
              <td className="px-4 py-3 text-sm font-bold">{job.title}</td>
              <td className="px-4 py-3 text-sm">{job.company}</td>
              <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
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
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]">
                  Details →
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Board view ───────────────────────────────────────────────

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

// ── Filter bar ───────────────────────────────────────────────

const SCORE_STEPS = [1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0, 4.5, 5.0];

export type TrackerFilters = {
  archetypes: string[];
  scoreMin: number;
  scoreMax: number;
  dateFrom: string;
  dateTo: string;
  source: string;
};

export const DEFAULT_FILTERS: TrackerFilters = {
  archetypes: [],
  scoreMin: 1.0,
  scoreMax: 5.0,
  dateFrom: "",
  dateTo: "",
  source: "",
};

function isDefaultFilters(f: TrackerFilters): boolean {
  return (
    f.archetypes.length === 0 &&
    f.scoreMin === 1.0 &&
    f.scoreMax === 5.0 &&
    f.dateFrom === "" &&
    f.dateTo === "" &&
    f.source === ""
  );
}

function FilterBar({
  filters,
  onChange,
  allArchetypes,
  allSources,
  resultCount,
  totalCount,
}: {
  filters: TrackerFilters;
  onChange: (f: TrackerFilters) => void;
  allArchetypes: string[];
  allSources: string[];
  resultCount: number;
  totalCount: number;
}) {
  const isDefault = isDefaultFilters(filters);

  function toggleArchetype(a: string) {
    const next = filters.archetypes.includes(a)
      ? filters.archetypes.filter((x) => x !== a)
      : [...filters.archetypes, a];
    onChange({ ...filters, archetypes: next });
  }

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface-soft)] p-4 space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
          Filters
        </span>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[10px] text-[var(--muted-foreground)]">
            {resultCount} of {totalCount} jobs
          </span>
          {!isDefault && (
            <button
              onClick={() => onChange(DEFAULT_FILTERS)}
              className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] hover:underline"
            >
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Archetype pills */}
      {allArchetypes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {allArchetypes.map((a) => (
            <button
              key={a}
              onClick={() => toggleArchetype(a)}
              className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] transition ${
                filters.archetypes.includes(a)
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line-soft)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:border-[var(--line)]"
              }`}
            >
              {a}
            </button>
          ))}
        </div>
      )}

      {/* Score / date / source row */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Score range */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Score
          </span>
          <select
            value={filters.scoreMin}
            onChange={(e) => onChange({ ...filters, scoreMin: parseFloat(e.target.value) })}
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[10px] outline-none focus:border-[var(--accent)]"
          >
            {SCORE_STEPS.filter((s) => s <= filters.scoreMax).map((s) => (
              <option key={s} value={s}>{s.toFixed(1)}</option>
            ))}
          </select>
          <span className="font-mono text-[10px] text-[var(--muted-foreground)]">–</span>
          <select
            value={filters.scoreMax}
            onChange={(e) => onChange({ ...filters, scoreMax: parseFloat(e.target.value) })}
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[10px] outline-none focus:border-[var(--accent)]"
          >
            {SCORE_STEPS.filter((s) => s >= filters.scoreMin).map((s) => (
              <option key={s} value={s}>{s.toFixed(1)}</option>
            ))}
          </select>
        </div>

        {/* Date range */}
        <div className="flex items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
            Added
          </span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[10px] outline-none focus:border-[var(--accent)]"
          />
          <span className="font-mono text-[10px] text-[var(--muted-foreground)]">–</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[10px] outline-none focus:border-[var(--accent)]"
          />
        </div>

        {/* Source */}
        {allSources.length > 0 && (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
              Source
            </span>
            <select
              value={filters.source}
              onChange={(e) => onChange({ ...filters, source: e.target.value })}
              className="rounded-full border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 font-mono text-[10px] outline-none focus:border-[var(--accent)]"
            >
              <option value="">All</option>
              {allSources.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────

type JobEvent = { job_id: string; event_type: string; payload: Record<string, unknown> | null; created_at: string };

function InterviewTimeline({ jobs, events }: { jobs: JobWithEval[]; events: JobEvent[] }) {
  const interviewJobs = jobs.filter((j) => j.status === "interview");
  if (interviewJobs.length === 0) return null;

  return (
    <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
      <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
        Interview schedule
      </p>
      <div className="space-y-3">
        {interviewJobs.map((job) => {
          const jobEvents = events
            .filter((e) => e.job_id === job.id)
            .sort((a, b) => a.created_at.localeCompare(b.created_at));

          const interviewEntry = jobEvents.find(
            (e) => (e.payload as { to?: string } | null)?.to === "interview",
          );
          const enteredAt = interviewEntry
            ? new Date(interviewEntry.created_at)
            : new Date(job.updated_at);

          const followUpDue = new Date(enteredAt);
          followUpDue.setDate(followUpDue.getDate() + 5);
          const isOverdue = followUpDue < new Date();

          return (
            <div
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-3"
            >
              <div>
                <p className="text-sm font-bold">{job.title}</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                  {job.company} · entered {enteredAt.toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2.5 py-1 font-mono text-[9px] uppercase tracking-[0.18em] ${
                    isOverdue
                      ? "border-[var(--bad)] text-[var(--bad)]"
                      : "border-[var(--warn)] text-[var(--warn)]"
                  }`}
                >
                  Follow-up {isOverdue ? "overdue" : `due ${followUpDue.toLocaleDateString()}`}
                </span>
                <a
                  href={`/dashboard/interview-prep?job_id=${job.id}`}
                  className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)] hover:underline"
                >
                  Prep →
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function TrackerPageContent({ jobs, jobEvents = [] }: { jobs: JobWithEval[]; jobEvents?: JobEvent[] }) {
  const [selectedJob, setSelectedJob] = useState<JobWithEval | null>(null);
  const [activeView, setActiveView] = useState<SavedView>("active");
  const [filters, setFilters] = useState<TrackerFilters>(DEFAULT_FILTERS);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const router = useRouter();

  const active = jobs.filter((j) =>
    ["evaluated", "applied", "interview", "offer"].includes(j.status),
  );
  const interviews = jobs.filter((j) => j.status === "interview");
  const highScoreNotApplied = jobs.filter(
    (j) =>
      j.status === "evaluated" &&
      j.evaluations.some((e) => e.score !== null && e.score >= 4),
  );
  const archived = jobs.filter((j) => j.status === "archived");

  // Jobs shown in the view based on saved view selection
  const viewJobs: JobWithEval[] = useMemo(() => {
    switch (activeView) {
      case "active":
        return jobs.filter((j) => !["pending", "archived"].includes(j.status));
      case "needs_action":
        return jobs.filter(
          (j) =>
            (j.status === "evaluated" && j.evaluations.length === 0) ||
            (j.status === "applied" &&
              new Date(j.updated_at) < new Date(Date.now() - 7 * 86400000)),
        );
      case "interviews":
        return interviews;
      case "high_score":
        return highScoreNotApplied;
      case "archived":
        return archived;
      default:
        return active;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeView, jobs]);

  // Additional filters compose on top of the saved view
  const filteredJobs = useMemo(() => {
    return viewJobs.filter((job) => {
      if (filters.archetypes.length > 0) {
        if (!job.archetype || !filters.archetypes.includes(job.archetype)) return false;
      }
      if (filters.scoreMin > 1.0 || filters.scoreMax < 5.0) {
        const score = [...job.evaluations].reverse().find((e) => e.score !== null)?.score ?? null;
        if (score === null) {
          if (filters.scoreMin > 1.0) return false;
        } else {
          if (score < filters.scoreMin || score > filters.scoreMax) return false;
        }
      }
      if (filters.dateFrom) {
        if (new Date(job.created_at) < new Date(filters.dateFrom)) return false;
      }
      if (filters.dateTo) {
        if (new Date(job.created_at) > new Date(filters.dateTo + "T23:59:59")) return false;
      }
      if (filters.source) {
        if (job.source !== filters.source) return false;
      }
      return true;
    });
  }, [viewJobs, filters]);

  // Unique values for filter options (from all jobs, not just viewJobs)
  const allArchetypes = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => { if (j.archetype) set.add(j.archetype); });
    return Array.from(set).sort();
  }, [jobs]);

  const allSources = useMemo(() => {
    const set = new Set<string>();
    jobs.forEach((j) => { if (j.source) set.add(j.source); });
    return Array.from(set).sort();
  }, [jobs]);

  // Reset focused index when the visible list changes
  useEffect(() => { setFocusedIndex(-1); }, [filteredJobs]);

  // Keyboard shortcuts: j/k navigate, d open drawer, e evaluate, Escape dismiss
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "j") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, filteredJobs.length - 1));
      } else if (e.key === "k") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "d" && focusedIndex >= 0) {
        e.preventDefault();
        setSelectedJob(filteredJobs[focusedIndex] ?? null);
      } else if (e.key === "e" && focusedIndex >= 0) {
        e.preventDefault();
        const job = filteredJobs[focusedIndex];
        if (job) router.push(`/dashboard/evaluate?job_id=${job.id}`);
      } else if (e.key === "Escape") {
        setFocusedIndex(-1);
        setSelectedJob(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filteredJobs, focusedIndex, router]);

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <Button href="/api/export?type=jobs&format=csv" ghost>
            Export CSV
          </Button>
          <Button href="/api/export?type=jobs&format=json" ghost>
            Export JSON
          </Button>
        </div>
      </div>

      {/* Stats */}
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
        <StatCard label="Archived" value={String(archived.length)} sublabel="closed" />
      </div>

      {/* Interview timeline */}
      <InterviewTimeline jobs={jobs} events={jobEvents} />

      {/* Saved view pills */}
      <div className="flex flex-wrap gap-2">
        {SAVED_VIEWS.map((view) => {
          const count =
            view.id === "active" ? active.length
            : view.id === "needs_action" ? jobs.filter((j) => j.status === "evaluated" && j.evaluations.length === 0).length
            : view.id === "interviews" ? interviews.length
            : view.id === "high_score" ? highScoreNotApplied.length
            : archived.length;

          return (
            <button
              key={view.id}
              onClick={() => { setActiveView(view.id); setFilters(DEFAULT_FILTERS); }}
              className={`rounded-full border px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] transition ${
                activeView === view.id
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line-soft)] bg-[var(--surface)] text-[var(--muted-foreground)] hover:border-[var(--line)]"
              }`}
            >
              {view.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Filter bar */}
      <FilterBar
        filters={filters}
        onChange={setFilters}
        allArchetypes={allArchetypes}
        allSources={allSources}
        resultCount={filteredJobs.length}
        totalCount={viewJobs.length}
      />

      {/* Keyboard hint */}
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-foreground-2)]">
        j/k navigate · d open drawer · e evaluate · Esc dismiss
      </p>

      {/* Main table + board */}
      <TabbedPanel
        tabs={[
          {
            id: "table",
            label: "Table",
            content: <TableView jobs={filteredJobs} onSelect={setSelectedJob} focusedIndex={focusedIndex} />,
          },
          {
            id: "board",
            label: "Board",
            content: <BoardView jobs={filteredJobs} />,
          },
        ]}
      />

      {/* Detail drawer */}
      {selectedJob && (
        <JobDrawer job={selectedJob} onClose={() => setSelectedJob(null)} />
      )}
    </div>
  );
}
