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

export type JobWithLatestEval = JobRow & {
  evaluations: Array<{ score: number | null; decision: string | null }>;
};

interface RankedJob {
  job_id: string;
  rank: number;
  title: string;
  company: string;
  score: number;
  decision: string;
  why: string;
}

interface CompareResult {
  ranked: RankedJob[];
  winner_id: string;
  winner_rationale: string;
  summary: string;
  report_id?: string;
  error?: string;
}

const DECISION_TONE = {
  apply: "ok",
  watch: "warn",
  skip: "bad",
} as const satisfies Record<string, "ok" | "warn" | "bad">;

const RANK_MEDAL = ["🥇", "🥈", "🥉"];

export function ComparePageContent({ jobs }: { jobs: JobWithLatestEval[] }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CompareResult | null>(null);

  const evaluatedJobs = jobs.filter((j) => j.evaluations.length > 0);
  const toggleJob = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const canCompare = selected.size >= 2 && selected.size <= 8;

  async function runCompare() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_ids: Array.from(selected) }),
      });
      const data = (await res.json()) as CompareResult;
      if (!res.ok || data.error) {
        setError(data.error ?? "Compare failed");
      } else {
        setResult(data);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>NextRole workspace</Eyebrow>
          <Display className="mt-2 text-4xl sm:text-5xl">Compare</Display>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
            Rank evaluated roles side by side and identify which opportunity deserves your energy.
          </p>
        </div>
        {result && (
          <Button onClick={() => { setResult(null); setSelected(new Set()); }}>
            New comparison
          </Button>
        )}
      </div>

      {/* Results view */}
      {result && (
        <div className="space-y-5">
          {/* Winner callout */}
          <Surface tone="ok" className="p-5">
            <Eyebrow>Winner</Eyebrow>
            <p className="mt-2 font-[var(--font-caveat)] text-3xl font-bold leading-snug">
              {result.ranked.find((r) => r.job_id === result.winner_id)?.title ?? "—"}
              {" · "}
              {result.ranked.find((r) => r.job_id === result.winner_id)?.company ?? ""}
            </p>
            <p className="mt-3 text-sm leading-6">{result.winner_rationale}</p>
          </Surface>

          {/* Summary */}
          <Surface className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">{result.summary}</p>
          </Surface>

          {/* Ranked list */}
          <div className="space-y-3">
            {result.ranked.map((job) => {
              const medal = RANK_MEDAL[job.rank - 1] ?? `#${job.rank}`;
              const isWinner = job.job_id === result.winner_id;
              return (
                <Surface key={job.job_id} tone={isWinner ? "ok" : "default"} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl leading-none">{medal}</span>
                      <div>
                        <p className="font-semibold">
                          {job.title} — {job.company}
                        </p>
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{job.why}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold">{Number(job.score).toFixed(1)}</span>
                      <Badge tone={DECISION_TONE[job.decision as keyof typeof DECISION_TONE] ?? "default"}>
                        {job.decision}
                      </Badge>
                    </div>
                  </div>
                </Surface>
              );
            })}
          </div>

          {result.report_id && (
            <Button href={`/dashboard/reports/${result.report_id}`} ghost>
              View full report →
            </Button>
          )}
        </div>
      )}

      {/* Selection view */}
      {!result && (
        <>
          {evaluatedJobs.length === 0 && (
            <EmptyState
              title="No evaluated jobs yet"
              body="Evaluate at least 2 jobs first — then come back here to compare them side by side."
              action={
                <Button href="/dashboard/evaluate" tone="accent">
                  Evaluate a job
                </Button>
              }
            />
          )}

          {evaluatedJobs.length === 1 && (
            <Surface tone="warn" className="p-5">
              <p className="text-sm font-semibold">You have 1 evaluated job.</p>
              <p className="mt-1 text-sm text-[var(--muted-foreground)]">
                Evaluate at least one more role to enable comparison.
              </p>
              <div className="mt-3">
                <Button href="/dashboard/evaluate" tone="accent" ghost>
                  Evaluate another job
                </Button>
              </div>
            </Surface>
          )}

          {evaluatedJobs.length >= 2 && (
            <>
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm text-[var(--muted-foreground)]">
                  Select 2–8 evaluated jobs to compare.{" "}
                  <span className="font-semibold text-[var(--foreground)]">
                    {selected.size} selected
                  </span>
                </p>
                <Button
                  tone="accent"
                  onClick={runCompare}
                  disabled={!canCompare || loading}
                >
                  {loading ? "Comparing…" : `Compare ${selected.size > 0 ? `(${selected.size})` : ""}`}
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
                    Ranking {selected.size} offers — usually 15–30 seconds
                  </p>
                </Surface>
              )}

              {!loading && (
                <div className="space-y-2">
                  {evaluatedJobs.map((job) => {
                    const latestEval = job.evaluations[job.evaluations.length - 1];
                    const isSelected = selected.has(job.id);
                    return (
                      <button
                        key={job.id}
                        onClick={() => toggleJob(job.id)}
                        className="w-full text-left"
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
                                </p>
                              </div>
                            </div>
                            {latestEval && (
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm">
                                  {latestEval.score !== null
                                    ? Number(latestEval.score).toFixed(1)
                                    : "—"}
                                </span>
                                {latestEval.decision && (
                                  <Badge
                                    tone={
                                      DECISION_TONE[
                                        latestEval.decision as keyof typeof DECISION_TONE
                                      ] ?? "default"
                                    }
                                  >
                                    {latestEval.decision}
                                  </Badge>
                                )}
                              </div>
                            )}
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
