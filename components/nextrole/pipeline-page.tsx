"use client";

import { useState, useEffect, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deleteJob, updateJobStatus, batchDeleteJobs, batchUpdateJobStatus } from "@/app/actions/jobs";
import type { JobRow, JobStatus } from "@/lib/db/types";

function ScoreBadge({ score }: { score: number | null | undefined }) {
  if (score == null) {
    return <span className="text-[12px] text-[var(--muted-foreground)]">—</span>;
  }
  const tone =
    score >= 4.0 ? { bg: "var(--ok-bg)", color: "var(--ok)" } :
    score >= 3.0 ? { bg: "var(--warn-bg)", color: "var(--warn)" } :
                  { bg: "var(--bad-bg)", color: "var(--bad)" };
  return (
    <span
      className="inline-flex items-center rounded-[4px] px-1.5 py-0.5"
      style={{ background: tone.bg, color: tone.color, fontFamily: "var(--font-mono-stack)", fontSize: 12, fontWeight: 500 }}
    >
      {score.toFixed(1)}
    </span>
  );
}

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

const FILTERS = ["All", "Pending", "Applied", "Interview", "Offer", "Evaluated"] as const;
type FilterKey = typeof FILTERS[number];

export function PipelinePageContent({
  jobs,
  error,
  message,
  page = 1,
  limit = 25,
  totalCount = 0,
  totalPages = 1,
  sort = "created_at",
  sortAsc = false,
  status = "All",
  q = "",
  totalAll = 0,
  statusCounts = {},
}: {
  jobs: JobRow[];
  error?: string;
  message?: string;
  page?: number;
  limit?: number;
  totalCount?: number;
  totalPages?: number;
  sort?: string;
  sortAsc?: boolean;
  status?: string;
  q?: string;
  totalAll?: number;
  statusCounts?: Record<string, number>;
}) {
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchInput, setSearchInput] = useState(q);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [batchPending, startBatchTransition] = useTransition();
  const router = useRouter();

  function pushParam(updates: Record<string, string | number | undefined>) {
    const url = new URL(window.location.href);
    Object.entries(updates).forEach(([k, v]) => {
      if (v === undefined || v === "" || v === "All" || (k === "page" && v === 1) || (k === "limit" && v === 25)) {
        url.searchParams.delete(k);
      } else {
        url.searchParams.set(k, String(v));
      }
    });
    router.push(url.pathname + url.search);
  }

  function setFilter(f: string) {
    pushParam({ status: f === "All" ? undefined : f, page: undefined });
    setSelected(new Set());
  }

  function setSort(col: string) {
    if (sort === col) {
      pushParam({ order: sortAsc ? "desc" : "asc", page: undefined });
    } else {
      pushParam({ sort: col, order: "desc", page: undefined });
    }
  }

  function submitSearch(value: string) {
    pushParam({ q: value || undefined, page: undefined });
  }

  const counts: Record<string, number> = {
    All: totalAll,
    Pending: statusCounts["pending"] ?? 0,
    Applied: statusCounts["applied"] ?? 0,
    Interview: statusCounts["interview"] ?? 0,
    Offer: statusCounts["offer"] ?? 0,
    Evaluated: statusCounts["evaluated"] ?? 0,
  };

  const allSelected = jobs.length > 0 && jobs.every((j) => selected.has(j.id));

  function toggleSelectAll() {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(jobs.map((j) => j.id)));
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBatchDelete() {
    const ids = [...selected];
    startBatchTransition(async () => {
      await batchDeleteJobs(ids);
      setSelected(new Set());
      router.refresh();
    });
  }

  function handleBatchStatus(newStatus: JobStatus) {
    const ids = [...selected];
    startBatchTransition(async () => {
      await batchUpdateJobStatus(ids, newStatus);
      setSelected(new Set());
      router.refresh();
    });
  }

  useEffect(() => {
    if (jobs.length === 0) return;
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "j") {
        e.preventDefault();
        setFocusedIndex((i) => Math.min(i + 1, jobs.length - 1));
      } else if (e.key === "k") {
        e.preventDefault();
        setFocusedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "e" && focusedIndex >= 0) {
        e.preventDefault();
        router.push(`/dashboard/evaluate?job_id=${jobs[focusedIndex].id}`);
      } else if (e.key === "Escape") {
        setFocusedIndex(-1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jobs, focusedIndex, router]);

  const SortIcon = ({ col }: { col: string }) =>
    sort === col ? (
      <span className="ml-0.5 text-[9px]">{sortAsc ? "▲" : "▼"}</span>
    ) : (
      <span className="ml-0.5 text-[9px] opacity-30">▼</span>
    );

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
            <span style={{ color: "var(--muted-foreground)", fontWeight: 400 }}>· {totalAll}</span>
          </h1>
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

      {/* ── Filter bar ── */}
      <div
        className="flex items-center gap-1 overflow-x-auto rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)]"
        style={{ padding: 8 }}
      >
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="rounded-[4px] px-3 py-1.5 text-[13px] transition"
            style={{
              background: status === f ? "var(--background)" : "transparent",
              fontWeight: status === f ? 500 : 400,
              color: status === f ? "var(--foreground)" : "var(--muted-foreground)",
            }}
          >
            {f}{" "}
            <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, color: "var(--muted-foreground)" }}>
              {counts[f] ?? 0}
            </span>
          </button>
        ))}
        <div className="flex-1" />
        {/* 25/50 toggle */}
        <div className="flex items-center gap-0.5 mr-2">
          {[25, 50].map((n) => (
            <button
              key={n}
              onClick={() => pushParam({ limit: n, page: undefined })}
              className="rounded-[4px] px-2 py-1 font-mono text-[10px] transition"
              style={{
                background: limit === n ? "var(--background)" : "transparent",
                color: limit === n ? "var(--foreground)" : "var(--muted-foreground)",
                border: limit === n ? "1px solid var(--line-soft)" : "1px solid transparent",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); submitSearch(searchInput); }}
          className="flex items-center gap-2 rounded-[4px] px-2.5 py-1.5"
          style={{ background: "var(--background)", width: 220 }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth="1.7" strokeLinecap="round">
            <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
          </svg>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onBlur={() => submitSearch(searchInput)}
            placeholder="Search jobs…"
            className="flex-1 bg-transparent text-[13px] outline-none placeholder:text-[var(--muted-foreground-2)]"
          />
        </form>
      </div>

      {/* ── Batch toolbar ── */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-2.5">
          <span className="font-mono text-[11px] text-[var(--muted-foreground)]">{selected.size} selected</span>
          <button type="button" onClick={handleBatchDelete} disabled={batchPending}
            className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--bad)] hover:underline disabled:opacity-40">
            Delete
          </button>
          <select
            onChange={(e) => { if (e.target.value) handleBatchStatus(e.target.value as JobStatus); e.target.value = ""; }}
            disabled={batchPending}
            defaultValue=""
            className="rounded-[4px] border border-[var(--line-soft)] bg-[var(--background)] px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.08em] outline-none disabled:opacity-40"
          >
            <option value="" disabled>Move to…</option>
            <option value="applied">Applied</option>
            <option value="interview">Interview</option>
            <option value="offer">Offer</option>
            <option value="pending">Pending</option>
          </select>
          <button type="button" onClick={() => setSelected(new Set())} className="ml-auto font-mono text-[11px] text-[var(--muted-foreground)] hover:underline">
            Clear
          </button>
        </div>
      )}

      {/* ── Job table ── */}
      <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] overflow-hidden">

        {/* Table header — desktop only */}
        <div
          className="hidden md:grid items-center gap-4 border-b border-[var(--line-soft)] bg-[var(--background)]"
          style={{
            gridTemplateColumns: "20px 36px 1fr 110px 110px 110px 1fr",
            padding: "10px 18px",
          }}
        >
          <div>
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll}
              className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]" title="Select all on page" />
          </div>
          <div />
          <button
            onClick={() => setSort("company")}
            className="flex items-center uppercase text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            Job <SortIcon col="company" />
          </button>
          <button
            onClick={() => setSort("created_at")}
            className="flex items-center uppercase text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.12em" }}
          >
            Added <SortIcon col="created_at" />
          </button>
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

        {jobs.length === 0 ? (
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
              {q ? "No jobs match your search." : "Install the extension to save jobs from any job board, or browse community jobs to discover new ones."}
            </p>
            {!q && (
              <div className="flex justify-center gap-2">
                <Link
                  href="/connect-extension"
                  className="inline-flex items-center gap-1.5 rounded-[6px] bg-[var(--accent)] px-3 py-1.5 text-[13px] font-medium text-[#fffdf8] transition hover:bg-[var(--accent-hover)]"
                >
                  Install extension
                </Link>
                <Link
                  href="/dashboard/explore"
                  className="inline-flex items-center gap-1.5 rounded-[6px] border border-[var(--line-soft)] px-3 py-1.5 text-[13px] text-[var(--foreground)] transition hover:border-[var(--line)]"
                >
                  Browse community jobs
                </Link>
              </div>
            )}
          </div>
        ) : (
          jobs.map((job, i) => {
            const focused = focusedIndex === i;
            const isSelected = selected.has(job.id);
            const addedDate = job.created_at
              ? new Date(job.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })
              : "—";
            const evals = (job as unknown as { evaluations?: Array<{ score: number | null; created_at: string }> }).evaluations;
            const evalScore = evals?.length ? evals.sort((a, b) => b.created_at.localeCompare(a.created_at))[0].score : null;
            return (
              <div
                key={job.id}
                className="transition"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid var(--line-soft)",
                  background: isSelected ? "var(--surface-soft)" : focused ? "var(--surface-soft)" : "transparent",
                  outline: focused && !isSelected ? "2px solid var(--accent)" : "none",
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
                  style={{ gridTemplateColumns: "20px 36px 1fr 110px 110px 110px 1fr", padding: "14px 18px" }}
                >
                  <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(job.id)}
                    className="h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]" />
                  <CompanyLogo name={job.company} size={32} />
                  <div className="min-w-0">
                    <div style={{ fontWeight: 500, fontSize: 14 }} className="truncate">{job.title}</div>
                    <div className="text-[12.5px] text-[var(--muted-foreground)]">{job.company}{job.archetype ? ` · ${job.archetype}` : ""}</div>
                  </div>
                  <span style={{ fontFamily: "var(--font-mono-stack)", fontSize: 12, color: "var(--muted-foreground)" }}>{addedDate}</span>
                  <ScoreBadge score={evalScore} />
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

      {jobs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p
            className="text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10, letterSpacing: "0.08em" }}
          >
            j/k navigate · e evaluate · esc clear
          </p>
          <div className="flex items-center gap-3">
            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
              {((page - 1) * limit) + 1}–{Math.min(page * limit, totalCount)} of {totalCount}
            </span>
            <button
              onClick={() => pushParam({ page: page - 1 })}
              disabled={page <= 1}
              className="rounded-[6px] border border-[var(--line-soft)] px-3 py-1 font-mono text-[11px] text-[var(--foreground)] transition hover:border-[var(--line)] disabled:opacity-30"
            >
              ← Prev
            </button>
            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => pushParam({ page: page + 1 })}
              disabled={page >= totalPages}
              className="rounded-[6px] border border-[var(--line-soft)] px-3 py-1 font-mono text-[11px] text-[var(--foreground)] transition hover:border-[var(--line)] disabled:opacity-30"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
