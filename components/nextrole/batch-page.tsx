"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Display,
  EmptyState,
  Eyebrow,
  StatCard,
  Surface,
} from "@/components/nextrole/ui";
import type { JobRow } from "@/lib/db/types";
import type { BatchJobResult, BatchResponse } from "@/app/api/batch/route";

const DECISION_TONE = {
  apply: "ok",
  watch: "warn",
  skip: "bad",
} as const satisfies Record<string, "ok" | "warn" | "bad">;

const STATUS_TONE = {
  completed: "ok",
  failed: "bad",
  skipped: "default",
} as const satisfies Record<string, "ok" | "bad" | "default">;

export function BatchPageContent({ jobs }: { jobs: JobRow[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BatchResponse | null>(null);
  const [currentJob, setCurrentJob] = useState<string | null>(null);

  const jobsWithDesc = jobs.filter((j) => !!j.description);
  const canRun = selected.size >= 1 && selected.size <= 20;

  const toggleJob = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelected(new Set(jobsWithDesc.map((j) => j.id)));
  const clearAll = () => setSelected(new Set());

  async function runBatch() {
    setLoading(true);
    setError(null);
    setResult(null);

    const selectedJobs = jobs.filter((j) => selected.has(j.id));
    setCurrentJob(selectedJobs[0]?.company ?? null);

    try {
      const res = await fetch("/api/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_ids: Array.from(selected) }),
      });
      const data = (await res.json()) as BatchResponse;
      if (!res.ok || data.error) {
        setError(data.error ?? "Batch failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
      setCurrentJob(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>NextRole workspace</Eyebrow>
          <Display className="mt-2 text-4xl sm:text-5xl">Batch</Display>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
            Queue multiple jobs and run the full 7-block evaluation across all of them in one pass.
          </p>
        </div>
        {result && (
          <Button onClick={() => { setResult(null); setSelected(new Set()); }}>
            New batch
          </Button>
        )}
      </div>

      {/* Results view */}
      {result && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <StatCard label="Total" value={String(result.results.length)} sublabel="jobs processed" />
            <StatCard label="Completed" value={String(result.completed)} sublabel="evaluated" tone="ok" />
            <StatCard
              label="Failed"
              value={String(result.failed)}
              sublabel="errored"
              tone={result.failed > 0 ? "bad" : "default"}
            />
            <StatCard
              label="Skipped"
              value={String(result.skipped)}
              sublabel="no description"
              tone={result.skipped > 0 ? "warn" : "default"}
            />
          </div>

          <div className="space-y-3">
            {result.results.map((r: BatchJobResult) => (
              <Surface key={r.job_id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Badge tone={STATUS_TONE[r.status]}>{r.status}</Badge>
                    <div>
                      <p className="font-semibold">
                        {r.title} — {r.company}
                      </p>
                      {r.error && (
                        <p className="mt-0.5 text-xs text-[var(--bad)]">{r.error}</p>
                      )}
                    </div>
                  </div>
                  {r.score !== undefined && r.decision && (
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">
                        {Number(r.score).toFixed(1)}
                      </span>
                      <Badge
                        tone={
                          DECISION_TONE[r.decision as keyof typeof DECISION_TONE] ?? "default"
                        }
                      >
                        {r.decision}
                      </Badge>
                    </div>
                  )}
                </div>
              </Surface>
            ))}
          </div>

          <div className="flex gap-3">
            <Button href="/dashboard/reports" tone="accent" ghost>
              View reports →
            </Button>
            <Button href="/dashboard/tracker">View tracker</Button>
          </div>
        </div>
      )}

      {/* Selection view */}
      {!result && (
        <>
          {jobs.length === 0 && (
            <EmptyState
              title="No jobs in pipeline"
              body="Add jobs to your pipeline first, then batch evaluate them here."
              action={
                <Button href="/dashboard/pipeline" tone="accent">
                  Go to pipeline
                </Button>
              }
            />
          )}

          {jobs.length > 0 && jobsWithDesc.length === 0 && (
            <Surface tone="warn" className="p-5">
              <p className="text-sm font-semibold">No jobs have a description yet.</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Paste the job description into each pipeline entry before batch evaluating.
              </p>
            </Surface>
          )}

          {jobsWithDesc.length > 0 && (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    <span className="font-semibold text-[var(--foreground)]">
                      {selected.size}
                    </span>{" "}
                    of {jobsWithDesc.length} selected
                  </p>
                  <button
                    onClick={selectAll}
                    className="font-mono text-[10px] uppercase tracking-widest text-[var(--accent)] hover:underline"
                  >
                    Select all
                  </button>
                  {selected.size > 0 && (
                    <button
                      onClick={clearAll}
                      className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <Button
                  tone="accent"
                  onClick={runBatch}
                  disabled={!canRun || loading}
                >
                  {loading
                    ? `Evaluating${currentJob ? ` ${currentJob}` : ""}…`
                    : `Run batch${selected.size > 0 ? ` (${selected.size})` : ""}`}
                </Button>
              </div>

              {error && (
                <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
                  {error}
                </p>
              )}

              {loading && (
                <Surface className="p-8 text-center">
                  <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                    Processing {selected.size} jobs sequentially · ~30s per job
                  </p>
                </Surface>
              )}

              {!loading && (
                <div className="space-y-2">
                  {jobs.map((job) => {
                    const hasDesc = !!job.description;
                    const isSelected = selected.has(job.id);
                    return (
                      <button
                        key={job.id}
                        onClick={() => hasDesc && toggleJob(job.id)}
                        disabled={!hasDesc}
                        className={`w-full text-left ${!hasDesc ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <Surface
                          tone={isSelected ? "accent" : "default"}
                          className="p-4 transition-shadow hover:shadow-md"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div
                                className={`h-4 w-4 flex-shrink-0 rounded border-2 ${
                                  isSelected
                                    ? "border-[var(--accent)] bg-[var(--accent)]"
                                    : "border-[var(--line)]"
                                }`}
                              />
                              <div>
                                <p className="font-semibold">{job.title}</p>
                                <p className="text-xs text-[var(--muted-foreground)]">
                                  {job.company}
                                  {job.archetype ? ` · ${job.archetype}` : ""}
                                  {!hasDesc ? " · no description" : ""}
                                </p>
                              </div>
                            </div>
                            <Badge tone={job.status === "evaluated" ? "ok" : "default"}>
                              {job.status}
                            </Badge>
                          </div>
                        </Surface>
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
