"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/nextrole/ui";
import type { ResumeRow, JobRow, UserTier } from "@/lib/db/types";
import type { ResumeData } from "@/lib/resume/template";

export type ResumeWithJob = ResumeRow & {
  jobs: Pick<JobRow, "title" | "company"> | null;
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short", day: "numeric", year: "numeric",
  });
}

function formatRelative(d: string) {
  const ms = Date.now() - new Date(d).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return formatDate(d);
}

function CompanyLogo({ name, size = 28 }: { name: string; size?: number }) {
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
      className="inline-flex shrink-0 items-center justify-center font-mono font-medium"
      style={{
        width: size, height: size,
        borderRadius: Math.round(size * 0.18),
        background: c.bg, color: c.fg,
        fontSize: Math.round(size * 0.42),
        border: `1px solid ${c.fg}33`,
      }}
    >
      {(name || "?").charAt(0)}
    </div>
  );
}

function parseResumeData(content: string | null): ResumeData | null {
  if (!content) return null;
  try { return JSON.parse(content) as ResumeData; } catch { return null; }
}

// ── Resume preview pane ───────────────────────────────────────────────────────

function ResumePreview({ resume }: { resume: ResumeWithJob }) {
  const data = parseResumeData(resume.content);
  const company = resume.jobs?.company ?? "";
  const title = resume.jobs?.title ?? resume.title;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--surface)]" style={{ minHeight: 0 }}>
      {/* Preview header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3">
        {company && <CompanyLogo name={company} size={26} />}
        <div className="flex-1 min-w-0">
          <div className="truncate text-[13px] font-medium">{company ? `${company} — ${title}` : resume.title}</div>
          <div className="text-[11.5px] text-[var(--muted-foreground)]">
            Tailored {formatRelative(resume.created_at)}
            {resume.coverage !== null ? ` · ${resume.coverage}% coverage` : ""}
          </div>
        </div>
        <a
          href={`/api/resume/${resume.id}/html`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 rounded-lg border border-[var(--line-soft)] px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Download PDF
        </a>
        <Link
          href={`/dashboard/resumes/${resume.id}`}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--line-soft)] px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Edit
        </Link>
      </div>

      {/* PDF-style preview */}
      <div className="flex-1 overflow-auto bg-[var(--surface-soft)] p-6" style={{ minHeight: 0 }}>
        {data ? (
          <div
            className="mx-auto bg-white text-[#1a1814]"
            style={{ width: 612, padding: "44px 52px", fontSize: 11, lineHeight: 1.5, fontFamily: "Inter, sans-serif", boxShadow: "0 4px 16px rgba(42,38,32,0.07)" }}
          >
            {/* Header */}
            <div style={{ borderBottom: "2px solid #1a1814", paddingBottom: 12, marginBottom: 16 }}>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.01em" }}>{data.name}</div>
              {data.summary && (
                <div style={{ fontSize: 11, color: "#6b6358", marginTop: 3 }}>{data.summary.slice(0, 100)}…</div>
              )}
              <div style={{ fontSize: 10, color: "#6b6358", marginTop: 4, fontFamily: "DM Mono, monospace" }}>
                {[data.contact?.email, data.contact?.linkedin, data.contact?.github].filter(Boolean).join(" · ")}
              </div>
            </div>

            {/* Experience */}
            {data.experience && data.experience.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6, fontWeight: 600 }}>
                  Experience
                </div>
                {data.experience.slice(0, 3).map((e, i) => (
                  <div key={i} style={{ marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontWeight: 600 }}>{e.role} · {e.company}</span>
                      <span style={{ color: "#6b6358", fontFamily: "DM Mono, monospace", fontSize: 10 }}>{e.period}</span>
                    </div>
                    <ul style={{ margin: "3px 0 0 14px", padding: 0 }}>
                      {e.bullets.slice(0, 3).map((b, j) => (
                        <li key={j} style={{ marginBottom: 2 }}>{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}

            {/* Skills */}
            {data.skills && Object.keys(data.skills).length > 0 && (
              <div>
                <div style={{ fontFamily: "DM Mono, monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4, fontWeight: 600 }}>
                  Skills
                </div>
                <p>{Object.values(data.skills).flat().join(" · ")}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex h-48 items-center justify-center text-[13px] text-[var(--muted-foreground)]">
            No preview available
          </div>
        )}
      </div>
    </div>
  );
}

// ── Generate panel ────────────────────────────────────────────────────────────

type ResumeMode = "standard" | "premium";

const MODE_META = {
  standard: {
    label: "Standard",
    credits: 10,
    badge: null,
    description: "Fast, clean resume tailored to the job description.",
    detail: "Good model · 10 credits",
    tiers: ["free", "starter", "pro"] as UserTier[],
  },
  premium: {
    label: "Premium",
    credits: 25,
    badge: "★ Pro model",
    description: "Deep rewrite — every bullet optimised, ATS-tuned, cover angle crafted.",
    detail: "High-performance AI · 25 credits",
    tiers: ["starter", "pro"] as UserTier[],
  },
} as const;

function GeneratePanel({
  jobs,
  tier,
  onGenerated,
}: {
  jobs: Array<Pick<JobRow, "id" | "title" | "company" | "description">>;
  tier: UserTier;
  onGenerated: (resumeId: string) => void;
}) {
  const [selectedJobId, setSelectedJobId] = useState("");
  const [mode, setMode] = useState<ResumeMode>("standard");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const jobsWithDesc = jobs.filter((j) => !!j.description);
  const canUsePremium = MODE_META.premium.tiers.includes(tier);

  async function generate() {
    if (!selectedJobId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: selectedJobId, premium: mode === "premium" }),
      });
      const data = (await res.json()) as { resume_id?: string; coverage?: number; error?: string };
      if (!res.ok || data.error) {
        setError(
          data.error === "NO_CREDITS" ? "Not enough credits — top up in billing" :
          data.error === "PREMIUM_RESUME_CAP_REACHED" ? "Premium resume cap reached for your plan" :
          (data.error ?? "Generation failed"),
        );
      } else {
        onGenerated(data.resume_id!);
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-dashed border-[var(--line-soft)] bg-[var(--surface)] p-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-soft)] bg-[var(--surface-soft)]">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div>
          <h2 className="text-[16px] font-semibold">Generate a tailored resume</h2>
          <p className="text-[12.5px] text-[var(--muted-foreground)]">Pick a job and quality level — we&apos;ll tailor your CV to match.</p>
        </div>
      </div>

      {/* Mode selector */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        {(["standard", "premium"] as ResumeMode[]).map((m) => {
          const meta = MODE_META[m];
          const locked = !meta.tiers.includes(tier);
          const active = mode === m;
          return (
            <button
              key={m}
              type="button"
              disabled={locked}
              onClick={() => !locked && setMode(m)}
              className="relative flex flex-col rounded-xl border p-4 text-left transition"
              style={{
                borderColor: active ? "var(--accent)" : "var(--line-soft)",
                background: active ? "var(--accent-soft)" : locked ? "var(--surface-soft)" : "var(--surface)",
                opacity: locked ? 0.6 : 1,
                cursor: locked ? "not-allowed" : "pointer",
                boxShadow: active ? "0 0 0 1px var(--accent)" : "none",
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13.5px] font-semibold">{meta.label}</span>
                {meta.badge && (
                  <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-white">
                    {meta.badge}
                  </span>
                )}
                {locked && (
                  <span className="rounded-full border border-[var(--line-soft)] px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
                    Starter+
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[var(--muted-foreground)] leading-[1.5] mb-2">{meta.description}</p>
              <span className="font-mono text-[11px] text-[var(--accent)]">{meta.detail}</span>
              {active && (
                <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[var(--accent)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Free tier note */}
      {tier === "free" && (
        <div className="mb-4 flex items-center justify-between rounded-lg border border-[var(--line-soft)] bg-[var(--surface-soft)] px-3 py-2.5 text-[12px]">
          <span className="text-[var(--muted-foreground)]">Standard only on Free · upgrade for Premium AI</span>
          <Link href="/dashboard/billing" className="text-[var(--accent)] hover:underline font-medium">Upgrade →</Link>
        </div>
      )}

      {jobsWithDesc.length === 0 ? (
        <p className="text-center text-[13px] text-[var(--muted-foreground)]">
          Add a job with a description first —{" "}
          <Link href="/dashboard/pipeline" className="text-[var(--accent)] hover:underline">go to pipeline</Link>.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <select
            value={selectedJobId}
            onChange={(e) => setSelectedJobId(e.target.value)}
            className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--accent)]"
          >
            <option value="">— choose a job —</option>
            {jobsWithDesc.map((j) => (
              <option key={j.id} value={j.id}>{j.title} at {j.company}</option>
            ))}
          </select>

          {error && (
            <p className="rounded-lg border border-[var(--bad)] bg-[#faebeb] px-3 py-2 text-center font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--bad)]">
              {error}
            </p>
          )}

          {loading ? (
            <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--line-soft)] py-3 text-[13px] text-[var(--muted-foreground)]">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
              {mode === "premium" ? "Premium AI tailoring…" : "Tailoring resume…"}
            </div>
          ) : (
            <button
              onClick={generate}
              disabled={!selectedJobId}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
            >
              <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3c.3 3.5 3.5 6.5 7 7-3.5.3-6.7 3.5-7 7-.3-3.5-3.5-6.7-7-7 3.5-.3 6.7-3.5 7-7Z" />
              </svg>
              Generate {mode} resume · {MODE_META[mode].credits} cr
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── List page ─────────────────────────────────────────────────────────────────

export function ResumesPageContent({
  resumes,
  jobs,
  tier = "free",
}: {
  resumes: ResumeWithJob[];
  jobs: Array<Pick<JobRow, "id" | "title" | "company" | "description">>;
  tier?: UserTier;
}) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string | null>(resumes[0]?.id ?? null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selected = resumes.find((r) => r.id === selectedId) ?? null;

  function handleGenerated(resumeId: string) {
    setShowGenerate(false);
    setSelectedId(resumeId);
    router.refresh();
  }

  async function handleDelete(resumeId: string) {
    setDeletingId(resumeId);
    try {
      await fetch(`/api/resume/${resumeId}`, { method: "DELETE" });
      if (selectedId === resumeId) setSelectedId(null);
      setConfirmDeleteId(null);
      router.refresh();
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 120px)", minHeight: 520 }}>
      {/* Page header */}
      <div className="flex shrink-0 items-end justify-between pb-5">
        <div>
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Resume</div>
          <h1 className="text-[24px] font-normal tracking-[-0.02em]">
            Tailored resumes
            {resumes.length > 0 && <span className="ml-2 text-[var(--muted-foreground)] font-normal">· {resumes.length}</span>}
          </h1>
        </div>
        <button
          onClick={() => { setShowGenerate(true); setSelectedId(null); }}
          className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-4 py-2.5 text-[13px] font-medium text-white transition hover:opacity-90"
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3c.3 3.5 3.5 6.5 7 7-3.5.3-6.7 3.5-7 7-.3-3.5-3.5-6.7-7-7 3.5-.3 6.7-3.5 7-7Z" />
          </svg>
          Generate new
        </button>
      </div>

      {/* Split pane — sidebar on top on mobile, side-by-side on md+ */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 md:flex-row">
        {/* Sidebar list */}
        <div className="shrink-0 overflow-auto rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-2 md:w-[300px]" style={{ maxHeight: "calc(50vh)" }}>
          {resumes.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-[13px] text-[var(--muted-foreground)]">
              <p>No resumes yet</p>
              <button onClick={() => setShowGenerate(true)} className="text-[var(--accent)] hover:underline">Generate one</button>
            </div>
          ) : (
            resumes.map((r) => {
              const active = r.id === selectedId;
              const company = r.jobs?.company ?? "";
              const isConfirming = confirmDeleteId === r.id;
              const isDeleting = deletingId === r.id;
              return (
                <div
                  key={r.id}
                  className="mb-1 relative rounded-[6px] transition"
                  style={{
                    background: active ? "var(--accent-soft)" : "transparent",
                    border: `1px solid ${active ? "rgba(200,74,31,0.2)" : "transparent"}`,
                  }}
                >
                  <button
                    onClick={() => { setSelectedId(r.id); setShowGenerate(false); setConfirmDeleteId(null); }}
                    className="w-full p-3 text-left"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {company && <CompanyLogo name={company} size={20} />}
                      <span className="text-[13px] font-medium">{company || r.title}</span>
                    </div>
                    <div className="text-[12.5px] text-[var(--muted-foreground)]">
                      {r.jobs?.title ?? r.title}
                    </div>
                    <div className="mt-1.5 flex items-center justify-between text-[11px] text-[var(--muted-foreground)]">
                      <span>{formatRelative(r.created_at)}</span>
                      <span className="font-mono">PDF</span>
                    </div>
                  </button>

                  {/* Delete controls */}
                  {isConfirming ? (
                    <div className="flex items-center gap-1.5 px-3 pb-2.5">
                      <span className="flex-1 text-[11px] text-[var(--muted-foreground)]">Delete?</span>
                      <button
                        onClick={() => handleDelete(r.id)}
                        disabled={isDeleting}
                        className="rounded px-2 py-0.5 text-[11px] font-medium text-white transition disabled:opacity-50"
                        style={{ background: "var(--bad)" }}
                      >
                        {isDeleting ? "…" : "Yes, delete"}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(null); }}
                        className="rounded px-2 py-0.5 text-[11px] text-[var(--muted-foreground)] transition"
                        style={{ background: "var(--surface-soft)" }}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); setConfirmDeleteId(r.id); }}
                      className="absolute right-2 top-2.5 rounded p-1 transition"
                      style={{ color: "var(--muted-foreground)" }}
                      title="Delete resume"
                      onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--bad)"; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--muted-foreground)"; }}
                    >
                      <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                        <path d="M10 11v6M14 11v6" />
                        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Main preview */}
        <div className="min-w-0 min-h-[300px] flex-1">
          {showGenerate || !selected ? (
            <GeneratePanel jobs={jobs} tier={tier} onGenerated={handleGenerated} />
          ) : (
            <ResumePreview resume={selected} />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detail page ───────────────────────────────────────────────────────────────

export function ResumeDetailPageContent({
  resume,
  baseCv,
}: {
  resume: ResumeWithJob;
  baseCv?: string | null;
}) {
  const [diffMode, setDiffMode] = useState(false);
  const data = parseResumeData(resume.content);
  const company = resume.jobs?.company ?? "";

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-[12.5px] text-[var(--muted-foreground)]">
        <Link href="/dashboard/resumes" className="hover:text-[var(--foreground)]">Resumes</Link>
        <span>/</span>
        <span className="text-[var(--foreground)]">{company ? `${company} — ${resume.title}` : resume.title}</span>
      </div>

      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-start gap-3">
          {company && <CompanyLogo name={company} size={40} />}
          <div>
            <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{resume.title}</h1>
            <div className="mt-1 flex flex-wrap items-center gap-3">
              <span className={`rounded-md px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] ${resume.status === "final" ? "bg-[var(--ok)] text-white" : "border border-[var(--line-soft)] text-[var(--muted-foreground)]"}`}>
                {resume.status}
              </span>
              {resume.coverage !== null && (
                <span className="font-mono text-[12px] text-[var(--muted-foreground)]">{resume.coverage}% coverage</span>
              )}
              <span className="font-mono text-[12px] text-[var(--muted-foreground)]">{formatDate(resume.created_at)}</span>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {baseCv && (
            <button
              onClick={() => setDiffMode((v) => !v)}
              className="rounded-lg border border-[var(--line-soft)] px-3 py-1.5 text-[13px] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {diffMode ? "Resume view" : "Compare with CV"}
            </button>
          )}
          <a
            href={`/api/resume/${resume.id}/html`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[13px] font-medium text-white transition hover:opacity-90"
          >
            Download PDF
          </a>
        </div>
      </div>

      {diffMode && baseCv && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Base CV</p>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--foreground)]">{baseCv}</pre>
          </div>
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Tailored resume</p>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--foreground)]">{resume.content ?? "No content saved"}</pre>
          </div>
        </div>
      )}

      {!data && (
        <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
          <p className="text-[13px] text-[var(--muted-foreground)]">Resume content not available.</p>
        </div>
      )}

      {data && (
        <div className="space-y-4">
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
            <p className="text-[22px] font-bold">{data.name}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px] text-[var(--muted-foreground)]">
              {data.contact.email && <span>{data.contact.email}</span>}
              {data.contact.phone && <span>{data.contact.phone}</span>}
              {data.contact.location && <span>{data.contact.location}</span>}
              {data.contact.linkedin && <span>{data.contact.linkedin}</span>}
              {data.contact.github && <span>{data.contact.github}</span>}
            </div>
          </div>

          {data.summary && (
            <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
              <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Summary</p>
              <p className="text-[13.5px] leading-[1.65]">{data.summary}</p>
            </div>
          )}

          {data.competencies && data.competencies.length > 0 && (
            <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Core Competencies</p>
              <div className="flex flex-wrap gap-2">
                {data.competencies.map((c, i) => (
                  <Badge key={i} tone="accent">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          {data.experience && data.experience.length > 0 && (
            <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
              <p className="mb-4 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Experience</p>
              <div className="space-y-5">
                {data.experience.map((e, i) => (
                  <div key={i}>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <p className="font-semibold">
                        {e.role}{" "}
                        <span className="font-normal text-[var(--muted-foreground)]">· {e.company}</span>
                      </p>
                      <span className="font-mono text-[12px] text-[var(--muted-foreground)]">
                        {e.period}{e.location ? ` · ${e.location}` : ""}
                      </span>
                    </div>
                    <ul className="ml-4 mt-2 space-y-1 text-[13px]">
                      {e.bullets.map((b, j) => (
                        <li key={j} className="list-disc text-[var(--muted-foreground)]">{b}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.education && data.education.length > 0 && (
            <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Education</p>
              <div className="space-y-2">
                {data.education.map((e, i) => (
                  <div key={i} className="text-[13.5px]">
                    <span className="font-medium">{e.degree}</span>
                    <span className="text-[var(--muted-foreground)]">
                      {" · "}{e.institution}{e.year ? ` · ${e.year}` : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.skills && Object.keys(data.skills).length > 0 && (
            <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
              <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">Skills</p>
              <div className="space-y-2">
                {Object.entries(data.skills).map(([cat, items]) => (
                  <div key={cat} className="flex gap-3 text-[13px]">
                    <span className="w-28 shrink-0 font-medium text-[var(--muted-foreground)]">{cat}</span>
                    <span>{items.join(", ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
