"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createJob, deleteJob, updateJobStatus } from "@/app/actions/jobs";
import type { JobRow } from "@/lib/db/types";

const ARCHETYPES = [
  "FDE", "SA", "PM", "LLMOps", "Agentic", "Transformation",
  "AI Platform", "Technical PM", "Backend", "Platform", "Product Eng",
];

const SOURCES = ["manual", "scanner", "batch", "referral", "linkedin", "other"];

// Company logo placeholder (consistent with dashboard-home)
function CompanyLogo({ name, size = 32 }: { name: string; size?: number }) {
  const initial = (name || "?").charAt(0);
  const colors = [
    { bg: "rgba(31,78,200,0.1)", fg: "#1f4ec8" },
    { bg: "rgba(47,122,58,0.1)", fg: "#2f7a3a" },
    { bg: "rgba(176,115,19,0.1)", fg: "#b07313" },
    { bg: "rgba(200,74,31,0.1)", fg: "#c84a1f" },
    { bg: "rgba(106,99,88,0.12)", fg: "#6b6358" },
    { bg: "rgba(136,80,180,0.1)", fg: "#7140a3" },
  ];
  const c = colors[(name || "").charCodeAt(0) % colors.length];
  return (
    <div
      className="inline-flex shrink-0 items-center justify-center"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.18),
        background: c.bg, color: c.fg,
        fontFamily: "var(--font-mono-stack)",
        fontWeight: 500,
        fontSize: Math.round(size * 0.42),
        border: `1px solid ${c.fg}33`,
      }}
    >
      {initial}
    </div>
  );
}

function LabelEl({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="uppercase text-[var(--muted-foreground)]"
      style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, letterSpacing: "0.12em", marginBottom: 6 }}
    >
      {children}
    </div>
  );
}

function AddJobForm({
  onDone,
  existingJobs,
}: {
  onDone: () => void;
  existingJobs: Array<{ title: string; company: string }>;
}) {
  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");

  const duplicate = title.trim() && company.trim()
    ? existingJobs.find(
        (j) =>
          j.title.toLowerCase() === title.trim().toLowerCase() &&
          j.company.toLowerCase() === company.trim().toLowerCase(),
      )
    : null;

  const inputCls = "w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--line)]";

  return (
    <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)]" style={{ padding: 24 }}>
      <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Add job to pipeline</div>
      <div className="text-[13px] text-[var(--muted-foreground)] mb-5">Manually enter a role — will evaluate from here.</div>

      <form action={createJob} className="space-y-4">
        {duplicate && (
          <p className="rounded-[6px] border border-[var(--warn)] px-4 py-3 text-[12px] text-[var(--warn)]"
            style={{ background: "var(--warn-bg)" }}>
            Possible duplicate — this role already exists in your pipeline.
          </p>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <LabelEl>Job title</LabelEl>
            <input name="title" placeholder="Senior Software Engineer" value={title}
              onChange={(e) => setTitle(e.target.value)} className={inputCls} />
          </label>
          <label className="block">
            <LabelEl>Company</LabelEl>
            <input name="company" placeholder="Stripe" value={company}
              onChange={(e) => setCompany(e.target.value)} className={inputCls} />
          </label>
        </div>
        <label className="block">
          <LabelEl>URL</LabelEl>
          <input name="url" placeholder="https://stripe.com/jobs/..." className={inputCls} />
        </label>
        <label className="block">
          <LabelEl>Job description (paste full text)</LabelEl>
          <textarea
            name="description"
            placeholder="Paste the full JD here — used by the evaluator"
            rows={5}
            className={`${inputCls} resize-y leading-[1.55]`}
          />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <LabelEl>Source</LabelEl>
            <select name="source" className={inputCls}>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <LabelEl>Archetype</LabelEl>
            <select name="archetype" className={inputCls}>
              <option value="">Detect automatically</option>
              {ARCHETYPES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-[#fffdf8] transition hover:bg-[var(--accent-hover)]"
          >
            Add to pipeline
          </button>
          <button
            type="button"
            onClick={onDone}
            className="inline-flex items-center rounded-[6px] border border-[var(--line-soft)] px-4 py-2 text-[13px] text-[var(--foreground)] transition hover:border-[var(--line)]"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

const FILTERS = ["All", "Pending", "Applied", "Interview", "Offer", "Evaluated"] as const;
type FilterKey = typeof FILTERS[number];

function matchesFilter(job: JobRow, filter: FilterKey, search: string): boolean {
  const q = search.toLowerCase();
  if (q && !job.title.toLowerCase().includes(q) && !job.company.toLowerCase().includes(q)) return false;
  if (filter === "All") return true;
  if (filter === "Pending") return job.status === "pending";
  if (filter === "Evaluated") return job.status === "evaluated";
  return job.status?.toLowerCase() === filter.toLowerCase();
}

export function PipelinePageContent({
  jobs,
  existingJobs = [],
  error,
  message,
}: {
  jobs: JobRow[];
  existingJobs?: Array<{ title: string; company: string }>;
  error?: string;
  message?: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");
  const [search, setSearch] = useState("");
  const router = useRouter();

  const filtered = jobs.filter((j) => matchesFilter(j, activeFilter, search));

  const counts: Record<FilterKey, number> = {
    All:       jobs.length,
    Pending:   jobs.filter((j) => j.status === "pending").length,
    Applied:   jobs.filter((j) => j.status === "applied").length,
    Interview: jobs.filter((j) => j.status === "interview").length,
    Offer:     jobs.filter((j) => j.status === "offer").length,
    Evaluated: jobs.filter((j) => j.status === "evaluated").length,
  };

  useEffect(() => {
    if (filtered.length === 0) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "j") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "k") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "e" && focusedIndex >= 0) {
        e.preventDefault();
        router.push(`/dashboard/evaluate?job_id=${filtered[focusedIndex].id}`);
      } else if (e.key === "Escape") {
        setFocusedIndex(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [filtered, focusedIndex, router]);

  return (
    <div className="max-w-[1200px] mx-auto space-y-5">

      {/* ── Page header ── */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div
            className="uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em", marginBottom: 6 }}
          >
            Pipeline
          </div>
          <h1 style={{ fontSize: 26, letterSpacing: "-0.02em", fontWeight: 600 }}>
            All jobs{" "}
            <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>· {jobs.length}</span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[13px] font-medium text-[#fffdf8] transition hover:bg-[var(--accent-hover)]"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Add job
          </button>
        </div>
      </div>

      {/* ── Alerts ── */}
      {error && (
        <p className="rounded-[6px] border border-[var(--bad)] px-4 py-3 text-[12px] text-[var(--bad)]"
          style={{ background: "var(--bad-bg)" }}>
          {error}
        </p>
      )}
      {message && (
        <p className="rounded-[6px] border border-[var(--ok)] px-4 py-3 text-[12px] text-[var(--ok)]"
          style={{ background: "var(--ok-bg)" }}>
          {message}
        </p>
      )}

      {/* ── Add job form ── */}
      {showForm && (
        <AddJobForm onDone={() => setShowForm(false)} existingJobs={existingJobs} />
      )}

      {/* ── Filter bar ── */}
      <div
        className="flex items-center gap-1 overflow-x-auto rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)]"
        style={{ padding: 8 }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className="rounded-[4px] px-3 py-1.5 text-[13px] transition"
            style={{
              background: activeFilter === f ? "var(--background)" : "transparent",
              fontWeight: activeFilter === f ? 500 : 400,
              color: activeFilter === f ? "var(--foreground)" : "var(--muted-foreground)",
            }}
          >
            {f}{" "}
            <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, color: "var(--muted-foreground)" }}>
              {counts[f]}
            </span>
          </button>
        ))}
        <div className="flex-1" />
        <div
          className="flex items-center gap-2 rounded-[4px] px-2.5 py-1.5"
          style={{ background: "var(--background)", width: 220 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search jobs…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--muted-foreground-2)]"
          />
        </div>
      </div>

      {/* ── Job table ── */}
      <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] overflow-hidden">

        {/* Table header — desktop only */}
        <div
          className="hidden md:grid items-center gap-4 border-b border-[var(--line-soft)] bg-[var(--background)]"
          style={{
            gridTemplateColumns: "36px 1fr 110px 110px 110px 1fr",
            padding: "10px 18px",
          }}
        >
          <div />
          <span
            className="uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            Job
          </span>
          <span
            className="uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            Added
          </span>
          <span
            className="uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            Score
          </span>
          <span
            className="uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            Status
          </span>
          <span
            className="uppercase text-[var(--muted-foreground)] text-right"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            Actions
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="nr-stripes py-16 text-center">
            <div
              className="inline-flex items-center justify-center rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] mb-4"
              style={{ width: 56, height: 56 }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>
              </svg>
            </div>
            <h2 style={{ fontSize: 18, marginBottom: 6 }}>No jobs yet</h2>
            <p className="text-[14px] text-[var(--muted-foreground)] mb-5">
              {search ? "No jobs match your search." : "Add a job above or install the extension to start saving."}
            </p>
            {!search && (
              <div className="flex justify-center gap-2">
                <button
                  onClick={() => setShowForm(true)}
                  className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[13px] font-medium text-[#fffdf8] transition hover:bg-[var(--accent-hover)]"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
                  Add manually
                </button>
              </div>
            )}
          </div>
        ) : (
          filtered.map((job, i) => {
            const focused = focusedIndex === i;
            const addedDate = job.created_at
              ? new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—";
            return (
              <div
                key={job.id}
                className="transition"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
                  background: focused ? "var(--surface-soft)" : "transparent",
                  outline: focused ? "2px solid var(--accent)" : "none",
                  outlineOffset: -2,
                }}
              >
                {/* Mobile card layout */}
                <div className="flex items-start gap-3 p-4 md:hidden">
                  <CompanyLogo name={job.company} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div style={{ fontWeight: 500, fontSize: 14 }} className="truncate">{job.title}</div>
                        <div className="text-[12px] text-[var(--muted-foreground)]">{job.company}{job.archetype ? ` · ${job.archetype}` : ""}</div>
                      </div>
                      <form action={deleteJob}>
                        <input type="hidden" name="job_id" value={job.id} />
                        <input type="hidden" name="return_to" value="/dashboard/pipeline" />
                        <button type="submit" className="shrink-0 p-1 text-[var(--muted-foreground)] hover:text-[var(--bad)]">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                        </button>
                      </form>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <form action={updateJobStatus}>
                        <input type="hidden" name="job_id" value={job.id} />
                        <select
                          name="status"
                          defaultValue={job.status ?? "pending"}
                          onChange={(e) => { const form = e.currentTarget.form; if (form) form.requestSubmit(); }}
                          className="rounded-[4px] border border-[var(--line-soft)] bg-[var(--surface)] px-2 py-0.5 text-[11px] outline-none cursor-pointer"
                          style={{ fontFamily: "var(--font-mono-stack)", letterSpacing: "0.06em", color: "var(--foreground)" }}
                        >
                          <option value="pending">Pending</option>
                          <option value="applied">Applied</option>
                          <option value="interview">Interview</option>
                          <option value="offer">Offer</option>
                          <option value="evaluated">Evaluated</option>
                          <option value="skip">Skip</option>
                        </select>
                      </form>
                      <Link href={`/dashboard/evaluate?job_id=${job.id}`} className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--line-soft)] px-2 py-1 text-[12px] text-[var(--foreground)] transition hover:border-[var(--line)]">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/></svg>
                        Evaluate
                      </Link>
                      {job.url && (
                        <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-[4px] border border-[var(--line-soft)] px-2 py-1 text-[12px] text-[var(--muted-foreground)] transition hover:border-[var(--line)] hover:text-[var(--foreground)]">View JD</a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Desktop table row */}
                <div
                  className="hidden md:grid items-center gap-4"
                  style={{ gridTemplateColumns: "36px 1fr 110px 110px 110px 1fr", padding: "14px 18px" }}
                >
                  <CompanyLogo name={job.company} size={32} />
                  <div className="min-w-0">
                    <div style={{ fontWeight: 500, fontSize: 14 }} className="truncate">{job.title}</div>
                    <div className="text-[12.5px] text-[var(--muted-foreground)]">{job.company}{job.archetype ? ` · ${job.archetype}` : ""}</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 12, color: "var(--muted-foreground)" }}>{addedDate}</span>
                  <span className="text-[12px] text-[var(--muted-foreground)]">—</span>
                  <form action={updateJobStatus}>
                    <input type="hidden" name="job_id" value={job.id} />
                    <select
                      name="status"
                      defaultValue={job.status ?? "pending"}
                      onChange={(e) => { const form = e.currentTarget.form; if (form) form.requestSubmit(); }}
                      className="rounded-[4px] border border-[var(--line-soft)] bg-[var(--surface)] px-2 py-0.5 text-[11px] outline-none cursor-pointer"
                      style={{ fontFamily: "var(--font-mono-stack)", letterSpacing: "0.06em", color: "var(--foreground)" }}
                    >
                      <option value="pending">Pending</option>
                      <option value="applied">Applied</option>
                      <option value="interview">Interview</option>
                      <option value="offer">Offer</option>
                      <option value="evaluated">Evaluated</option>
                      <option value="skip">Skip</option>
                    </select>
                  </form>
                  <div className="flex items-center justify-end gap-1.5">
                    {job.url && (
                      <a href={job.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center rounded-[4px] border border-[var(--line-soft)] px-2 py-1 text-[12px] text-[var(--muted-foreground)] transition hover:border-[var(--line)] hover:text-[var(--foreground)]">View JD</a>
                    )}
                    <Link href={`/dashboard/evaluate?job_id=${job.id}`} className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--line-soft)] px-2 py-1 text-[12px] text-[var(--foreground)] transition hover:border-[var(--line)]">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/></svg>
                      Evaluate
                    </Link>
                    <form action={deleteJob}>
                      <input type="hidden" name="job_id" value={job.id} />
                      <input type="hidden" name="return_to" value="/dashboard/pipeline" />
                      <button type="submit" className="inline-flex items-center rounded-[4px] px-2 py-1 text-[12px] text-[var(--muted-foreground)] transition hover:text-[var(--bad)]">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {filtered.length > 0 && (
        <p
          className="text-[var(--muted-foreground)] text-center"
          style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.08em" }}
        >
          j/k to navigate · e to evaluate · esc to clear
        </p>
      )}
    </div>
  );
}
