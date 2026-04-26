"use client";

import { useState } from "react";
import {
  Badge,
  Button,
  Display,
  Eyebrow,
  InputField,
  SectionTitle,
  Surface,
} from "@/components/nextrole/ui";
import { createJob, deleteJob } from "@/app/actions/jobs";
import type { JobRow } from "@/lib/db/types";

const ARCHETYPES = [
  "FDE",
  "SA",
  "PM",
  "LLMOps",
  "Agentic",
  "Transformation",
  "AI Platform",
  "Technical PM",
  "Backend",
  "Platform",
  "Product Eng",
];

const SOURCES = ["manual", "scanner", "batch", "referral", "linkedin", "other"];

function AddJobForm({ onDone }: { onDone: () => void }) {
  return (
    <Surface className="p-5">
      <SectionTitle title="Add job to pipeline" subtitle="Manual URL or paste — will evaluate from here" />
      <form action={createJob} className="mt-4 space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <InputField label="Job title" name="title" placeholder="Senior Software Engineer" />
          <InputField label="Company" name="company" placeholder="Stripe" />
        </div>
        <InputField label="URL" name="url" placeholder="https://stripe.com/jobs/..." />
        <InputField
          label="Job description (paste full text)"
          name="description"
          placeholder="Paste the full JD here — used by the evaluator"
          textarea
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <Eyebrow className="mb-2 block">Source</Eyebrow>
            <select
              name="source"
              className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              {SOURCES.map((s) => (
                <option key={s} value={s}>
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <Eyebrow className="mb-2 block">Archetype</Eyebrow>
            <select
              name="archetype"
              className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
            >
              <option value="">Detect automatically</option>
              {ARCHETYPES.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap gap-3 pt-1">
          <Button type="submit" tone="accent">
            Add to pipeline
          </Button>
          <Button type="button" ghost onClick={onDone}>
            Cancel
          </Button>
        </div>
      </form>
    </Surface>
  );
}

function JobRow({ job }: { job: JobRow }) {
  return (
    <div className="flex flex-wrap items-center gap-3 border-b border-dashed border-[var(--line-soft)] py-3 last:border-b-0">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold">{job.title}</p>
        <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          {job.company}
          {job.archetype ? ` · ${job.archetype}` : ""}
          {job.source ? ` · via ${job.source}` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        {job.url && (
          <a
            href={job.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--accent)]"
          >
            View JD
          </a>
        )}
        <Button href={`/dashboard/evaluate?job_id=${job.id}`} tone="accent">
          Evaluate
        </Button>
        <form action={deleteJob}>
          <input type="hidden" name="job_id" value={job.id} />
          <input type="hidden" name="return_to" value="/dashboard/pipeline" />
          <Button type="submit" ghost tone="bad">
            Remove
          </Button>
        </form>
      </div>
    </div>
  );
}

export function PipelinePageContent({
  jobs,
  error,
  message,
}: {
  jobs: JobRow[];
  error?: string;
  message?: string;
}) {
  const [showForm, setShowForm] = useState(false);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>NextRole workspace</Eyebrow>
          <Display className="mt-2 text-4xl sm:text-5xl">Pipeline</Display>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
            Triage pending roles before they become tracked applications.
          </p>
        </div>
        <Button tone="accent" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "Cancel" : "Add manual job"}
        </Button>
      </div>

      {error && (
        <p className="mb-4 rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
          {error}
        </p>
      )}
      {message && (
        <p className="mb-4 rounded-[14px] border border-[var(--ok)] bg-[#eef8f0] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--ok)]">
          {message}
        </p>
      )}

      {showForm && (
        <div className="mb-6">
          <AddJobForm onDone={() => setShowForm(false)} />
        </div>
      )}

      <Surface className="p-5">
        <SectionTitle
          title={`Pending · ${jobs.length} role${jobs.length !== 1 ? "s" : ""}`}
          subtitle="Intake area — evaluate, batch, or remove"
          action={
            <Badge tone={jobs.length > 0 ? "warn" : "default"}>
              {jobs.length} waiting
            </Badge>
          }
        />

        {jobs.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-[var(--muted-foreground)]">
              No jobs in pipeline. Add one above or run the scanner.
            </p>
            <div className="mt-4 flex justify-center gap-3">
              <Button tone="accent" onClick={() => setShowForm(true)}>
                Add manual job
              </Button>
              <Button href="/dashboard/scanner">Run scanner</Button>
            </div>
          </div>
        ) : (
          <div className="mt-4">
            {jobs.map((job) => (
              <JobRow key={job.id} job={job} />
            ))}
          </div>
        )}
      </Surface>
    </div>
  );
}
