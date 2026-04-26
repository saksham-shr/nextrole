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
import { APPLY_QUESTION_LABELS, type ApplyQuestion } from "@/lib/apply/prompt";
import type { JobRow } from "@/lib/db/types";

const QUESTIONS: ApplyQuestion[] = [
  "why_company",
  "why_role",
  "about_yourself",
  "salary_expectations",
  "notable_project",
  "cover_letter",
];

function DraftPanel({
  draft,
  onCopy,
  copied,
}: {
  draft: string;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <Surface tone="ok" className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Eyebrow>Generated draft</Eyebrow>
        <Button tone="ok" onClick={onCopy} ghost>
          {copied ? "Copied!" : "Copy"}
        </Button>
      </div>
      <p className="text-sm leading-7 whitespace-pre-wrap">{draft}</p>
    </Surface>
  );
}

function ManualPromptPanel({
  prompt,
}: {
  prompt: string | null;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    if (!prompt) return;
    await navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }
  if (!prompt) return null;
  return (
    <Surface className="p-5">
      <SectionTitle
        title="Manual mode prompt"
        subtitle="Paste this into Claude.ai or ChatGPT, then copy the answer back"
      />
      <textarea
        readOnly
        value={prompt}
        rows={8}
        className="mt-3 w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 font-mono text-[11px] leading-5 text-[var(--muted-foreground)] outline-none"
      />
      <Button tone="accent" onClick={copy} className="mt-3">
        {copied ? "Copied!" : "Copy prompt"}
      </Button>
    </Surface>
  );
}

export function ApplyPageContent({
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
  const [selectedJobId, setSelectedJobId] = useState(initialJobId ?? jobs[0]?.id ?? "");
  const [activeQuestion, setActiveQuestion] = useState<ApplyQuestion | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [manualPrompt, setManualPrompt] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;

  async function generate(question: ApplyQuestion, mode: "api" | "prompt_only") {
    if (!selectedJobId) return;
    setLoading(true);
    setActiveQuestion(question);
    setDraft(null);
    setManualPrompt(null);
    setError(null);

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: selectedJobId, question, mode }),
      });
      const data = await res.json() as { draft?: string; prompt?: string; error?: string };
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

  return (
    <div className="space-y-6">
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Apply</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Generate tailored application answers from your CV and evaluation. You copy and paste — never auto-submitted.
        </p>
      </div>

      {/* Setup notices */}
      {!hasCV && (
        <Surface tone="warn" className="p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm">CV missing — add it in Settings to generate answers.</p>
            <Button href="/dashboard/settings" ghost tone="warn">Settings</Button>
          </div>
        </Surface>
      )}

      {jobs.length === 0 && (
        <Surface className="border-dashed p-8 text-center">
          <p className="text-lg font-bold">No evaluated jobs</p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted-foreground)]">
            Evaluate a job first — the apply assistant uses the evaluation context to personalise answers.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button tone="accent" href="/dashboard/pipeline">Go to pipeline</Button>
          </div>
        </Surface>
      )}

      {jobs.length > 0 && (
        <>
          {/* Job selector */}
          <Surface className="p-5">
            <SectionTitle title="Select job" subtitle="Pick the role you are applying to" />
            <select
              value={selectedJobId}
              onChange={(e) => {
                setSelectedJobId(e.target.value);
                setDraft(null);
                setManualPrompt(null);
                setActiveQuestion(null);
              }}
              className="mt-2 w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} — {j.company}
                </option>
              ))}
            </select>
            {selectedJob && (
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge tone="default">{selectedJob.status}</Badge>
                {selectedJob.archetype && <Badge>{selectedJob.archetype}</Badge>}
              </div>
            )}
          </Surface>

          {/* Question grid */}
          <Surface className="p-5">
            <SectionTitle
              title="Application questions"
              subtitle={hasProvider ? "Click to generate · or use Manual mode for any question" : "No API key — use Manual mode to copy prompts"}
            />
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {QUESTIONS.map((q) => (
                <div key={q} className="flex flex-col gap-2 rounded-[18px] border border-[var(--line)] p-4">
                  <p className="text-sm font-bold">{APPLY_QUESTION_LABELS[q]}</p>
                  <div className="flex flex-wrap gap-2">
                    {hasProvider && (
                      <Button
                        tone={activeQuestion === q && draft ? "ok" : "accent"}
                        onClick={() => generate(q, "api")}
                        disabled={loading || !hasCV}
                      >
                        {loading && activeQuestion === q ? "Writing…" : "Generate"}
                      </Button>
                    )}
                    <Button
                      ghost
                      onClick={() => generate(q, "prompt_only")}
                      disabled={loading || !hasCV}
                    >
                      Copy prompt
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Surface>

          {/* Error */}
          {error && (
            <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
              {error}
            </p>
          )}

          {/* Draft output */}
          {draft && (
            <DraftPanel draft={draft} onCopy={copyDraft} copied={copied} />
          )}

          {/* Manual prompt output */}
          {manualPrompt && <ManualPromptPanel prompt={manualPrompt} />}

          {/* Checklist */}
          <Surface className="p-5">
            <SectionTitle title="Before you apply" subtitle="Human-in-the-loop checklist" />
            <div className="space-y-2 text-sm text-[var(--muted-foreground)]">
              {[
                "Verify salary and location fields yourself — this tool never submits for you",
                "Attach the tailored resume from the Resumes page, not your base CV",
                "Update the tracker status to Applied after submitting",
                "Set a follow-up reminder in the Follow-up page for day 7",
              ].map((item) => (
                <div key={item} className="flex gap-2 py-1 border-b border-dashed border-[var(--line-soft)] last:border-b-0">
                  <span className="text-[var(--ok)]">·</span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </Surface>
        </>
      )}
    </div>
  );
}
