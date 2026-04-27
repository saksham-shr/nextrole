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
import type { JobRow } from "@/lib/db/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Decision = "apply" | "watch" | "skip";
type EvalMode = "api" | "manual";

interface RoleFit {
  score: number; summary: string; details: string; signals: string[];
}
interface CompAnalysis {
  score: number; summary: string; details: string; market_position: string;
}
interface CvMatch {
  score: number; summary: string; coverage: string; gaps: string[]; strengths: string[];
}
interface PersonGuidance {
  summary: string; tactics: string[]; angle: string;
}
interface InterviewSignals {
  likely_topics: string[]; red_flags: string[]; preparation_notes: string;
}
interface LegitimacyCheck {
  score: number; verdict: string; notes: string;
}
interface LevelStrategy {
  score: number; summary: string; seniority_fit: string; progression_value: string; notes: string;
}
interface DecisionBlock {
  score: number; decision: Decision; rationale: string; priority: string;
}
interface EvalBlocks {
  role_fit: RoleFit;
  compensation_analysis: CompAnalysis;
  cv_match: CvMatch;
  personalization_guidance: PersonGuidance;
  interview_signals: InterviewSignals;
  legitimacy_check: LegitimacyCheck;
  level_strategy: LevelStrategy;
  decision: DecisionBlock;
}
interface EvalResponse {
  evaluation_id?: string;
  score: number;
  decision: Decision;
  blocks: EvalBlocks;
  error?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DECISION_TONE = { apply: "ok", watch: "warn", skip: "bad" } as const;
const DECISION_LABEL = { apply: "Apply", watch: "Watch", skip: "Skip" };

// ─── Small reusable pieces ────────────────────────────────────────────────────

function ScoreChip({ score }: { score: number }) {
  const tone = score >= 4.0 ? "ok" : score >= 3.0 ? "warn" : "bad";
  return <Badge tone={tone} fill className="tabular-nums">{score.toFixed(1)}</Badge>;
}

function BlockCard({
  title, score, children,
}: {
  title: string; score?: number; children: React.ReactNode;
}) {
  return (
    <Surface className="p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <Eyebrow>{title}</Eyebrow>
        {score !== undefined && <ScoreChip score={score} />}
      </div>
      <div className="space-y-2 text-sm">{children}</div>
    </Surface>
  );
}

function StringList({ items, tone }: { items: string[]; tone?: "ok" | "bad" | "warn" }) {
  if (!items?.length) return <p className="text-[var(--muted-foreground)]">None noted</p>;
  return (
    <ul className="space-y-1">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className={tone === "ok" ? "text-[var(--ok)]" : tone === "bad" ? "text-[var(--bad)]" : "text-[var(--muted-foreground)]"}>
            {tone === "ok" ? "+" : tone === "bad" ? "−" : "·"}
          </span>
          <span className="text-[var(--foreground)]">{item}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Results panel ────────────────────────────────────────────────────────────

function ResultsPanel({ score, decision, blocks }: { score: number; decision: Decision; blocks: EvalBlocks }) {
  return (
    <div className="space-y-4">
      <Surface className="p-5">
        <div className="flex flex-wrap items-center gap-6">
          <div>
            <Eyebrow>Overall score</Eyebrow>
            <p className="mt-1 font-[var(--font-caveat)] text-5xl font-bold leading-none">{score.toFixed(1)}</p>
          </div>
          <div>
            <Eyebrow>Decision</Eyebrow>
            <div className="mt-1">
              <Badge tone={DECISION_TONE[decision]} fill className="text-sm">{DECISION_LABEL[decision]}</Badge>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-sm leading-6">{blocks.decision.rationale}</p>
          </div>
        </div>
      </Surface>

      <div className="grid gap-4 lg:grid-cols-2">
        <BlockCard title="A · Role Fit" score={blocks.role_fit.score}>
          <p className="font-semibold">{blocks.role_fit.summary}</p>
          <p className="text-[var(--muted-foreground)]">{blocks.role_fit.details}</p>
          {blocks.role_fit.signals?.length > 0 && <StringList items={blocks.role_fit.signals} />}
        </BlockCard>

        <BlockCard title="B · Compensation" score={blocks.compensation_analysis.score}>
          <p className="font-semibold">{blocks.compensation_analysis.summary}</p>
          <p className="text-[var(--muted-foreground)]">{blocks.compensation_analysis.details}</p>
          <Badge tone="default" className="mt-1">{blocks.compensation_analysis.market_position ?? "unknown"} market</Badge>
        </BlockCard>

        <BlockCard title="C · CV Match" score={blocks.cv_match.score}>
          <p className="font-semibold">{blocks.cv_match.summary}</p>
          <p className="text-[var(--muted-foreground)]">Coverage: {blocks.cv_match.coverage}</p>
          {blocks.cv_match.strengths?.length > 0 && (
            <div><Eyebrow className="mb-1">Strengths</Eyebrow><StringList items={blocks.cv_match.strengths} tone="ok" /></div>
          )}
          {blocks.cv_match.gaps?.length > 0 && (
            <div><Eyebrow className="mb-1">Gaps</Eyebrow><StringList items={blocks.cv_match.gaps} tone="bad" /></div>
          )}
        </BlockCard>

        <BlockCard title="D · Personalization">
          <p className="font-semibold">{blocks.personalization_guidance.angle}</p>
          <p className="text-[var(--muted-foreground)]">{blocks.personalization_guidance.summary}</p>
          {blocks.personalization_guidance.tactics?.length > 0 && <StringList items={blocks.personalization_guidance.tactics} />}
        </BlockCard>

        <BlockCard title="E · Interview Signals">
          <p>{blocks.interview_signals.preparation_notes}</p>
          {blocks.interview_signals.likely_topics?.length > 0 && (
            <div><Eyebrow className="mb-1">Likely topics</Eyebrow><StringList items={blocks.interview_signals.likely_topics} tone="ok" /></div>
          )}
          {blocks.interview_signals.red_flags?.length > 0 && (
            <div><Eyebrow className="mb-1">Red flags</Eyebrow><StringList items={blocks.interview_signals.red_flags} tone="bad" /></div>
          )}
        </BlockCard>

        <BlockCard title="F · Legitimacy" score={blocks.legitimacy_check.score}>
          <Badge tone={blocks.legitimacy_check.verdict === "legitimate" ? "ok" : blocks.legitimacy_check.verdict === "suspicious" ? "bad" : "default"}>
            {blocks.legitimacy_check.verdict}
          </Badge>
          <p className="text-[var(--muted-foreground)]">{blocks.legitimacy_check.notes}</p>
        </BlockCard>

        <BlockCard title="G · Level Strategy" score={blocks.level_strategy?.score}>
          <p className="font-semibold">{blocks.level_strategy?.summary}</p>
          <div className="flex flex-wrap gap-2 mt-1">
            <Badge tone={blocks.level_strategy?.seniority_fit === "right_level" ? "ok" : "warn"}>
              {blocks.level_strategy?.seniority_fit?.replace(/_/g, " ")}
            </Badge>
            <Badge tone={blocks.level_strategy?.progression_value === "high" ? "ok" : blocks.level_strategy?.progression_value === "low" ? "bad" : "default"}>
              {blocks.level_strategy?.progression_value} progression value
            </Badge>
          </div>
          <p className="text-[var(--muted-foreground)]">{blocks.level_strategy?.notes}</p>
        </BlockCard>
      </div>
    </div>
  );
}

// ─── Manual mode panel ────────────────────────────────────────────────────────

function ManualPanel({
  jobId,
  promptText,
  onResult,
}: {
  jobId: string;
  promptText: string | null;
  onResult: (r: EvalResponse) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [pasted, setPasted] = useState("");
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copyPrompt() {
    if (!promptText) return;
    await navigator.clipboard.writeText(promptText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function importResult() {
    if (!pasted.trim()) { setError("Paste the AI response first"); return; }
    setImporting(true);
    setError(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: jobId, mode: "manual", raw_output: pasted }),
      });
      const data = (await res.json()) as EvalResponse;
      if (!res.ok || data.error) { setError(data.error ?? "Import failed"); }
      else { onResult(data); }
    } catch {
      setError("Network error — try again");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Step 1 */}
      <Surface className="p-5">
        <SectionTitle
          title="Step 1 — Copy the prompt"
          subtitle="Paste it into Claude.ai, ChatGPT, or any AI assistant that can respond in JSON"
        />
        {promptText ? (
          <>
            <textarea
              readOnly
              value={promptText}
              rows={8}
              className="mt-3 w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 font-mono text-[11px] leading-5 text-[var(--muted-foreground)] outline-none"
            />
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Button tone="accent" onClick={copyPrompt}>
                {copied ? "Copied!" : "Copy prompt"}
              </Button>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Works with Claude.ai · ChatGPT · Gemini · any LLM
              </p>
            </div>
          </>
        ) : (
          <p className="mt-3 text-sm text-[var(--muted-foreground)]">
            This job has no description — go back and paste the JD first.
          </p>
        )}
      </Surface>

      {/* Step 2 */}
      <Surface className="p-5">
        <SectionTitle
          title="Step 2 — Paste the response"
          subtitle="Ask the AI to respond with JSON only, then paste the full output here"
        />
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={10}
          placeholder='{ "blocks": { "role_fit": { ... }, ... }, "score": 4.2, "decision": "apply" }'
          className="mt-3 w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 font-mono text-[11px] leading-5 outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
        />
        {error && (
          <p className="mt-2 rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
            {error}
          </p>
        )}
        <div className="mt-3">
          <Button tone="accent" onClick={importResult} disabled={importing || !pasted.trim()}>
            {importing ? "Importing…" : "Import result"}
          </Button>
        </div>
      </Surface>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function EvaluatePageContent({
  job,
  hasCV,
  hasProvider,
  promptText,
}: {
  job: JobRow | null;
  hasCV: boolean;
  hasProvider: boolean;
  promptText: string | null;
}) {
  const [mode, setMode] = useState<EvalMode>(hasProvider ? "api" : "manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvalResponse | null>(null);

  const canRunApi = job && hasCV && hasProvider && !!job.description;

  async function runApiEval() {
    if (!job) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: job.id }),
      });
      const data = (await res.json()) as EvalResponse;
      if (!res.ok || data.error) setError(data.error ?? "Evaluation failed");
      else setResult(data);
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
          <Display className="mt-2 text-4xl sm:text-5xl">Evaluate</Display>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
            7-block AI assessment — run via API key or copy the prompt and paste into any AI.
          </p>
        </div>
        {!result && <Button href="/dashboard/pipeline">Back to pipeline</Button>}
        {result && (
          <div className="flex flex-wrap gap-2">
            <Button tone="accent" onClick={() => { setResult(null); setError(null); }} disabled={loading}>
              Re-evaluate
            </Button>
            <Button href="/dashboard/tracker">View tracker</Button>
          </div>
        )}
      </div>

      {/* Job card */}
      {job && (
        <Surface className="p-5">
          <SectionTitle
            title={`${job.title} — ${job.company}`}
            subtitle={[job.archetype, job.source ? `via ${job.source}` : null].filter(Boolean).join(" · ")}
            action={
              <Badge tone={result ? DECISION_TONE[result.decision] : "default"}>
                {result ? DECISION_LABEL[result.decision] : job.status}
              </Badge>
            }
          />
          {!job.description && (
            <p className="mt-2 rounded-[14px] border border-[var(--warn)] bg-[#faf2df] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--warn)]">
              No description — go back and paste the JD before evaluating.
            </p>
          )}
        </Surface>
      )}

      {/* No job selected */}
      {!job && (
        <Surface className="border-dashed p-8 text-center">
          <p className="text-lg font-bold">No job selected</p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-[var(--muted-foreground)]">
            Click Evaluate on any job in the pipeline or tracker to land here with context pre-loaded.
          </p>
          <div className="mt-5 flex justify-center gap-3">
            <Button tone="accent" href="/dashboard/pipeline">Go to pipeline</Button>
            <Button href="/dashboard/tracker">Go to tracker</Button>
          </div>
        </Surface>
      )}

      {/* Mode toggle — only show when job is loaded and not showing results */}
      {job && !result && (
        <div className="flex gap-2">
          <button
            onClick={() => setMode("api")}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${mode === "api" ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--surface)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted-foreground)]"}`}
          >
            API mode {hasProvider ? "" : "(no key)"}
          </button>
          <button
            onClick={() => setMode("manual")}
            className={`rounded-full border px-4 py-2 text-sm font-bold transition ${mode === "manual" ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--surface)]" : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted-foreground)]"}`}
          >
            Manual mode
          </button>
          {mode === "manual" && (
            <span className="self-center font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--ok)]">
              No API key needed
            </span>
          )}
        </div>
      )}

      {/* API mode: prerequisites + run button */}
      {job && !result && mode === "api" && (
        <>
          {(!hasCV || !hasProvider) && (
            <Surface tone="warn" className="p-5">
              <SectionTitle title="Setup required" subtitle="Complete these before running in API mode" />
              <div className="space-y-2">
                {!hasCV && (
                  <div className="flex items-center justify-between gap-4 border-b border-dashed border-[var(--line-soft)] py-2 last:border-b-0">
                    <p className="text-sm">CV missing — add it in Settings</p>
                    <Button href="/dashboard/settings" ghost tone="warn">Settings</Button>
                  </div>
                )}
                {!hasProvider && (
                  <div className="flex items-center justify-between gap-4 py-2">
                    <p className="text-sm">No AI provider — add an Anthropic or OpenAI key, or switch to Manual mode</p>
                    <Button href="/dashboard/providers" ghost tone="warn">Providers</Button>
                  </div>
                )}
              </div>
            </Surface>
          )}

          {error && (
            <p className="rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
              {error}
            </p>
          )}

          {canRunApi && (
            <div className="flex justify-center py-4">
              <Button tone="accent" onClick={runApiEval} disabled={loading} className="px-8 py-3 text-base">
                {loading ? "Evaluating… ~30s" : "Run evaluation"}
              </Button>
            </div>
          )}

          {loading && (
            <Surface className="p-8 text-center">
              <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
                Running 7-block evaluation · usually 20–40 seconds
              </p>
            </Surface>
          )}
        </>
      )}

      {/* Manual mode */}
      {job && !result && mode === "manual" && (
        <ManualPanel
          jobId={job.id}
          promptText={promptText}
          onResult={(r) => setResult(r)}
        />
      )}

      {/* Results */}
      {result && (
        <ResultsPanel score={result.score} decision={result.decision} blocks={result.blocks} />
      )}
    </div>
  );
}
