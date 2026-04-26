"use client";

import { useState } from "react";
import { Surface, SectionTitle, Button, Eyebrow, Badge, EmptyState } from "./ui";

type TrainingEval = {
  score?: number;
  verdict?: "recommended" | "conditional" | "not_recommended";
  role_fit?: string;
  roi?: string;
  signal_value?: string;
  alternative?: string;
  recommendation?: string;
};

type Mode = "api" | "manual";

function scoreTone(s: number) {
  if (s >= 4) return "ok" as const;
  if (s >= 3) return "warn" as const;
  return "bad" as const;
}

function verdictLabel(v: TrainingEval["verdict"]) {
  if (v === "recommended") return "Recommended";
  if (v === "conditional") return "Conditional";
  return "Not Recommended";
}

function verdictTone(v: TrainingEval["verdict"]) {
  if (v === "recommended") return "ok" as const;
  if (v === "conditional") return "warn" as const;
  return "bad" as const;
}

export function TrainingPageContent({
  hasCV,
  hasProvider,
}: {
  hasCV: boolean;
  hasProvider: boolean;
}) {
  const [courseName, setCourseName] = useState("");
  const [description, setDescription] = useState("");
  const [timeCommitment, setTimeCommitment] = useState("");
  const [cost, setCost] = useState("");
  const [mode, setMode] = useState<Mode>(hasProvider ? "api" : "manual");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [promptText, setPromptText] = useState("");
  const [manualPaste, setManualPaste] = useState("");
  const [evaluation, setEvaluation] = useState<TrainingEval | null>(null);
  const [evalCourse, setEvalCourse] = useState("");
  const [copied, setCopied] = useState(false);

  async function run() {
    if (!courseName.trim()) { setError("Course name is required."); return; }
    if (!description.trim()) { setError("Description is required."); return; }
    setError("");
    setEvaluation(null);
    setPromptText("");
    setLoading(true);
    try {
      const res = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course_name: courseName,
          description,
          time_commitment: timeCommitment || undefined,
          cost: cost || undefined,
          mode: mode === "manual" ? "prompt_only" : "api",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Request failed"); return; }
      if (mode === "manual") {
        setPromptText(data.prompt);
      } else {
        setEvaluation(data.evaluation as TrainingEval);
        setEvalCourse(data.course_name);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function importManual() {
    try {
      const parsed = JSON.parse(manualPaste) as TrainingEval;
      setEvaluation(parsed);
      setEvalCourse(courseName);
    } catch {
      setError("Invalid JSON — paste the AI's raw output.");
    }
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <div className="space-y-8 p-6 max-w-3xl">
      <div>
        <Eyebrow className="mb-1">Skills & Learning</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">Training Evaluator</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Decide if a course or certification is worth your time given your job search goals.
        </p>
      </div>

      {/* Mode toggle */}
      {hasProvider && (
        <div className="flex gap-2">
          {(["api", "manual"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`rounded-full border px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em] transition ${
                mode === m
                  ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                  : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted-foreground)]"
              }`}
            >
              {m === "api" ? "API Mode" : "Manual Mode"}
            </button>
          ))}
        </div>
      )}

      <Surface className="p-5 space-y-4">
        <SectionTitle title="Course Details" />

        <label className="block">
          <Eyebrow className="mb-2 block">Course / certification name *</Eyebrow>
          <input
            type="text"
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="e.g. AWS Solutions Architect Associate"
            className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
          />
        </label>

        <label className="block">
          <Eyebrow className="mb-2 block">Description *</Eyebrow>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="What the course covers, who it's for, what you'll learn…"
            className="w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Eyebrow className="mb-2 block">Time commitment (optional)</Eyebrow>
            <input
              type="text"
              value={timeCommitment}
              onChange={(e) => setTimeCommitment(e.target.value)}
              placeholder="e.g. 40 hours, 3 months"
              className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
            />
          </label>

          <label className="block">
            <Eyebrow className="mb-2 block">Cost (optional)</Eyebrow>
            <input
              type="text"
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              placeholder="e.g. $300, free"
              className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
            />
          </label>
        </div>

        {!hasCV && (
          <p className="rounded-[14px] border border-[var(--warn)] bg-[#faf2df] px-4 py-2 text-sm">
            Tip: add your CV in{" "}
            <a href="/dashboard/settings" className="underline">Settings</a>{" "}
            for more personalised advice.
          </p>
        )}

        {error && (
          <p className="rounded-full bg-[#faebeb] px-4 py-2 text-sm text-[var(--bad)]">{error}</p>
        )}

        <Button
          tone="accent"
          onClick={run}
          disabled={loading || !courseName.trim() || !description.trim()}
        >
          {loading ? "Evaluating…" : mode === "manual" ? "Generate Prompt" : "Evaluate Course"}
        </Button>
      </Surface>

      {/* Manual prompt */}
      {mode === "manual" && promptText && (
        <Surface className="p-5 space-y-4">
          <SectionTitle
            title="Step 1 — Copy prompt"
            subtitle="Paste into Claude.ai or ChatGPT"
            action={
              <Button ghost tone="accent" onClick={() => copy(promptText)}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            }
          />
          <textarea
            readOnly
            value={promptText}
            rows={10}
            className="w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3 font-mono text-xs outline-none"
          />

          <SectionTitle title="Step 2 — Paste AI output" subtitle="Paste the raw JSON response below" />
          <textarea
            value={manualPaste}
            onChange={(e) => setManualPaste(e.target.value)}
            rows={8}
            placeholder='{"score": 4.0, "verdict": "recommended", ...}'
            className="w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 font-mono text-xs outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
          />
          <Button tone="ok" onClick={importManual} disabled={!manualPaste.trim()}>
            Import Evaluation
          </Button>
        </Surface>
      )}

      {/* Evaluation result */}
      {evaluation && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">{evalCourse}</h2>
            {evaluation.score !== undefined && (
              <Badge tone={scoreTone(evaluation.score)} fill>
                {evaluation.score.toFixed(1)} / 5.0
              </Badge>
            )}
            {evaluation.verdict && (
              <Badge tone={verdictTone(evaluation.verdict)}>
                {verdictLabel(evaluation.verdict)}
              </Badge>
            )}
          </div>

          {[
            { key: "role_fit", label: "Role Fit" },
            { key: "roi", label: "ROI" },
            { key: "signal_value", label: "Signal Value" },
            { key: "alternative", label: "Higher-ROI Alternative" },
            { key: "recommendation", label: "Recommendation" },
          ].map(({ key, label }) => {
            const val = evaluation[key as keyof TrainingEval] as string | undefined;
            if (!val) return null;
            const isAlt = key === "alternative";
            const isRec = key === "recommendation";
            return (
              <Surface
                key={key}
                tone={isAlt ? "warn" : isRec ? "ok" : "default"}
                className="p-5"
              >
                <Eyebrow className="mb-2">{label}</Eyebrow>
                <p className="text-sm leading-relaxed">{val}</p>
              </Surface>
            );
          })}
        </div>
      )}

      {!evaluation && !promptText && !loading && (
        <EmptyState
          title="No evaluation yet"
          body="Enter a course name and description above to get a personalised ROI assessment."
        />
      )}
    </div>
  );
}
