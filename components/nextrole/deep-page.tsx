"use client";

import { useState } from "react";
import type { JobRow } from "@/lib/db/types";
import {
  Surface,
  SectionTitle,
  Button,
  Badge,
  Eyebrow,
  EmptyState,
} from "./ui";

type DossierShape = {
  company_overview?: string;
  product_strategy?: string;
  culture_signals?: string;
  market_position?: string;
  hiring_signals?: string;
  risks?: string[];
  questions_to_ask?: string[];
  talking_points?: string[];
};

type Mode = "api" | "manual";

export function DeepPageContent({
  jobs,
  hasProvider,
  initialJobId,
}: {
  jobs: JobRow[];
  hasProvider: boolean;
  initialJobId?: string;
}) {
  const [selectedJobId, setSelectedJobId] = useState<string>(initialJobId ?? "");
  const [companyOverride, setCompanyOverride] = useState("");
  const [focus, setFocus] = useState("");
  const [mode, setMode] = useState<Mode>(hasProvider ? "api" : "manual");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [promptText, setPromptText] = useState("");
  const [manualPaste, setManualPaste] = useState("");
  const [dossier, setDossier] = useState<DossierShape | null>(null);
  const [dossierCompany, setDossierCompany] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;
  const effectiveCompany = selectedJob?.company ?? companyOverride.trim();

  async function run() {
    if (!effectiveCompany) {
      setError("Select a job or enter a company name.");
      return;
    }
    setError("");
    setDossier(null);
    setPromptText("");
    setLoading(true);
    try {
      const res = await fetch("/api/deep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: selectedJobId || undefined,
          company: selectedJobId ? undefined : companyOverride,
          focus: focus || undefined,
          mode: mode === "manual" ? "prompt_only" : "api",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Request failed"); return; }
      if (mode === "manual") {
        setPromptText(data.prompt);
      } else {
        setDossier(data.dossier as DossierShape);
        setDossierCompany(data.company);
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function importManual() {
    try {
      const parsed = JSON.parse(manualPaste) as DossierShape;
      setDossier(parsed);
      setDossierCompany(effectiveCompany);
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
        <Eyebrow className="mb-1">Company Intelligence</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">Deep Research</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Generate a full intelligence dossier on any company before your interviews.
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

      {/* Input form */}
      <Surface className="p-5 space-y-4">
        <SectionTitle title="Research Target" subtitle="Pick a job or enter a company name" />

        <label className="block">
          <Eyebrow className="mb-2 block">Job (optional — loads company + JD)</Eyebrow>
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
          >
            <option value="">— No job selected —</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} @ {j.company}
              </option>
            ))}
          </select>
        </label>

        {!selectedJobId && (
          <label className="block">
            <Eyebrow className="mb-2 block">Company name</Eyebrow>
            <input
              type="text"
              value={companyOverride}
              onChange={(e) => setCompanyOverride(e.target.value)}
              placeholder="e.g. Stripe, Notion, Anthropic"
              className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
            />
          </label>
        )}

        <label className="block">
          <Eyebrow className="mb-2 block">Research focus (optional)</Eyebrow>
          <input
            type="text"
            value={focus}
            onChange={(e) => setFocus(e.target.value)}
            placeholder="e.g. engineering culture, growth stage, fundraising"
            className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
          />
        </label>

        {error && (
          <p className="rounded-full bg-[#faebeb] px-4 py-2 text-sm text-[var(--bad)]">{error}</p>
        )}

        <Button
          tone="accent"
          onClick={run}
          disabled={loading || !effectiveCompany}
        >
          {loading ? "Researching…" : mode === "manual" ? "Generate Prompt" : "Run Deep Research"}
        </Button>
      </Surface>

      {/* Manual prompt step */}
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
            placeholder='{"company_overview": "...", "risks": [...], ...}'
            className="w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 font-mono text-xs outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
          />
          <Button tone="ok" onClick={importManual} disabled={!manualPaste.trim()}>
            Import Dossier
          </Button>
        </Surface>
      )}

      {/* Dossier result */}
      {dossier && (
        <div className="space-y-4">
          <SectionTitle
            title={`Dossier — ${dossierCompany}`}
            action={
              <Button ghost tone="default" onClick={() => copy(JSON.stringify(dossier, null, 2))}>
                Export JSON
              </Button>
            }
          />

          {[
            { key: "company_overview", label: "Company Overview" },
            { key: "product_strategy", label: "Product Strategy" },
            { key: "culture_signals", label: "Culture Signals" },
            { key: "market_position", label: "Market Position" },
            { key: "hiring_signals", label: "Hiring Signals" },
          ].map(({ key, label }) => {
            const val = dossier[key as keyof DossierShape] as string | undefined;
            if (!val) return null;
            return (
              <Surface key={key} className="p-5">
                <Eyebrow className="mb-2">{label}</Eyebrow>
                <p className="text-sm leading-relaxed">{val}</p>
              </Surface>
            );
          })}

          {dossier.risks && dossier.risks.length > 0 && (
            <Surface tone="warn" className="p-5">
              <Eyebrow className="mb-3">Risks to know before interviewing</Eyebrow>
              <ul className="space-y-2">
                {dossier.risks.map((r, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--warn)]" />
                    {r}
                  </li>
                ))}
              </ul>
            </Surface>
          )}

          {dossier.questions_to_ask && dossier.questions_to_ask.length > 0 && (
            <Surface tone="ok" className="p-5">
              <Eyebrow className="mb-3">Smart questions to ask</Eyebrow>
              <ul className="space-y-2">
                {dossier.questions_to_ask.map((q, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="font-mono text-[var(--ok)]">Q{i + 1}</span>
                    {q}
                  </li>
                ))}
              </ul>
            </Surface>
          )}

          {dossier.talking_points && dossier.talking_points.length > 0 && (
            <Surface tone="accent" className="p-5">
              <Eyebrow className="mb-3">Talking points — why you want to join</Eyebrow>
              <ul className="space-y-2">
                {dossier.talking_points.map((tp, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />
                    {tp}
                  </li>
                ))}
              </ul>
            </Surface>
          )}
        </div>
      )}

      {!dossier && !promptText && !loading && (
        <EmptyState
          title="No dossier yet"
          body="Select a job or enter a company name above to generate a research brief."
        />
      )}
    </div>
  );
}
