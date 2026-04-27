"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Badge,
  Button,
  Display,
  EmptyState,
  Eyebrow,
  StatCard,
  Surface,
} from "@/components/nextrole/ui";
import type { ResumeRow, JobRow } from "@/lib/db/types";
import type { ResumeData } from "@/lib/resume/template";

export type ResumeWithJob = ResumeRow & {
  jobs: Pick<JobRow, "title" | "company"> | null;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── List page ─────────────────────────────────────────────────────────────────

export function ResumesPageContent({
  resumes,
  jobs,
}: {
  resumes: ResumeWithJob[];
  jobs: Array<Pick<JobRow, "id" | "title" | "company" | "description">>;
}) {
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ resume_id: string; coverage: number } | null>(null);

  const jobsWithDesc = jobs.filter((j) => !!j.description);
  const avgCoverage =
    resumes.length > 0
      ? Math.round(resumes.reduce((s, r) => s + (r.coverage ?? 0), 0) / resumes.length)
      : null;

  async function generate() {
    if (!selectedJobId) return;
    setLoading(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: selectedJobId }),
      });
      const data = (await res.json()) as { resume_id?: string; coverage?: number; error?: string };
      if (!res.ok || data.error) {
        setError(data.error ?? "Generation failed");
      } else {
        setDone({ resume_id: data.resume_id!, coverage: data.coverage! });
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
        <Display className="mt-2 text-4xl sm:text-5xl">Resumes</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Tailored resume library — ATS-optimized HTML with print-to-PDF export.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard label="Total resumes" value={String(resumes.length)} sublabel="generated" />
        <StatCard
          label="Avg coverage"
          value={avgCoverage !== null ? `${avgCoverage}%` : "—"}
          sublabel="JD requirement match"
          tone={avgCoverage !== null && avgCoverage >= 75 ? "ok" : "default"}
        />
        <StatCard
          label="Final"
          value={String(resumes.filter((r) => r.status === "final").length)}
          sublabel="marked ready"
        />
      </div>

      {/* Generate new */}
      <Surface className="p-5">
        <h2 className="mb-3 text-base font-bold">Generate tailored resume</h2>
        {jobsWithDesc.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)]">
            Add a job with a description first —{" "}
            <Link href="/dashboard/pipeline" className="text-[var(--accent)] hover:underline">
              go to pipeline
            </Link>
            .
          </p>
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="mb-1 block font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
                Select job
              </label>
              <select
                value={selectedJobId}
                onChange={(e) => setSelectedJobId(e.target.value)}
                className="w-full rounded-[14px] border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              >
                <option value="">— choose a job —</option>
                {jobsWithDesc.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.title} at {j.company}
                  </option>
                ))}
              </select>
            </div>
            <Button
              tone="accent"
              onClick={generate}
              disabled={!selectedJobId || loading}
            >
              {loading ? "Generating… ~60s" : "Generate resume"}
            </Button>
          </div>
        )}

        {loading && (
          <div className="mt-4 flex items-center gap-3">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            <p className="font-mono text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">
              Tailoring resume to job description…
            </p>
          </div>
        )}
        {error && (
          <p className="mt-3 rounded-[14px] border border-[var(--bad)] bg-[#faebeb] px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--bad)]">
            {error}
          </p>
        )}
        {done && (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge tone="ok">Generated · {done.coverage}% coverage</Badge>
            <Button href={`/dashboard/resumes/${done.resume_id}`} tone="accent" ghost>
              View resume →
            </Button>
          </div>
        )}
      </Surface>

      {/* List */}
      {resumes.length === 0 ? (
        <EmptyState
          title="No resumes yet"
          body="Generate a tailored resume for any job with a description."
        />
      ) : (
        <div className="space-y-3">
          {resumes.map((r) => (
            <Link key={r.id} href={`/dashboard/resumes/${r.id}`} className="block">
              <Surface className="p-4 transition-shadow hover:shadow-md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Badge tone={r.status === "final" ? "ok" : "default"}>{r.status}</Badge>
                    <div>
                      <p className="font-semibold">{r.title}</p>
                      {r.jobs && (
                        <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                          {r.jobs.title} at {r.jobs.company}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {r.coverage !== null && (
                      <span
                        className={`font-mono text-xs font-bold ${r.coverage >= 75 ? "text-[var(--ok)]" : r.coverage >= 55 ? "text-[var(--warn)]" : "text-[var(--bad)]"}`}
                      >
                        {r.coverage}%
                      </span>
                    )}
                    <span className="font-mono text-xs text-[var(--muted-foreground)]">
                      {formatDate(r.created_at)}
                    </span>
                  </div>
                </div>
              </Surface>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Detail page ───────────────────────────────────────────────────────────────

function parseResumeData(content: string | null): ResumeData | null {
  if (!content) return null;
  try {
    return JSON.parse(content) as ResumeData;
  } catch {
    return null;
  }
}

export function ResumeDetailPageContent({
  resume,
  baseCv,
}: {
  resume: ResumeWithJob;
  baseCv?: string | null;
}) {
  const [diffMode, setDiffMode] = useState(false);
  const data = parseResumeData(resume.content);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <Eyebrow>Resume</Eyebrow>
          <Display className="mt-2 text-4xl sm:text-5xl">{resume.title}</Display>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge tone={resume.status === "final" ? "ok" : "default"}>{resume.status}</Badge>
            {resume.coverage !== null && (
              <span className="font-mono text-xs text-[var(--muted-foreground)]">
                {resume.coverage}% coverage
              </span>
            )}
            <span className="font-mono text-xs text-[var(--muted-foreground)]">
              {formatDate(resume.created_at)}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button href={`/api/resume/${resume.id}/html`} tone="accent">
            Print / Save PDF
          </Button>
          {baseCv && (
            <Button ghost onClick={() => setDiffMode((v) => !v)}>
              {diffMode ? "Resume view" : "Compare with CV"}
            </Button>
          )}
          <Button href="/dashboard/resumes">← All resumes</Button>
        </div>
      </div>

      {/* Diff view */}
      {diffMode && baseCv && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Surface className="p-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
              Base CV
            </p>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--foreground)]">
              {baseCv}
            </pre>
          </Surface>
          <Surface className="p-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
              Tailored resume
            </p>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--foreground)]">
              {resume.content ?? "No content saved"}
            </pre>
          </Surface>
        </div>
      )}

      {!data && (
        <Surface className="p-5">
          <p className="text-sm text-[var(--muted-foreground)]">
            Resume content not available.
          </p>
        </Surface>
      )}

      {data && (
        <div className="space-y-5">
          {/* Name + contact */}
          <Surface className="p-5">
            <p className="font-[var(--font-caveat)] text-3xl font-bold">{data.name}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-[var(--muted-foreground)]">
              {data.contact.email && <span>{data.contact.email}</span>}
              {data.contact.phone && <span>{data.contact.phone}</span>}
              {data.contact.location && <span>{data.contact.location}</span>}
              {data.contact.linkedin && <span>{data.contact.linkedin}</span>}
              {data.contact.github && <span>{data.contact.github}</span>}
            </div>
          </Surface>

          {/* Summary */}
          <Surface className="p-5">
            <Eyebrow className="mb-2">Professional Summary</Eyebrow>
            <p className="text-sm leading-6">{data.summary}</p>
          </Surface>

          {/* Competencies */}
          {data.competencies && data.competencies.length > 0 && (
            <Surface className="p-5">
              <Eyebrow className="mb-3">Core Competencies</Eyebrow>
              <div className="flex flex-wrap gap-2">
                {data.competencies.map((c, i) => (
                  <Badge key={i} tone="accent">{c}</Badge>
                ))}
              </div>
            </Surface>
          )}

          {/* Experience */}
          {data.experience && data.experience.length > 0 && (
            <Surface className="p-5">
              <Eyebrow className="mb-4">Experience</Eyebrow>
              <div className="space-y-5">
                {data.experience.map((e, i) => (
                  <div key={i}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">
                        {e.role}{" "}
                        <span className="font-normal text-[var(--muted-foreground)]">
                          · {e.company}
                        </span>
                      </p>
                      <span className="font-mono text-xs text-[var(--muted-foreground)]">
                        {e.period}
                        {e.location ? ` · ${e.location}` : ""}
                      </span>
                    </div>
                    <ul className="mt-2 ml-4 space-y-1 text-sm">
                      {e.bullets.map((b, j) => (
                        <li key={j} className="list-disc text-[var(--muted-foreground)]">
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {/* Projects */}
          {data.projects && data.projects.length > 0 && (
            <Surface className="p-5">
              <Eyebrow className="mb-4">Projects</Eyebrow>
              <div className="space-y-3">
                {data.projects.map((p, i) => (
                  <div key={i}>
                    <p className="font-semibold text-sm">{p.title}</p>
                    <p className="text-sm text-[var(--muted-foreground)]">{p.description}</p>
                    {p.tech && p.tech.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {p.tech.map((t, j) => (
                          <Badge key={j}>{t}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {/* Education */}
          {data.education && data.education.length > 0 && (
            <Surface className="p-5">
              <Eyebrow className="mb-3">Education</Eyebrow>
              <div className="space-y-2">
                {data.education.map((e, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium">{e.degree}</span>
                    <span className="text-[var(--muted-foreground)]">
                      {" · "}
                      {e.institution}
                      {e.year ? ` · ${e.year}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </Surface>
          )}

          {/* Skills */}
          {data.skills && Object.keys(data.skills).length > 0 && (
            <Surface className="p-5">
              <Eyebrow className="mb-3">Skills</Eyebrow>
              <div className="space-y-2">
                {Object.entries(data.skills).map(([cat, items]) => (
                  <div key={cat} className="flex gap-3 text-sm">
                    <span className="w-28 flex-shrink-0 font-medium text-[var(--muted-foreground)]">
                      {cat}
                    </span>
                    <span>{items.join(", ")}</span>
                  </div>
                ))}
              </div>
            </Surface>
          )}
        </div>
      )}
    </div>
  );
}
