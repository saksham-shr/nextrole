"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Display,
  Eyebrow,
  Surface,
  SectionTitle,
} from "@/components/nextrole/ui";
import { FOLLOWUP_TYPE_LABELS, type FollowupType } from "@/lib/followup/prompt";
import { markFollowupSent } from "@/app/actions/jobs";
import type { JobRow } from "@/lib/db/types";

// ─── Urgency logic ───────────────────────────────────────────────────────────

type UrgencyBucket = "overdue" | "due_today" | "due_this_week" | "waiting";

interface JobWithUrgency extends JobRow {
  urgency: UrgencyBucket;
  daysSinceUpdate: number;
}

function computeUrgency(job: JobRow): UrgencyBucket {
  const updatedAt = new Date(job.updated_at ?? job.created_at);
  const now = new Date();
  const msElapsed = now.getTime() - updatedAt.getTime();
  const daysElapsed = msElapsed / (1000 * 60 * 60 * 24);

  if (job.status === "interview") {
    if (daysElapsed < 1) return "due_today";   // send thank-you within 24h
    return "overdue";                           // missed the thank-you window
  }

  if (job.status === "applied") {
    if (daysElapsed < 7) return "waiting";
    if (daysElapsed < 14) return "due_this_week";
    if (daysElapsed < 21) return "due_today";
    return "overdue";
  }

  // evaluated / offer — low urgency
  if (daysElapsed >= 21) return "overdue";
  if (daysElapsed >= 14) return "due_this_week";
  return "waiting";
}

const BUCKET_META: Record<
  UrgencyBucket,
  { label: string; tone: "bad" | "warn" | "accent" | "default"; desc: string }
> = {
  overdue:       { label: "Overdue",        tone: "bad",     desc: "Past the ideal follow-up window — reach out now" },
  due_today:     { label: "Due Today",      tone: "warn",    desc: "Send a follow-up message today" },
  due_this_week: { label: "Due This Week",  tone: "accent",  desc: "Follow up before the end of this week" },
  waiting:       { label: "Waiting",        tone: "default", desc: "Too early — let it breathe a bit longer" },
};

const BUCKET_ORDER: UrgencyBucket[] = ["overdue", "due_today", "due_this_week", "waiting"];

// ─── Other constants ──────────────────────────────────────────────────────────

const FOLLOWUP_TYPES: FollowupType[] = [
  "day7_bump",
  "post_screen_thanks",
  "post_interview_thanks",
  "no_response_nudge",
  "recruiter_intro",
];

const FOLLOWUP_WHEN: Record<FollowupType, string> = {
  day7_bump: "7 days after applying, no response",
  post_screen_thanks: "Within 24h of a phone/recruiter screen",
  post_interview_thanks: "Within 24h of any interview round",
  no_response_nudge: "2-3 weeks after applying, still silence",
  recruiter_intro: "Cold outreach to a recruiter or hiring manager",
};

const STATUS_TONE: Record<string, "ok" | "warn" | "bad" | "accent" | "default"> = {
  applied:   "accent",
  interview: "warn",
  offer:     "ok",
  evaluated: "default",
};

// ─── Mark Sent button (uses server action via form) ───────────────────────────

function MarkSentButton({ jobId }: { jobId: string }) {
  const [pending, setPending] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    await markFollowupSent(fd);
    setDone(true);
    setPending(false);
  }

  return (
    <form onSubmit={handleSubmit}>
      <input type="hidden" name="job_id" value={jobId} />
      <Button type="submit" ghost tone="ok" disabled={pending || done}>
        {done ? "Sent ✓" : pending ? "Saving…" : "Mark sent"}
      </Button>
    </form>
  );
}

// ─── Urgency bucket section ───────────────────────────────────────────────────

function UrgencySection({
  bucket,
  jobs,
  selectedJobId,
  onSelect,
}: {
  bucket: UrgencyBucket;
  jobs: JobWithUrgency[];
  selectedJobId: string;
  onSelect: (id: string) => void;
}) {
  if (jobs.length === 0) return null;
  const meta = BUCKET_META[bucket];

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <Badge tone={meta.tone}>{meta.label}</Badge>
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {meta.desc}
        </span>
      </div>
      {jobs.map((j) => (
        <button
          key={j.id}
          onClick={() => onSelect(j.id)}
          className={`w-full rounded-[18px] border px-4 py-3 text-left transition ${
            selectedJobId === j.id
              ? "border-[var(--accent)] bg-[#fcefe7]"
              : "border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--surface-soft)]"
          }`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold">
                {j.title} — {j.company}
              </p>
              <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                {j.archetype && `${j.archetype} · `}
                {Math.round(j.daysSinceUpdate)}d since last update
              </p>
            </div>
            <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
              <Badge tone={STATUS_TONE[j.status] ?? "default"}>{j.status}</Badge>
              {bucket !== "waiting" && <MarkSentButton jobId={j.id} />}
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

// ─── Main page component ──────────────────────────────────────────────────────

export function FollowupPageContent({
  jobs,
  hasCV,
  hasProvider,
  initialJobId,
}: {
  jobs: JobRow[];
  hasCV: boolean;
  hasProvider: boolean;
  initialJobId?: string;
}) {
  // Attach urgency to each job
  const jobsWithUrgency: JobWithUrgency[] = jobs.map((j) => {
    const updatedAt = new Date(j.updated_at ?? j.created_at);
    const daysElapsed = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
    return { ...j, urgency: computeUrgency(j), daysSinceUpdate: daysElapsed };
  });

  // Group by bucket
  const byBucket = BUCKET_ORDER.reduce<Record<UrgencyBucket, JobWithUrgency[]>>(
    (acc, b) => {
      acc[b] = jobsWithUrgency.filter((j) => j.urgency === b);
      return acc;
    },
    { overdue: [], due_today: [], due_this_week: [], waiting: [] },
  );

  const actionableCount =
    byBucket.overdue.length + byBucket.due_today.length + byBucket.due_this_week.length;

  const [selectedJobId, setSelectedJobId] = useState(
    initialJobId ??
      byBucket.overdue[0]?.id ??
      byBucket.due_today[0]?.id ??
      byBucket.due_this_week[0]?.id ??
      jobs[0]?.id ??
      "",
  );
  const [activeType, setActiveType] = useState<FollowupType | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [promptCopied, setPromptCopied] = useState(false);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  function selectJob(id: string) {
    setSelectedJobId(id);
    setDraft(null);
    setManualPrompt(null);
    setActiveType(null);
  }

  async function generate(type: FollowupType, mode: "api" | "prompt_only") {
    if (!selectedJobId) return;
    setLoading(true);
    setActiveType(type);
    setDraft(null);
    setManualPrompt(null);
    setError(null);

    try {
      const res = await fetch("/api/followup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: selectedJobId, type, mode }),
      });
      const data = (await res.json()) as { draft?: string; prompt?: string; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Failed");
      } else if (mode === "prompt_only") {
        setManualPrompt(data.prompt ?? null);
      } else {
        setDraft(data.draft ?? null);
      }
    } catch {
      setError("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  async function copyDraft() {
    if (!draft) return;
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function copyPrompt() {
    if (!manualPrompt) return;
    await navigator.clipboard.writeText(manualPrompt);
    setPromptCopied(true);
    setTimeout(() => setPromptCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Follow-up</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Track urgency, generate drafts, and manage outreach timing. Never auto-sent.
        </p>
      </div>

      {!hasCV && (
        <Surface tone="warn" className="p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">CV missing — add it in Settings first.</p>
            <Button href="/dashboard/settings" ghost tone="warn">
              Settings
            </Button>
          </div>
        </Surface>
      )}

      {jobs.length === 0 ? (
        <Surface className="border-dashed p-8 text-center">
          <p className="text-lg font-bold">No active jobs</p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted-foreground)]">
            Follow-up messages are generated for jobs you have applied to or are interviewing for.
            Add jobs in the pipeline and move them through the tracker.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button tone="accent" href="/dashboard/pipeline">
              Go to pipeline
            </Button>
            <Button href="/dashboard/tracker">Open tracker</Button>
          </div>
        </Surface>
      ) : (
        <>
          {/* ── Urgency dashboard ── */}
          <Surface className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SectionTitle
                title="Urgency queue"
                subtitle={
                  actionableCount > 0
                    ? `${actionableCount} job${actionableCount !== 1 ? "s" : ""} need attention`
                    : "All caught up — nothing urgent"
                }
              />
              {/* Summary pills */}
              <div className="flex gap-2">
                {byBucket.overdue.length > 0 && (
                  <Badge tone="bad">{byBucket.overdue.length} overdue</Badge>
                )}
                {byBucket.due_today.length > 0 && (
                  <Badge tone="warn">{byBucket.due_today.length} today</Badge>
                )}
                {byBucket.due_this_week.length > 0 && (
                  <Badge tone="accent">{byBucket.due_this_week.length} this week</Badge>
                )}
              </div>
            </div>

            <div className="space-y-5">
              {BUCKET_ORDER.map((bucket) => (
                <UrgencySection
                  key={bucket}
                  bucket={bucket}
                  jobs={byBucket[bucket]}
                  selectedJobId={selectedJobId}
                  onSelect={selectJob}
                />
              ))}
            </div>
          </Surface>

          {/* ── Message generator ── */}
          {selectedJob && (
            <Surface className="p-5">
              <SectionTitle
                title={`Draft for ${selectedJob.title} — ${selectedJob.company}`}
                subtitle={
                  hasProvider
                    ? "Pick a message type to generate instantly, or copy the prompt"
                    : "No API key — use Copy prompt to draft manually"
                }
              />
              <div className="mt-4 space-y-3">
                {FOLLOWUP_TYPES.map((type) => (
                  <div
                    key={type}
                    className={`flex flex-wrap items-center justify-between gap-3 rounded-[18px] border px-4 py-3 ${
                      activeType === type && draft
                        ? "border-[var(--ok)] bg-[#eef8f0]"
                        : "border-[var(--line)] bg-[var(--surface)]"
                    }`}
                  >
                    <div>
                      <p className="text-sm font-bold">{FOLLOWUP_TYPE_LABELS[type]}</p>
                      <p className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                        {FOLLOWUP_WHEN[type]}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      {hasProvider && (
                        <Button
                          tone="accent"
                          onClick={() => generate(type, "api")}
                          disabled={loading || !hasCV}
                        >
                          {loading && activeType === type ? "Writing…" : "Generate"}
                        </Button>
                      )}
                      <Button
                        ghost
                        onClick={() => generate(type, "prompt_only")}
                        disabled={loading || !hasCV}
                      >
                        Copy prompt
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {/* Error */}
          {error && (
            <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
              {error}
            </p>
          )}

          {/* Draft output */}
          {draft && (
            <Surface tone="ok" className="p-5">
              <div className="mb-3 flex items-center justify-between gap-3">
                <SectionTitle
                  title={FOLLOWUP_TYPE_LABELS[activeType!]}
                  subtitle="Ready to copy and send"
                />
                <Button tone="ok" onClick={copyDraft} ghost>
                  {copied ? "Copied!" : "Copy message"}
                </Button>
              </div>
              <div className="rounded-[18px] border border-[var(--ok)] bg-[var(--surface)] p-4">
                <p className="whitespace-pre-wrap text-sm leading-7">{draft}</p>
              </div>
              {/* After sending, let user mark it from here too */}
              <div className="mt-3 flex justify-end">
                <MarkSentButton jobId={selectedJobId} />
              </div>
            </Surface>
          )}

          {/* Manual prompt output */}
          {manualPrompt && (
            <Surface className="p-5">
              <SectionTitle
                title="Manual prompt"
                subtitle="Paste into Claude.ai or ChatGPT, then copy the response"
              />
              <textarea
                readOnly
                value={manualPrompt}
                rows={8}
                className="mt-3 w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 font-mono text-[11px] leading-5 text-[var(--muted-foreground)] outline-none"
              />
              <Button tone="accent" onClick={copyPrompt} className="mt-3">
                {promptCopied ? "Copied!" : "Copy prompt"}
              </Button>
            </Surface>
          )}
        </>
      )}
    </div>
  );
}
