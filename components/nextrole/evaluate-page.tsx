"use client";

import { useState } from "react";
import Link from "next/link";
import type { JobRow } from "@/lib/db/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type Decision = "apply" | "watch" | "skip";
type EvalMode = "api" | "manual";

export interface PastEval {
  id: string;
  score: number;
  decision: string;
  role_fit: Record<string, unknown> | null;
  cv_match: Record<string, unknown> | null;
  compensation_analysis: Record<string, unknown> | null;
  personalization_guidance: Record<string, unknown> | null;
  interview_signals: Record<string, unknown> | null;
  legitimacy_check: Record<string, unknown> | null;
  created_at: string;
  jobs: { id: string; title: string; company: string } | null;
}

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

// ─── Design primitives ────────────────────────────────────────────────────────

function CompanyLogo({ name, size = 32 }: { name: string; size?: number }) {
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

function ScoreRing({ score, size = 104 }: { score: number; size?: number }) {
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(1, score / 5);
  const color = score >= 4 ? "var(--ok)" : score >= 3 ? "var(--warn)" : "var(--bad)";
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line-soft)" strokeWidth={9} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={9}
        strokeDasharray={circ} strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text
        x="50%" y="50%" textAnchor="middle" dominantBaseline="middle"
        style={{ fontFamily: "DM Mono, monospace", fontSize: size * 0.26, fontWeight: 600, fill: color }}
      >
        {score.toFixed(1)}
      </text>
    </svg>
  );
}

function ExpandableSection({
  title, subtitle, badge, defaultOpen = false, children,
}: {
  title: string; subtitle?: string; badge?: string; defaultOpen?: boolean; children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--surface)]">
      <details open={defaultOpen}>
        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-4 hover:bg-[var(--surface-soft)]">
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="chevron shrink-0">
            <path d="M9 18l6-6-6-6" />
          </svg>
          <div className="flex-1">
            <div className="text-[14px] font-semibold leading-tight">{title}</div>
            {subtitle && <div className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">{subtitle}</div>}
          </div>
          {badge && <span className="font-mono text-[12px] text-[var(--ok)]">{badge}</span>}
        </summary>
        <div className="px-5 pb-5 pt-1">{children}</div>
      </details>
    </div>
  );
}

function Bullet({ kind, children }: { kind: "pos" | "neg" | "neutral"; children: React.ReactNode }) {
  const color = kind === "pos" ? "var(--ok)" : kind === "neg" ? "var(--bad)" : "var(--muted-foreground)";
  const symbol = kind === "pos" ? "+" : kind === "neg" ? "−" : "·";
  return (
    <div className="flex gap-2.5 text-[13.5px] leading-[1.6]">
      <span className="w-3 shrink-0 font-mono" style={{ color }}>{symbol}</span>
      <span className="text-[var(--foreground)]">{children}</span>
    </div>
  );
}

function DecisionBadge({ decision }: { decision: Decision }) {
  const styles: Record<Decision, string> = {
    apply: "bg-[var(--ok)] text-white",
    watch: "bg-amber-100 text-amber-700",
    skip:  "bg-red-100 text-red-600",
  };
  const label: Record<Decision, string> = { apply: "Apply", watch: "Watch", skip: "Skip" };
  return (
    <span className={`rounded-md px-2.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-[0.1em] ${styles[decision]}`}>
      {label[decision]}
    </span>
  );
}

// ─── Results panel ────────────────────────────────────────────────────────────

function ResultsPanel({
  score, decision, blocks, onRerun,
}: {
  score: number; decision: Decision; blocks: EvalBlocks; onRerun: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/* Score header card */}
      <div className="flex items-center gap-6 rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        <ScoreRing score={score} size={100} />
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-2">
            <DecisionBadge decision={decision} />
            <span className="font-mono text-[11px] text-[var(--muted-foreground)]">Decision</span>
          </div>
          <h2 className="mb-1.5 text-[17px] font-semibold leading-snug tracking-[-0.01em]">
            {blocks.decision.rationale}
          </h2>
        </div>
        <button
          onClick={onRerun}
          className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--line-soft)] px-3 py-1.5 text-[12.5px] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
          Re-run
        </button>
      </div>

      {/* Role fit */}
      <ExpandableSection title="Role fit" subtitle={`Score ${blocks.role_fit.score}/5`} defaultOpen>
        <div className="flex flex-col gap-2.5">
          <p className="mb-1 text-[13.5px] font-medium">{blocks.role_fit.summary}</p>
          <p className="text-[13px] text-[var(--muted-foreground)]">{blocks.role_fit.details}</p>
          {blocks.role_fit.signals?.map((s, i) => <Bullet key={i} kind="pos">{s}</Bullet>)}
        </div>
      </ExpandableSection>

      {/* CV match */}
      <ExpandableSection
        title="CV match"
        subtitle={`Coverage ${blocks.cv_match.coverage}`}
        badge={blocks.cv_match.coverage}
      >
        <div className="flex flex-col gap-3">
          <p className="text-[13px]">{blocks.cv_match.summary}</p>
          {blocks.cv_match.strengths?.length > 0 && (
            <div>
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Strengths</div>
              <div className="flex flex-col gap-1.5">
                {blocks.cv_match.strengths.map((s, i) => <Bullet key={i} kind="pos">{s}</Bullet>)}
              </div>
            </div>
          )}
          {blocks.cv_match.gaps?.length > 0 && (
            <div>
              <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Gaps to address</div>
              <div className="flex flex-col gap-1.5">
                {blocks.cv_match.gaps.map((g, i) => <Bullet key={i} kind="neg">{g}</Bullet>)}
              </div>
            </div>
          )}
        </div>
      </ExpandableSection>

      {/* Compensation */}
      <ExpandableSection title="Compensation" subtitle={blocks.compensation_analysis.summary}>
        <div className="flex flex-col gap-2">
          <p className="text-[13.5px] text-[var(--muted-foreground)]">{blocks.compensation_analysis.details}</p>
          <span className="inline-flex items-center rounded-md border border-[var(--line-soft)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--muted-foreground)]">
            {blocks.compensation_analysis.market_position ?? "unknown"} market
          </span>
        </div>
      </ExpandableSection>

      {/* Interview signals */}
      <ExpandableSection
        title="Interview signals"
        subtitle={`${blocks.interview_signals.likely_topics?.length ?? 0} topics · ${blocks.interview_signals.red_flags?.length ?? 0} red flags`}
      >
        <div className="flex flex-col gap-4">
          {blocks.interview_signals.preparation_notes && (
            <p className="text-[13px] text-[var(--muted-foreground)]">{blocks.interview_signals.preparation_notes}</p>
          )}
          {blocks.interview_signals.likely_topics?.length > 0 && (
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Likely questions</div>
              <div className="flex flex-col gap-1.5">
                {blocks.interview_signals.likely_topics.map((t, i) => (
                  <div key={i} className="rounded-[5px] bg-[var(--surface-soft)] px-3 py-2 text-[13px]">{t}</div>
                ))}
              </div>
            </div>
          )}
          {blocks.interview_signals.red_flags?.length > 0 && (
            <div>
              <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-red-500">Red flags</div>
              <div className="flex flex-col gap-1.5">
                {blocks.interview_signals.red_flags.map((f, i) => <Bullet key={i} kind="neg">{f}</Bullet>)}
              </div>
            </div>
          )}
        </div>
      </ExpandableSection>

      {/* Legitimacy + Level strategy collapsed */}
      <ExpandableSection
        title="Legitimacy check"
        subtitle={`Verdict: ${blocks.legitimacy_check.verdict}`}
      >
        <p className="text-[13px] text-[var(--muted-foreground)]">{blocks.legitimacy_check.notes}</p>
      </ExpandableSection>

      {blocks.level_strategy && (
        <ExpandableSection
          title="Level strategy"
          subtitle={blocks.level_strategy.summary}
        >
          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-md border border-[var(--line-soft)] px-2.5 py-0.5 font-mono text-[11px]">
                {blocks.level_strategy.seniority_fit?.replace(/_/g, " ")}
              </span>
              <span className="rounded-md border border-[var(--line-soft)] px-2.5 py-0.5 font-mono text-[11px]">
                {blocks.level_strategy.progression_value} progression value
              </span>
            </div>
            <p className="text-[13px] text-[var(--muted-foreground)]">{blocks.level_strategy.notes}</p>
          </div>
        </ExpandableSection>
      )}

      {/* Personalization */}
      <ExpandableSection title="Personalization" subtitle={blocks.personalization_guidance.angle}>
        <div className="flex flex-col gap-2">
          <p className="text-[13px] text-[var(--muted-foreground)]">{blocks.personalization_guidance.summary}</p>
          {blocks.personalization_guidance.tactics?.map((t, i) => <Bullet key={i} kind="neutral">{t}</Bullet>)}
        </div>
      </ExpandableSection>
    </div>
  );
}

// ─── Manual mode panel ────────────────────────────────────────────────────────

function ManualPanel({
  jobId, promptText, onResult,
}: {
  jobId: string; promptText: string | null; onResult: (r: EvalResponse) => void;
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
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <div className="mb-3 text-[14px] font-semibold">Step 1 — Copy the prompt</div>
        <p className="mb-3 text-[12.5px] text-[var(--muted-foreground)]">Paste into any AI assistant that responds in JSON.</p>
        {promptText ? (
          <>
            <textarea
              readOnly value={promptText} rows={7}
              className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-3 font-mono text-[11px] leading-[1.6] text-[var(--muted-foreground)] outline-none"
            />
            <button
              onClick={copyPrompt}
              className="mt-3 rounded-lg border border-[var(--line-soft)] px-4 py-2 text-[13px] font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {copied ? "Copied!" : "Copy prompt"}
            </button>
          </>
        ) : (
          <p className="text-[13px] text-[var(--muted-foreground)]">No description — paste the JD first.</p>
        )}
      </div>

      <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <div className="mb-3 text-[14px] font-semibold">Step 2 — Paste the response</div>
        <textarea
          value={pasted} onChange={(e) => setPasted(e.target.value)} rows={9}
          placeholder='{ "blocks": { "role_fit": { ... } }, "score": 4.2, "decision": "apply" }'
          className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-4 py-3 font-mono text-[11px] leading-[1.6] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]"
        />
        {error && (
          <p className="mt-2 rounded-lg border border-[var(--bad)] bg-[#faebeb] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--bad)]">
            {error}
          </p>
        )}
        <button
          onClick={importResult}
          disabled={importing || !pasted.trim()}
          className="mt-3 rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          {importing ? "Importing…" : "Import result"}
        </button>
      </div>
    </div>
  );
}

// ─── Past evaluations history ─────────────────────────────────────────────────

function ScorePill({ score }: { score: number }) {
  const color = score >= 4 ? "var(--ok)" : score >= 3 ? "#b07313" : "var(--bad)";
  const bg    = score >= 4 ? "rgba(47,122,58,0.08)" : score >= 3 ? "rgba(176,115,19,0.08)" : "rgba(200,74,31,0.08)";
  return (
    <span
      className="inline-flex items-center justify-center rounded-[6px] font-mono text-[12px] font-semibold tabular-nums"
      style={{ minWidth: 36, padding: "2px 7px", color, background: bg, border: `1px solid ${color}33` }}
    >
      {score.toFixed(1)}
    </span>
  );
}

function PastEvalRow({ ev, isOpen, onToggle }: { ev: PastEval; isOpen: boolean; onToggle: () => void }) {
  const dec = ev.decision as Decision;
  const decStyle: Record<Decision, string> = {
    apply: "bg-[var(--ok)] text-white",
    watch: "bg-amber-100 text-amber-700",
    skip:  "bg-red-100 text-red-600",
  };
  const company = ev.jobs?.company ?? "Unknown";
  const title   = ev.jobs?.title   ?? "Untitled";
  const jobId   = ev.jobs?.id      ?? null;

  const d = new Date(ev.created_at);
  const now = Date.now();
  const diff = now - d.getTime();
  const days = Math.floor(diff / 86_400_000);
  const when = days === 0 ? "Today"
    : days === 1 ? "Yesterday"
    : days < 7   ? `${days}d ago`
    : d.toLocaleDateString("en", { month: "short", day: "numeric", year: days > 365 ? "numeric" : undefined });

  const roleFit = ev.role_fit as { summary?: string; details?: string; signals?: string[] } | null;
  const cvMatch = ev.cv_match as { summary?: string; coverage?: string; strengths?: string[]; gaps?: string[] } | null;
  const compA   = ev.compensation_analysis as { summary?: string; details?: string; market_position?: string } | null;
  const interv  = ev.interview_signals as { likely_topics?: string[]; red_flags?: string[]; preparation_notes?: string } | null;
  const legit   = ev.legitimacy_check as { verdict?: string; notes?: string } | null;
  const person  = ev.personalization_guidance as { angle?: string; summary?: string; tactics?: string[] } | null;

  return (
    <div className="border-t border-[var(--line-soft)] first:border-t-0">
      {/* Row header — clickable */}
      <button
        onClick={onToggle}
        className="flex w-full items-center gap-4 px-5 py-3.5 text-left transition hover:bg-[var(--surface-soft)]"
      >
        <CompanyLogo name={company} size={30} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[13.5px] font-medium truncate">{title}</span>
            <span className="text-[12px] text-[var(--muted-foreground)] shrink-0">· {company}</span>
          </div>
        </div>
        <ScorePill score={ev.score} />
        <span className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] ${decStyle[dec] ?? ""}`}>
          {dec}
        </span>
        <span className="shrink-0 font-mono text-[11px] text-[var(--muted-foreground)] w-20 text-right">{when}</span>
        <svg
          width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)"
          strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
          className="shrink-0 transition-transform"
          style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Expanded detail */}
      {isOpen && (
        <div className="px-5 pb-5 pt-1 space-y-3 bg-[var(--surface-soft)]">
          {/* Quick links */}
          <div className="flex gap-2 pt-1 pb-2">
            {jobId && (
              <Link
                href={`/dashboard/evaluate?job_id=${jobId}`}
                className="rounded-lg border border-[var(--line-soft)] px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Re-evaluate →
              </Link>
            )}
            {jobId && (
              <Link
                href={`/dashboard/resumes?job=${jobId}`}
                className="rounded-lg border border-[var(--line-soft)] px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
              >
                Tailor resume →
              </Link>
            )}
          </div>

          {roleFit && (
            <ExpandableSection title="Role fit" subtitle={roleFit.summary} defaultOpen>
              <div className="flex flex-col gap-2">
                {roleFit.details && <p className="text-[13px] text-[var(--muted-foreground)]">{roleFit.details}</p>}
                {roleFit.signals?.map((s, i) => <Bullet key={i} kind="pos">{s}</Bullet>)}
              </div>
            </ExpandableSection>
          )}

          {cvMatch && (
            <ExpandableSection title="CV match" subtitle={cvMatch.summary}>
              <div className="flex flex-col gap-3">
                {cvMatch.coverage && (
                  <span className="font-mono text-[11px] text-[var(--muted-foreground)]">Coverage: {cvMatch.coverage}</span>
                )}
                {(cvMatch.strengths?.length ?? 0) > 0 && (
                  <div>
                    <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Strengths</div>
                    {cvMatch.strengths!.map((s, i) => <Bullet key={i} kind="pos">{s}</Bullet>)}
                  </div>
                )}
                {(cvMatch.gaps?.length ?? 0) > 0 && (
                  <div>
                    <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Gaps</div>
                    {cvMatch.gaps!.map((g, i) => <Bullet key={i} kind="neg">{g}</Bullet>)}
                  </div>
                )}
              </div>
            </ExpandableSection>
          )}

          {compA && (
            <ExpandableSection title="Compensation" subtitle={compA.summary}>
              <div className="flex flex-col gap-2">
                {compA.details && <p className="text-[13px] text-[var(--muted-foreground)]">{compA.details}</p>}
                {compA.market_position && (
                  <span className="inline-flex items-center rounded-md border border-[var(--line-soft)] px-2.5 py-0.5 font-mono text-[11px] text-[var(--muted-foreground)]">
                    {compA.market_position} market
                  </span>
                )}
              </div>
            </ExpandableSection>
          )}

          {interv && (
            <ExpandableSection title="Interview signals" subtitle={`${interv.likely_topics?.length ?? 0} topics`}>
              <div className="flex flex-col gap-3">
                {interv.preparation_notes && <p className="text-[13px] text-[var(--muted-foreground)]">{interv.preparation_notes}</p>}
                {(interv.likely_topics?.length ?? 0) > 0 && (
                  <div>
                    <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Likely questions</div>
                    <div className="flex flex-col gap-1.5">
                      {interv.likely_topics!.map((t, i) => (
                        <div key={i} className="rounded-[5px] bg-[var(--surface)] px-3 py-2 text-[13px]">{t}</div>
                      ))}
                    </div>
                  </div>
                )}
                {(interv.red_flags?.length ?? 0) > 0 && (
                  <div>
                    <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-red-500">Red flags</div>
                    {interv.red_flags!.map((f, i) => <Bullet key={i} kind="neg">{f}</Bullet>)}
                  </div>
                )}
              </div>
            </ExpandableSection>
          )}

          {legit && (
            <ExpandableSection title="Legitimacy check" subtitle={`Verdict: ${legit.verdict}`}>
              {legit.notes && <p className="text-[13px] text-[var(--muted-foreground)]">{legit.notes}</p>}
            </ExpandableSection>
          )}

          {person && (
            <ExpandableSection title="Personalization" subtitle={person.angle}>
              <div className="flex flex-col gap-2">
                {person.summary && <p className="text-[13px] text-[var(--muted-foreground)]">{person.summary}</p>}
                {person.tactics?.map((t, i) => <Bullet key={i} kind="neutral">{t}</Bullet>)}
              </div>
            </ExpandableSection>
          )}
        </div>
      )}
    </div>
  );
}

function PastEvaluationsSection({ evals }: { evals: PastEval[] }) {
  const [openId, setOpenId] = useState<string | null>(null);

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center gap-3">
        <h2 className="text-[15px] font-semibold">Past evaluations</h2>
        {evals.length > 0 && (
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
            {evals.length} saved
          </span>
        )}
        <div className="flex-1 h-px bg-[var(--line-soft)]" />
      </div>

      {evals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-[var(--line-soft)] px-6 py-10 text-center">
          <p className="text-[14px] font-medium text-[var(--muted-foreground)]">No evaluations yet</p>
          <p className="text-[13px] text-[var(--muted-foreground)]">Run your first AI evaluation to see results here.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] overflow-hidden">
          {/* Table header */}
          <div
            className="flex items-center gap-4 px-5 py-2.5 border-b border-[var(--line-soft)] bg-[var(--background)]"
            style={{ display: "grid", gridTemplateColumns: "30px 1fr 48px 64px 80px 14px", gap: 16 }}
          >
            <div />
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Role</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Score</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">Decision</span>
            <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-[var(--muted-foreground)] text-right">When</span>
            <div />
          </div>
          {evals.map((ev) => (
            <PastEvalRow
              key={ev.id}
              ev={ev}
              isOpen={openId === ev.id}
              onToggle={() => toggle(ev.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Job picker panel (shown when no job_id in URL) ──────────────────────────

function JobPickerPanel({
  jobs,
  hasCV,
  hasProvider,
  onEvaluate,
}: {
  jobs: JobRow[];
  hasCV: boolean;
  hasProvider: boolean;
  onEvaluate: (job: JobRow) => void;
}) {
  const [selectedId, setSelectedId] = useState(jobs[0]?.id ?? "");
  const selected = jobs.find((j) => j.id === selectedId) ?? null;
  const canRun = !!selected && hasCV && hasProvider && !!selected.description;

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-[var(--line-soft)] px-8 py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--surface-soft)]">
          <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" />
            <path d="M16 7V5a2 2 0 0 0-4 0v2M12 12v4M10 14h4" />
          </svg>
        </div>
        <p className="text-[16px] font-semibold">No pending jobs</p>
        <p className="max-w-xs text-[13px] text-[var(--muted-foreground)]">
          Add jobs to your pipeline first — they&apos;ll appear here ready to evaluate.
        </p>
        <Link
          href="/dashboard/pipeline"
          className="rounded-xl bg-[var(--accent)] px-5 py-2.5 text-[13px] font-medium text-white transition hover:opacity-90"
        >
          Go to pipeline →
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: "40fr 60fr" }}>
      {/* Left: picker */}
      <div className="self-start rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--accent-soft)]">
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c.3 3.5 3.5 6.5 7 7-3.5.3-6.7 3.5-7 7-.3-3.5-3.5-6.7-7-7 3.5-.3 6.7-3.5 7-7Z" />
            </svg>
          </div>
          <div>
            <div className="text-[14px] font-semibold">Evaluate a job</div>
            <div className="text-[12px] text-[var(--muted-foreground)]">{jobs.length} pending</div>
          </div>
        </div>

        {/* Job list */}
        <div className="mb-4 flex flex-col gap-1 max-h-[340px] overflow-auto">
          {jobs.map((j) => {
            const active = j.id === selectedId;
            return (
              <button
                key={j.id}
                onClick={() => setSelectedId(j.id)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition"
                style={{
                  background: active ? "var(--accent-soft)" : "transparent",
                  border: `1px solid ${active ? "rgba(200,74,31,0.2)" : "transparent"}`,
                }}
              >
                <CompanyLogo name={j.company} size={28} />
                <div className="flex-1 min-w-0">
                  <div className="truncate text-[13px] font-medium">{j.title}</div>
                  <div className="text-[11.5px] text-[var(--muted-foreground)]">{j.company}</div>
                </div>
                {!j.description && (
                  <span className="shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-[0.1em] text-amber-600 bg-amber-50 border border-amber-200">
                    No JD
                  </span>
                )}
                {active && <div className="h-1.5 w-1.5 rounded-full shrink-0 bg-[var(--accent)]" />}
              </button>
            );
          })}
        </div>

        {/* Warnings */}
        {selected && (!hasCV || !selected.description) && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[12px] text-amber-700">
            {!hasCV && <p>· Add your CV in Settings before evaluating</p>}
            {!selected.description && <p>· This job has no description — paste the JD in the pipeline first</p>}
          </div>
        )}

        <div className="mb-4 rounded-lg border border-[var(--line-soft)] bg-[var(--surface-soft)] px-3 py-2.5 flex justify-between text-[12px]">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Uses</span>
          <span className="font-mono text-[12px]">5 credits · NextRole AI</span>
        </div>

        <button
          onClick={() => selected && onEvaluate(selected)}
          disabled={!canRun}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-[13.5px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
        >
          <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3c.3 3.5 3.5 6.5 7 7-3.5.3-6.7 3.5-7 7-.3-3.5-3.5-6.7-7-7 3.5-.3 6.7-3.5 7-7Z" />
          </svg>
          Evaluate with AI
        </button>
      </div>

      {/* Right: job preview */}
      <div className="self-start rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
        {selected ? (
          <>
            <div className="mb-4 flex items-start gap-3">
              <CompanyLogo name={selected.company} size={40} />
              <div>
                <div className="text-[17px] font-semibold leading-snug">{selected.title}</div>
                <div className="text-[13px] text-[var(--muted-foreground)]">{selected.company}</div>
              </div>
            </div>
            {selected.description ? (
              <div className="rounded-lg border border-[var(--line-soft)] bg-[var(--surface-soft)] p-4">
                <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Job description preview</div>
                <p className="text-[12.5px] leading-[1.65] text-[var(--muted-foreground)] line-clamp-6">
                  {selected.description.slice(0, 600)}{selected.description.length > 600 ? "…" : ""}
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-amber-200 bg-amber-50 p-6 text-center">
                <p className="text-[13px] font-medium text-amber-700">No job description</p>
                <p className="text-[12px] text-amber-600">Paste the JD in the pipeline to enable AI evaluation.</p>
                <Link href="/dashboard/pipeline" className="mt-1 text-[12px] text-[var(--accent)] hover:underline">
                  Open pipeline →
                </Link>
              </div>
            )}
          </>
        ) : (
          <div className="flex h-40 items-center justify-center text-[13px] text-[var(--muted-foreground)]">
            Select a job to preview
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function EvaluatePageContent({
  job,
  hasCV,
  hasProvider,
  promptText,
  pastEvals = [],
  unevaluatedJobs = [],
}: {
  job: JobRow | null;
  hasCV: boolean;
  hasProvider: boolean;
  promptText: string | null;
  pastEvals?: PastEval[];
  unevaluatedJobs?: JobRow[];
}) {
  const [activeJob, setActiveJob] = useState<JobRow | null>(job);
  const [mode, setMode] = useState<EvalMode>(hasProvider ? "api" : "manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EvalResponse | null>(null);

  const canRunApi = activeJob && hasCV && hasProvider && !!activeJob.description;

  async function runApiEval(targetJob?: JobRow) {
    const j = targetJob ?? activeJob;
    if (!j) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ job_id: j.id }),
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

  function handlePickerEvaluate(j: JobRow) {
    setActiveJob(j);
    runApiEval(j);
  }

  function reset() {
    setResult(null);
    setError(null);
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-[12.5px] text-[var(--muted-foreground)]">
        <Link href="/dashboard/pipeline" className="hover:text-[var(--foreground)]">Pipeline</Link>
        <span className="text-[var(--muted-foreground)]">/</span>
        <span className="text-[var(--foreground)]">
          {activeJob ? `${activeJob.title} · ${activeJob.company}` : "Evaluate"}
        </span>
        {activeJob && !job && (
          <button
            onClick={() => { setActiveJob(null); setResult(null); setError(null); }}
            className="ml-2 text-[12px] text-[var(--accent)] hover:underline"
          >
            ← Pick another
          </button>
        )}
      </div>

      {/* No job selected — show picker */}
      {!activeJob && (
        <JobPickerPanel
          jobs={unevaluatedJobs}
          hasCV={hasCV}
          hasProvider={hasProvider}
          onEvaluate={handlePickerEvaluate}
        />
      )}

      {/* Two-column layout when job active */}
      {activeJob && (
        <div className="grid gap-4" style={{ gridTemplateColumns: "40fr 60fr" }}>
          {/* Left panel — job info */}
          <div className="self-start rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
            <div className="mb-5 flex items-start gap-3">
              <CompanyLogo name={activeJob.company} size={44} />
              <div className="flex-1">
                <h1 className="text-[18px] font-semibold leading-snug tracking-[-0.01em]">{activeJob.title}</h1>
                <div className="mt-1 text-[13.5px] text-[var(--muted-foreground)]">
                  {activeJob.company}
                  {(activeJob as { location?: string }).location ? ` · ${(activeJob as { location?: string }).location}` : ""}
                </div>
              </div>
            </div>

            <div className="mb-5 border-t border-[var(--line-soft)]" />

            <div className="flex flex-col gap-3 text-[13px]">
              {activeJob.source && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Source</span>
                  <a href={activeJob.source} target="_blank" rel="noopener noreferrer" className="truncate text-right text-[var(--accent)] hover:underline">
                    {activeJob.source.replace(/^https?:\/\//, "").slice(0, 40)}…
                  </a>
                </div>
              )}
              <div className="flex items-baseline justify-between gap-3">
                <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Saved</span>
                <span className="text-[var(--foreground)]">
                  {new Date(activeJob.created_at).toLocaleDateString("en", { month: "short", day: "numeric", year: "numeric" })}
                </span>
              </div>
              {(activeJob as { compensation?: string }).compensation && (
                <div className="flex items-baseline justify-between gap-3">
                  <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Comp</span>
                  <span className="text-[var(--foreground)]">{(activeJob as { compensation?: string }).compensation}</span>
                </div>
              )}
              <div className="mt-1">
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Status</div>
                <select
                  className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-[13px] outline-none focus:border-[var(--accent)]"
                  defaultValue={activeJob.status}
                >
                  <option value="saved">Saved</option>
                  <option value="applied">Applied</option>
                  <option value="interview">Interview</option>
                  <option value="offer">Offer</option>
                  <option value="skip">Skip</option>
                </select>
              </div>
              <div>
                <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Notes</div>
                <textarea
                  className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-[13px] leading-[1.55] outline-none focus:border-[var(--accent)]"
                  rows={3}
                  defaultValue={activeJob.notes ?? ""}
                  placeholder="Add notes…"
                />
              </div>
            </div>

            <div className="my-5 border-t border-[var(--line-soft)]" />

            <div className="flex flex-col gap-2">
              <Link
                href={`/dashboard/resumes?job=${activeJob.id}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-[13px] font-medium text-white transition hover:opacity-90"
              >
                Tailor resume for this job
              </Link>
              <button className="flex items-center justify-center gap-2 rounded-xl border border-[var(--line-soft)] py-2.5 text-[13px] font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                Mark as applied
              </button>
            </div>
          </div>

          {/* Right panel */}
          <div className="flex flex-col gap-4">
            {/* Evaluated result */}
            {result && (
              <ResultsPanel
                score={result.score}
                decision={result.decision}
                blocks={result.blocks}
                onRerun={reset}
              />
            )}

            {/* Unevaluated CTA */}
            {!result && (
              <>
                {/* Mode toggle */}
                {hasProvider && (
                  <div className="flex gap-1 rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] p-1 w-fit">
                    {(["api", "manual"] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`rounded-md px-4 py-1.5 text-[12.5px] font-medium capitalize transition ${mode === m ? "bg-[var(--accent)] text-white" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                      >
                        {m === "api" ? "AI evaluation" : "Manual mode"}
                      </button>
                    ))}
                  </div>
                )}

                {mode === "manual" ? (
                  <ManualPanel
                    jobId={activeJob.id}
                    promptText={promptText}
                    onResult={(r) => setResult(r)}
                  />
                ) : (
                  <div className="flex flex-col items-center rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] px-8 py-10 text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-xl bg-[var(--accent-soft)]">
                      <svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 3c.3 3.5 3.5 6.5 7 7-3.5.3-6.7 3.5-7 7-.3-3.5-3.5-6.7-7-7 3.5-.3 6.7-3.5 7-7Z" />
                      </svg>
                    </div>
                    <h2 className="mb-2.5 text-[20px] font-semibold tracking-[-0.01em]">Evaluate this job with AI</h2>
                    <p className="mb-6 max-w-[380px] text-[13.5px] leading-[1.6] text-[var(--muted-foreground)]">
                      Score role fit, identify CV gaps, surface comp signals, and predict likely interview questions.
                    </p>

                    {/* Warnings */}
                    {(!hasCV || !activeJob.description) && (
                      <div className="mb-5 w-full max-w-[380px] rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-left text-[12.5px] text-amber-700">
                        {!hasCV && <p>· Add your CV in Settings before evaluating</p>}
                        {!activeJob.description && <p>· This job has no description — paste the JD first</p>}
                      </div>
                    )}

                    {/* Cost estimate */}
                    <div className="mb-6 w-full max-w-[360px] rounded-xl border border-[var(--line-soft)] bg-[var(--surface-soft)] px-4 py-3">
                      <div className="flex justify-between text-[12.5px]">
                        <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Uses</span>
                        <span className="font-mono text-[12px] text-[var(--foreground)]">5 credits · NextRole AI</span>
                      </div>
                    </div>

                    {error && (
                      <p className="mb-4 w-full max-w-[380px] rounded-lg border border-[var(--bad)] bg-[#faebeb] px-4 py-2.5 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--bad)]">
                        {error}
                      </p>
                    )}

                    {loading ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                        <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-[var(--muted-foreground)]">
                          Evaluating · usually 20–40 seconds
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => runApiEval()}
                        disabled={!canRunApi}
                        className="flex items-center gap-2 rounded-xl bg-[var(--accent)] px-6 py-3 text-[14px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
                      >
                        <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 3c.3 3.5 3.5 6.5 7 7-3.5.3-6.7 3.5-7 7-.3-3.5-3.5-6.7-7-7 3.5-.3 6.7-3.5 7-7Z" />
                        </svg>
                        Evaluate with AI
                      </button>
                    )}

                    <p className="mt-3.5 text-[12px] text-[var(--muted-foreground)]">Uses 5 credits · your data stays private</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Past evaluations — always visible */}
      <PastEvaluationsSection evals={pastEvals} />
    </div>
  );
}
