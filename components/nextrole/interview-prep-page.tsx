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
import type { InterviewPrepPackRow, JobRow } from "@/lib/db/types";

export type PrepPackWithJob = InterviewPrepPackRow & {
  jobs: Pick<JobRow, "title" | "company"> | null;
};

interface PrepQuestion {
  question: string;
  answer_guide?: string;
  story_prompt?: string;
  importance?: "high" | "medium" | "low";
}

interface PrepContent {
  overview?: string;
  key_themes?: string[];
  elevator_pitch?: string;
  behavioral?: PrepQuestion[];
  technical?: PrepQuestion[];
  situational?: PrepQuestion[];
  questions_to_ask?: string[];
  red_flags_to_address?: string[];
}

const IMPORTANCE_TONE: Record<string, "bad" | "warn" | "default"> = {
  high: "bad",
  medium: "warn",
  low: "default",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Question card ────────────────────────────────────────────────────────────

function QuestionCard({ q }: { q: PrepQuestion }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-[14px] border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-snug">{q.question}</p>
        <div className="flex shrink-0 items-center gap-2">
          {q.importance && (
            <Badge tone={IMPORTANCE_TONE[q.importance] ?? "default"}>{q.importance}</Badge>
          )}
          {(q.answer_guide || q.story_prompt) && (
            <Button tone="default" ghost onClick={() => setOpen((v) => !v)}>
              {open ? "Hide" : "Guide"}
            </Button>
          )}
        </div>
      </div>
      {open && (
        <div className="mt-3 space-y-2 border-t border-dashed border-[var(--line-soft)] pt-3">
          {q.answer_guide && (
            <div>
              <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Answer guide
              </p>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {q.answer_guide}
              </p>
            </div>
          )}
          {q.story_prompt && (
            <div>
              <p className="mb-1 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
                STAR story prompt
              </p>
              <p className="text-sm leading-relaxed text-[var(--muted-foreground)]">
                {q.story_prompt}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Prep pack card ───────────────────────────────────────────────────────────

function PrepPackCard({ pack }: { pack: PrepPackWithJob }) {
  const [expanded, setExpanded] = useState(false);
  const c = pack.content as PrepContent;
  const totalQ =
    (c.behavioral?.length ?? 0) + (c.technical?.length ?? 0) + (c.situational?.length ?? 0);

  return (
    <Surface className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-semibold">{pack.title}</p>
          <div className="mt-1 flex flex-wrap gap-3 font-mono text-[10px] text-[var(--muted-foreground)]">
            <span>{totalQ} questions</span>
            <span>{formatDate(pack.created_at)}</span>
            {pack.model && <span>{pack.model}</span>}
          </div>
          {c.key_themes && c.key_themes.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {c.key_themes.map((t) => (
                <span
                  key={t}
                  className="rounded-full bg-[var(--surface-soft)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
        <Button tone="accent" ghost onClick={() => setExpanded((v) => !v)}>
          {expanded ? "Collapse" : "View prep pack"}
        </Button>
      </div>

      {expanded && (
        <div className="mt-5 space-y-6 border-t border-dashed border-[var(--line-soft)] pt-5">
          {c.overview && (
            <div>
              <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Overview
              </p>
              <p className="text-sm leading-relaxed">{c.overview}</p>
            </div>
          )}

          {c.elevator_pitch && (
            <div>
              <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Elevator pitch
              </p>
              <p className="rounded-[14px] border border-[var(--accent)] bg-[#fcefe7] px-4 py-3 text-sm leading-relaxed">
                {c.elevator_pitch}
              </p>
            </div>
          )}

          {c.behavioral && c.behavioral.length > 0 && (
            <div>
              <p className="mb-3 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Behavioral ({c.behavioral.length})
              </p>
              <div className="space-y-2">
                {c.behavioral.map((q, i) => (
                  <QuestionCard key={i} q={q} />
                ))}
              </div>
            </div>
          )}

          {c.technical && c.technical.length > 0 && (
            <div>
              <p className="mb-3 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Technical ({c.technical.length})
              </p>
              <div className="space-y-2">
                {c.technical.map((q, i) => (
                  <QuestionCard key={i} q={q} />
                ))}
              </div>
            </div>
          )}

          {c.situational && c.situational.length > 0 && (
            <div>
              <p className="mb-3 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Situational ({c.situational.length})
              </p>
              <div className="space-y-2">
                {c.situational.map((q, i) => (
                  <QuestionCard key={i} q={q} />
                ))}
              </div>
            </div>
          )}

          {c.questions_to_ask && c.questions_to_ask.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Questions to ask the interviewer
              </p>
              <ul className="space-y-1">
                {c.questions_to_ask.map((q, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="shrink-0 text-[var(--accent)]">→</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {c.red_flags_to_address && c.red_flags_to_address.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Red flags to address proactively
              </p>
              <ul className="space-y-1">
                {c.red_flags_to_address.map((f, i) => (
                  <li key={i} className="flex gap-2 text-sm">
                    <span className="shrink-0 text-[var(--bad)]">!</span>
                    <span className="text-[var(--muted-foreground)]">{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </Surface>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export function InterviewPrepPageContent({
  packs,
  jobs,
}: {
  packs: PrepPackWithJob[];
  jobs: Array<Pick<JobRow, "id" | "title" | "company" | "description">>;
}) {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const jobsWithDesc = jobs.filter((j) => !!j.description);

  async function generate() {
    if (!selectedJobId) return;
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const res = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: selectedJobId }),
      });
      const data = (await res.json()) as { pack_id?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Generation failed");
      } else {
        setDone(true);
        setTimeout(() => window.location.reload(), 800);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Interview Prep</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Generate tailored interview prep packs from your job evaluations — behavioral,
          technical, and situational questions with answer guides built from your CV.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Prep packs" value={String(packs.length)} sublabel="generated" />
        <StatCard
          label="Jobs covered"
          value={String(new Set(packs.map((p) => p.job_id)).size)}
          sublabel="unique roles"
          tone={packs.length > 0 ? "ok" : "default"}
        />
        <StatCard
          label="Avg questions"
          value={
            packs.length > 0
              ? String(
                  Math.round(
                    packs.reduce((s, p) => {
                      const c = p.content as PrepContent;
                      return (
                        s +
                        (c.behavioral?.length ?? 0) +
                        (c.technical?.length ?? 0) +
                        (c.situational?.length ?? 0)
                      );
                    }, 0) / packs.length,
                  ),
                )
              : "—"
          }
          sublabel="per pack"
        />
      </div>

      {/* Generator */}
      <Surface className="p-5">
        <h2 className="mb-4 text-base font-bold">Generate prep pack</h2>
        {jobsWithDesc.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            No jobs with descriptions found. Paste a job description in{" "}
            <a href="/dashboard/pipeline" className="underline">
              Pipeline
            </a>{" "}
            first.
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="min-w-[280px] flex-1 rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="">Select a job…</option>
              {jobsWithDesc.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.company}
                </option>
              ))}
            </select>
            <Button
              tone="accent"
              onClick={generate}
              disabled={!selectedJobId || loading}
            >
              {loading ? "Generating…" : done ? "Done ✓" : "Generate"}
            </Button>
          </div>
        )}
        <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
          Works best with an evaluation already run on the job
        </p>
        {error && (
          <p className="mt-3 rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
            {error}
          </p>
        )}
      </Surface>

      {packs.length === 0 ? (
        <EmptyState
          title="No prep packs yet"
          body="Select a job above and generate your first interview prep pack."
        />
      ) : (
        <div className="space-y-4">
          {packs.map((pack) => (
            <PrepPackCard key={pack.id} pack={pack} />
          ))}
        </div>
      )}
    </div>
  );
}
