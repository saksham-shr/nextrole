"use client";

import { useState } from "react";
import { Surface, SectionTitle, Button, Eyebrow, Badge, EmptyState } from "./ui";

type ProjectEval = {
  score?: number;
  verdict?: "build_now" | "refine_idea" | "skip";
  differentiation?: string;
  portfolio_fit?: string;
  scope_sanity?: string;
  narrative_strength?: string;
  hiring_signal?: string;
  suggested_tweak?: string | null;
  recommendation?: string;
};

type Mode = "api" | "manual";

function scoreTone(s: number) {
  if (s >= 4) return "ok" as const;
  if (s >= 3) return "warn" as const;
  return "bad" as const;
}

function verdictLabel(v: ProjectEval["verdict"]) {
  if (v === "build_now") return "Build Now";
  if (v === "refine_idea") return "Refine Idea";
  return "Skip";
}

function verdictTone(v: ProjectEval["verdict"]) {
  if (v === "build_now") return "ok" as const;
  if (v === "refine_idea") return "warn" as const;
  return "bad" as const;
}

export function ProjectPageContent({
  hasCV,
  hasProvider,
}: {
  hasCV: boolean;
  hasProvider: boolean;
}) {
  const [projectIdea, setProjectIdea] = useState("");
  const [description, setDescription] = useState("");
  const [stack, setStack] = useState("");
  const [mode, setMode] = useState<Mode>(hasProvider ? "api" : "manual");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [promptText, setPromptText] = useState("");
  const [manualPaste, setManualPaste] = useState("");
  const [evaluation, setEvaluation] = useState<ProjectEval | null>(null);
  const [evalProject, setEvalProject] = useState("");
  const [copied, setCopied] = useState(false);

  async function run() {
    if (!projectIdea.trim()) { setError("Project idea name is required."); return; }
    if (!description.trim()) { setError("Description is required."); return; }
    setError("");
    setEvaluation(null);
    setPromptText("");
    setLoading(true);
    try {
      const res = await fetch("/api/project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_idea: projectIdea,
          description,
          stack: stack || undefined,
          mode: mode === "manual" ? "prompt_only" : "api",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Request failed"); return; }
      if (mode === "manual") {
        setPromptText(data.prompt);
      } else {
        setEvaluation(data.evaluation as ProjectEval);
        setEvalProject(data.project_idea);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function importManual() {
    try {
      const parsed = JSON.parse(manualPaste) as ProjectEval;
      setEvaluation(parsed);
      setEvalProject(projectIdea);
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
        <Eyebrow className="mb-1">Portfolio</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">Project Evaluator</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Find out if a project idea will actually help you get hired — before you spend weeks building it.
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
        <SectionTitle title="Project Idea" />

        <label className="block">
          <Eyebrow className="mb-2 block">Project name *</Eyebrow>
          <input
            type="text"
            value={projectIdea}
            onChange={(e) => setProjectIdea(e.target.value)}
            placeholder="e.g. Real-time collaborative code editor"
            className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
          />
        </label>

        <label className="block">
          <Eyebrow className="mb-2 block">Description *</Eyebrow>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="What it does, what problem it solves, what you'll build and learn…"
            className="w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
          />
        </label>

        <label className="block">
          <Eyebrow className="mb-2 block">Stack / tools (optional)</Eyebrow>
          <input
            type="text"
            value={stack}
            onChange={(e) => setStack(e.target.value)}
            placeholder="e.g. Next.js, Supabase, WebSockets"
            className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
          />
        </label>

        {!hasCV && (
          <p className="rounded-[14px] border border-[var(--warn)] bg-[#faf2df] px-4 py-2 text-sm">
            Tip: add your CV and target roles in{" "}
            <a href="/dashboard/settings" className="underline">Settings</a>{" "}
            for more relevant portfolio advice.
          </p>
        )}

        {error && (
          <p className="rounded-full bg-[#faebeb] px-4 py-2 text-sm text-[var(--bad)]">{error}</p>
        )}

        <Button
          tone="accent"
          onClick={run}
          disabled={loading || !projectIdea.trim() || !description.trim()}
        >
          {loading ? "Evaluating…" : mode === "manual" ? "Generate Prompt" : "Evaluate Project"}
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
            placeholder='{"score": 4.2, "verdict": "build_now", ...}'
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
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-bold">{evalProject}</h2>
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
            { key: "differentiation", label: "Differentiation" },
            { key: "portfolio_fit", label: "Portfolio Fit" },
            { key: "scope_sanity", label: "Scope Sanity" },
            { key: "narrative_strength", label: "Narrative Strength" },
            { key: "hiring_signal", label: "Hiring Signal" },
          ].map(({ key, label }) => {
            const val = evaluation[key as keyof ProjectEval] as string | undefined;
            if (!val) return null;
            return (
              <Surface key={key} className="p-5">
                <Eyebrow className="mb-2">{label}</Eyebrow>
                <p className="text-sm leading-relaxed">{val}</p>
              </Surface>
            );
          })}

          {evaluation.suggested_tweak && (
            <Surface tone="warn" className="p-5">
              <Eyebrow className="mb-2">Suggested Tweak</Eyebrow>
              <p className="text-sm leading-relaxed">{evaluation.suggested_tweak}</p>
            </Surface>
          )}

          {evaluation.recommendation && (
            <Surface tone="ok" className="p-5">
              <Eyebrow className="mb-2">Recommendation</Eyebrow>
              <p className="text-sm leading-relaxed">{evaluation.recommendation}</p>
            </Surface>
          )}
        </div>
      )}

      {!evaluation && !promptText && !loading && (
        <EmptyState
          title="No evaluation yet"
          body="Describe a project idea above to get an honest assessment of its portfolio value."
        />
      )}
    </div>
  );
}
