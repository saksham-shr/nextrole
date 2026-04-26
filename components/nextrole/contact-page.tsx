"use client";

import { useState } from "react";
import type { JobRow } from "@/lib/db/types";
import type { ContactType } from "@/lib/contact/prompt";
import { CONTACT_TYPE_LABELS } from "@/lib/contact/prompt";
import {
  Surface,
  SectionTitle,
  Button,
  Eyebrow,
  Badge,
  EmptyState,
} from "./ui";

type Mode = "api" | "manual";

const CONTACT_TYPES: ContactType[] = [
  "recruiter_intro",
  "hiring_manager_outreach",
  "peer_networking",
  "referral_request",
  "post_application_nudge",
];

export function ContactPageContent({
  jobs,
  hasCV,
  candidateName,
  hasProvider,
  initialJobId,
}: {
  jobs: JobRow[];
  hasCV: boolean;
  candidateName: string | null;
  hasProvider: boolean;
  initialJobId?: string;
}) {
  const [selectedJobId, setSelectedJobId] = useState(initialJobId ?? jobs[0]?.id ?? "");
  const [contactType, setContactType] = useState<ContactType>("recruiter_intro");
  const [contactName, setContactName] = useState("");
  const [relationshipCtx, setRelationshipCtx] = useState("");
  const [mode, setMode] = useState<Mode>(hasProvider ? "api" : "manual");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [promptText, setPromptText] = useState("");
  const [manualPaste, setManualPaste] = useState("");
  const [copied, setCopied] = useState(false);

  const selectedJob = jobs.find((j) => j.id === selectedJobId) ?? null;
  const needsContact = contactType === "referral_request" || contactType === "post_application_nudge";

  async function generate() {
    if (!selectedJobId) { setError("Select a job."); return; }
    if (!hasCV) { setError("Add your CV in Settings first."); return; }
    setError("");
    setMessage("");
    setPromptText("");
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: selectedJobId,
          type: contactType,
          contact_name: contactName || undefined,
          relationship_context: relationshipCtx || undefined,
          mode: mode === "manual" ? "prompt_only" : "api",
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? "Request failed"); return; }
      if (mode === "manual") setPromptText(data.prompt);
      else setMessage(data.message);
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  function copyText(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const showPrereq = !hasCV;

  return (
    <div className="space-y-8 p-6 max-w-3xl">
      <div>
        <Eyebrow className="mb-1">Networking</Eyebrow>
        <h1 className="text-2xl font-bold tracking-tight">Contact Outreach</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Draft personalised messages to recruiters, hiring managers, and peers.
        </p>
      </div>

      {showPrereq && (
        <Surface tone="warn" className="p-4">
          <p className="text-sm font-bold">CV required</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Add your CV in{" "}
            <a href="/dashboard/settings" className="underline">Settings</a>{" "}
            to personalise outreach messages.
          </p>
        </Surface>
      )}

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

      {/* Job selector */}
      <Surface className="p-5 space-y-4">
        <SectionTitle title="Message Setup" />

        <label className="block">
          <Eyebrow className="mb-2 block">Job</Eyebrow>
          {jobs.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No jobs yet.{" "}
              <a href="/dashboard/jobs/new" className="underline">Add one</a>.
            </p>
          ) : (
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">— Select a job —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.title} @ {j.company}
                </option>
              ))}
            </select>
          )}
        </label>

        {/* Message type */}
        <div>
          <Eyebrow className="mb-3 block">Message type</Eyebrow>
          <div className="grid gap-2 sm:grid-cols-2">
            {CONTACT_TYPES.map((t) => (
              <button
                key={t}
                onClick={() => setContactType(t)}
                className={`rounded-[18px] border p-3 text-left text-sm transition ${
                  contactType === t
                    ? "border-[var(--accent)] bg-[#fcefe7] font-bold"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--muted-foreground)]"
                }`}
              >
                {CONTACT_TYPE_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Optional fields */}
        {needsContact && (
          <>
            <label className="block">
              <Eyebrow className="mb-2 block">Contact name (optional)</Eyebrow>
              <input
                type="text"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="e.g. Sarah Chen"
                className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
              />
            </label>
            <label className="block">
              <Eyebrow className="mb-2 block">Relationship context (optional)</Eyebrow>
              <input
                type="text"
                value={relationshipCtx}
                onChange={(e) => setRelationshipCtx(e.target.value)}
                placeholder="e.g. met at JS Conf 2024, ex-colleague"
                className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
              />
            </label>
          </>
        )}

        {error && (
          <p className="rounded-full bg-[#faebeb] px-4 py-2 text-sm text-[var(--bad)]">{error}</p>
        )}

        <Button
          tone="accent"
          onClick={generate}
          disabled={loading || !selectedJobId || showPrereq}
        >
          {loading ? "Writing…" : mode === "manual" ? "Generate Prompt" : "Draft Message"}
        </Button>
      </Surface>

      {/* Manual prompt */}
      {mode === "manual" && promptText && (
        <Surface className="p-5 space-y-4">
          <SectionTitle
            title="Step 1 — Copy prompt"
            subtitle="Paste into Claude.ai or ChatGPT"
            action={
              <Button ghost tone="accent" onClick={() => copyText(promptText)}>
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

          <SectionTitle title="Step 2 — Paste the message" subtitle="Copy the AI's plain-text response" />
          <textarea
            value={manualPaste}
            onChange={(e) => setManualPaste(e.target.value)}
            rows={6}
            placeholder="Paste the drafted message here…"
            className="w-full rounded-[18px] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
          />
          <Button tone="ok" onClick={() => setMessage(manualPaste)} disabled={!manualPaste.trim()}>
            Use this message
          </Button>
        </Surface>
      )}

      {/* Generated message */}
      {message && (
        <Surface tone="ok" className="p-5 space-y-3">
          <SectionTitle
            title={`${CONTACT_TYPE_LABELS[contactType]}${selectedJob ? ` — ${selectedJob.company}` : ""}`}
            action={
              <Button ghost tone="ok" onClick={() => copyText(message)}>
                {copied ? "Copied!" : "Copy"}
              </Button>
            }
          />
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
        </Surface>
      )}

      {!message && !promptText && !loading && (
        <EmptyState
          title="No message yet"
          body="Select a job, choose a message type, and click Draft Message."
        />
      )}
    </div>
  );
}
