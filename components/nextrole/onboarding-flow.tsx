"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BrandWordmark } from "@/components/nextrole/brand";

// ── Types ────────────────────────────────────────────────────────────────────

type Step = 1 | 3 | 4 | 5 | 6 | 7;
type CvStage = "upload" | "uploading" | "parsing" | "review" | "paste";

interface CvExtracted {
  full_name?: string | null;
  phone?: string | null;
  linkedin_url?: string | null;
  skills?: string[];
  work_experience?: Array<{ start?: string | null; end?: string | null }>;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function trialDaysLeft(endsAt: string | null): number | null {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  return ms > 0 ? Math.ceil(ms / 86_400_000) : null;
}

function computeExperienceYears(items?: Array<{ start?: string | null; end?: string | null }>): number | null {
  if (!items || !items.length) return null;
  const years = items
    .flatMap(i => [i.start, i.end])
    .map(s => { const m = (s ?? "").match(/(\d{4})/); return m ? parseInt(m[1], 10) : null; })
    .filter((n): n is number => n !== null);
  if (!years.length) return null;
  const min = Math.min(...years);
  const max = Math.max(new Date().getFullYear(), ...years);
  const diff = max - min;
  return diff > 0 ? diff : null;
}

// ── Small icons ───────────────────────────────────────────────────────────────

function CheckCircle({ size = 16, bg = "var(--ok)" }: { size?: number; bg?: string }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: "50%", background: bg, flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width={size * 0.55} height={size * 0.55} viewBox="0 0 24 24" fill="none" stroke="var(--surface)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13 l4 4 L19 7" />
      </svg>
    </span>
  );
}

function CheckBullet() {
  return (
    <span style={{
      width: 16, height: 16, borderRadius: "50%", background: "var(--ok-bg)", flexShrink: 0,
      display: "inline-flex", alignItems: "center", justifyContent: "center",
    }}>
      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 13 l4 4 L19 7" />
      </svg>
    </span>
  );
}

// Generic chip input — used for skills and target roles
function ChipInput({ chips, onAdd, onRemove, placeholder }: {
  chips: string[];
  onAdd: (s: string) => void;
  onRemove: (s: string) => void;
  placeholder?: string;
}) {
  const [input, setInput] = useState("");

  function commit() {
    const val = input.trim();
    if (val && !chips.includes(val)) onAdd(val);
    setInput("");
  }

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", minHeight: 44,
      border: "1px solid var(--line-soft)", borderRadius: 10,
      padding: "8px 10px", background: "var(--background)",
    }}>
      {chips.map(s => (
        <span key={s} style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          background: "var(--surface-soft)", border: "1px solid var(--line-soft)",
          borderRadius: 999, padding: "4px 6px 4px 11px",
          fontSize: 13, color: "var(--foreground)",
        }}>
          {s}
          <button type="button" onClick={() => onRemove(s)}
            style={{
              width: 16, height: 16, borderRadius: "50%", border: "none",
              background: "rgba(42,38,32,0.08)", color: "var(--muted-foreground)",
              fontSize: 11, lineHeight: 1, display: "inline-flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", padding: 0,
            }}>
            ×
          </button>
        </span>
      ))}
      <input
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={e => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); commit(); } }}
        placeholder={chips.length === 0 ? (placeholder ?? "Add an item…") : "Add more…"}
        style={{ flex: 1, minWidth: 120, height: 28, border: "none", outline: "none", background: "transparent", fontSize: 13, color: "var(--foreground)" }}
      />
    </div>
  );
}

// Score zone bar used in step 5
function ScoreBar({ applyThreshold, watchThreshold }: { applyThreshold: number; watchThreshold: number }) {
  const skipPct  = ((watchThreshold - 1) / 4) * 100;
  const watchPct = ((applyThreshold - watchThreshold) / 4) * 100;
  const applyPct = ((5 - applyThreshold) / 4) * 100;

  return (
    <div style={{ display: "flex", height: 32, borderRadius: 8, overflow: "hidden" }}>
      <div style={{ width: `${skipPct}%`, background: "var(--bad)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {skipPct > 15 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--surface)" }}>SKIP</span>}
      </div>
      <div style={{ width: `${watchPct}%`, background: "var(--warn)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        {watchPct > 15 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--surface)" }}>WATCH</span>}
      </div>
      <div style={{ width: `${applyPct}%`, background: "var(--ok)", display: "flex", alignItems: "center", justifyContent: "center", flex: 1 }}>
        {applyPct > 15 && <span style={{ fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: "0.12em", color: "var(--surface)" }}>APPLY</span>}
      </div>
    </div>
  );
}

// ── Module-level layout primitives (stable references = no remount on re-render) ──

const dotGrid = {
  backgroundColor: "var(--background)",
  backgroundImage: "radial-gradient(rgba(0,0,0,0.025) 1px, transparent 1px)",
  backgroundSize: "6px 6px",
};

function PageShell({ children, daysLeft }: { children: ReactNode; daysLeft: number | null }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10" style={dotGrid}>
      {daysLeft !== null && (
        <span className="mb-5 rounded-full border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-1 font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
          {daysLeft}d trial active
        </span>
      )}
      {children}
    </div>
  );
}

function BrandRow({ displayStep }: { displayStep: number }) {
  return (
    <div className="flex items-center justify-between mb-3.5">
      <BrandWordmark size={24} />
      <span className="font-mono text-[11px] tracking-[0.04em] text-[var(--muted-foreground-2)]">Step {displayStep} of 6</span>
    </div>
  );
}

function ProgressBar({ displayStep }: { displayStep: number }) {
  return (
    <div className="h-[3px] w-full rounded-full overflow-hidden mb-8" style={{ background: "rgba(42,38,32,0.08)" }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${(displayStep / 6) * 100}%`, background: "var(--accent)" }} />
    </div>
  );
}

// Type B — centered single column with top bar + progress + heading
function TypeB({ width, title, subtitle, children, footer, daysLeft, displayStep }: {
  width: number; title: string; subtitle: string; children: ReactNode; footer: ReactNode;
  daysLeft: number | null; displayStep: number;
}) {
  return (
    <PageShell daysLeft={daysLeft}>
      <div style={{ width, maxWidth: "100%" }}>
        <BrandRow displayStep={displayStep} />
        <ProgressBar displayStep={displayStep} />
        <h1 className="nr-display text-center text-[36px] mb-2">{title}</h1>
        <p className="text-center text-sm mb-6" style={{ color: "var(--muted-foreground)" }}>{subtitle}</p>
        <div className="rounded-[20px] border p-6" style={{ borderColor: "var(--line-soft)", background: "var(--surface)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
          {children}
        </div>
        <div className="flex items-center justify-between mt-5.5">
          {footer}
        </div>
      </div>
    </PageShell>
  );
}

// Type A — 40/60 split panel card
function TypeA({ ghost, leftBody, rightLabel, children, cta, daysLeft }: {
  ghost: string; leftBody: ReactNode; rightLabel?: string; children: ReactNode; cta: ReactNode;
  daysLeft: number | null;
}) {
  return (
    <PageShell daysLeft={daysLeft}>
      <div
        className="w-full flex flex-col md:flex-row overflow-hidden rounded-[20px] border"
        style={{ maxWidth: 980, minHeight: 0, borderColor: "var(--line-soft)", background: "var(--surface)", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}
      >
        <div className="flex-none md:basis-[40%] relative overflow-hidden flex flex-col p-9 md:p-10" style={{ background: "#1a1814", color: "#fffdf8" }}>
          <span className="nr-display absolute pointer-events-none select-none" style={{ top: 4, left: 28, fontSize: 72, lineHeight: 1, color: "rgba(255,255,255,0.05)" }}>{ghost}</span>
          <div className="relative z-10">
            <BrandWordmark size={24} />
          </div>
          <div className="relative z-10 mt-auto pt-10">
            {leftBody}
          </div>
        </div>
        <div className="flex-1 flex flex-col p-9 md:p-11" style={dotGrid}>
          {rightLabel && (
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-5" style={{ color: "var(--muted-foreground)" }}>{rightLabel}</div>
          )}
          <div className="flex-1 flex flex-col justify-center">
            {children}
          </div>
          <div className="flex justify-end mt-4">
            {cta}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// Stable text input — at module scope so it never remounts on parent re-render
function TextInput({ value, onChange, placeholder, type = "text" }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string;
}) {
  return (
    <input
      type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full h-[38px] px-3 text-sm rounded-[6px] outline-none transition-colors"
      style={{ background: "var(--surface)", border: "1px solid rgba(42,38,32,0.18)", color: "var(--foreground)" }}
      onFocus={e => { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--accent-soft)"; }}
      onBlur={e => { e.currentTarget.style.borderColor = "rgba(42,38,32,0.18)"; e.currentTarget.style.boxShadow = "none"; }}
    />
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  trialEndsAt: string | null;
  email: string;
  currentTier?: string;
}

// ── Main component ────────────────────────────────────────────────────────────

export function OnboardingFlow({ trialEndsAt, email: _email, currentTier = "free" }: Props) {
  const router = useRouter();
  const hasPlan = currentTier !== "free";

  const [step, setStep]   = useState<Step>(hasPlan ? 3 : 1);
  const [busy, setBusy]   = useState(false);
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState<{ cv?: boolean; prefs?: boolean; thresholds?: boolean }>({});

  const daysLeft = trialDaysLeft(trialEndsAt);
  // step 1→1, step 3→2, step 4→3, step 5→4, step 6→5, step 7→6
  const displayStep = step === 1 ? 1 : step - 1;

  // Step 3 — CV upload
  const [cvStage, setCvStage]         = useState<CvStage>("upload");
  const [cvWords, setCvWords]         = useState<number | null>(null);
  const [cvError, setCvError]         = useState("");
  const [cvExtracted, setCvExtracted] = useState<CvExtracted | null>(null);
  const [cvPasteText, setCvPasteText] = useState("");
  const [dragOver, setDragOver]       = useState(false);
  const cvInputRef = useRef<HTMLInputElement>(null);
  const CV_ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  // Step 4 — Preferences
  const [roles,           setRoles]           = useState<string[]>([]);
  const [targetLocations, setTargetLocations] = useState("");
  const [workMode,        setWorkMode]        = useState<"remote" | "hybrid" | "onsite" | null>(null);
  const [salaryMin,       setSalaryMin]       = useState("");
  const [salaryMax,       setSalaryMax]       = useState("");

  // Step 5 — AI Thresholds
  const [applyScore, setApplyScore] = useState(3.5);
  const [watchScore, setWatchScore] = useState(2.5);

  // ── API helpers ────────────────────────────────────────────────────────────

  async function patchProfile(data: Record<string, unknown>) {
    const r = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!r.ok) {
      const d = await r.json() as { error?: string };
      throw new Error(d.error ?? "Could not save profile");
    }
  }

  async function completeOnboarding() {
    const refCode = typeof window !== "undefined" ? localStorage.getItem("nr_referral_code") : null;
    if (refCode) {
      await fetch("/api/referral/apply", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: refCode }),
      }).catch(() => {});
      localStorage.removeItem("nr_referral_code");
    }
    await fetch("/api/onboarding", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
  }

  // ── Step 3: CV upload / parse ─────────────────────────────────────────────

  async function parseCv() {
    setCvStage("parsing");
    try {
      const res = await fetch("/api/extension/cv-structure-import", { method: "POST" });
      const data = await res.json() as CvExtracted & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Could not parse CV");
      setCvExtracted(data);
      setCvStage("review");
    } catch (e) {
      setCvError(e instanceof Error ? e.message : "Could not parse CV");
      setCvStage("review");
    }
  }

  async function uploadCvFile(file: File) {
    setCvStage("uploading"); setCvError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/base-cv", { method: "POST", body: form });
      const j = await res.json().catch(() => ({})) as { words?: number; error?: string };
      if (!res.ok) throw new Error(j.error ?? `Upload failed (${res.status})`);
      setCvWords(j.words ?? null);
      await parseCv();
    } catch (e) {
      setCvError(e instanceof Error ? e.message : "Upload failed");
      setCvStage("upload");
    }
  }

  async function submitPastedCv() {
    const text = cvPasteText.trim();
    if (!text) return;
    setCvStage("uploading"); setCvError("");
    try {
      await patchProfile({ base_cv: text });
      setCvWords(text.split(/\s+/).filter(Boolean).length);
      await parseCv();
    } catch (e) {
      setCvError(e instanceof Error ? e.message : "Could not save CV");
      setCvStage("paste");
    }
  }

  function onCvDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void uploadCvFile(f);
  }

  function handleCvNext() {
    setSkipped(s => ({ ...s, cv: cvStage !== "review" }));
    setStep(4);
  }

  // ── Step 4: Preferences submit ────────────────────────────────────────────

  async function handlePrefsNext() {
    setBusy(true); setError("");
    try {
      const patch: Record<string, unknown> = {};
      const locs = targetLocations.split(",").map(s => s.trim()).filter(Boolean);
      if (roles.length) patch.target_roles = roles;
      if (locs.length)  patch.target_locations = locs;
      if (workMode !== null) patch.work_mode = workMode;
      const min = Number(salaryMin); const max = Number(salaryMax);
      if (salaryMin && !isNaN(min)) patch.comp_min = min;
      if (salaryMax && !isNaN(max)) patch.comp_max = max;
      if (Object.keys(patch).length > 0) await patchProfile(patch);
      setSkipped(s => ({ ...s, prefs: false }));
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  function handlePrefsSkip() {
    setSkipped(s => ({ ...s, prefs: true }));
    setStep(5);
  }

  // ── Step 5: Thresholds submit ─────────────────────────────────────────────

  async function handleThresholdsNext() {
    setBusy(true); setError("");
    try {
      await patchProfile({ eval_score_apply: applyScore, eval_score_watch: watchScore });
      setSkipped(s => ({ ...s, thresholds: false }));
      setStep(6);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally { setBusy(false); }
  }

  function handleThresholdsSkip() {
    setSkipped(s => ({ ...s, thresholds: true }));
    setStep(6);
  }

  // ── Step 7: Complete ──────────────────────────────────────────────────────

  async function handleComplete() {
    setBusy(true);
    await completeOnboarding();
    router.push("/dashboard");
  }

  async function handleCompleteAndGo(href: string) {
    setBusy(true);
    await completeOnboarding();
    router.push(href);
  }

  // ── Inner UI helpers (no interactive inputs — safe to define inside) ───────

  function PrimaryButton({ children, onClick, disabled }: { children: ReactNode; onClick?: () => void; disabled?: boolean }) {
    return (
      <button
        type="button" onClick={onClick} disabled={disabled}
        className="rounded-full px-7 h-[42px] text-sm font-medium transition disabled:opacity-50"
        style={{ background: "var(--accent)", color: "#fffdf8", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}
      >
        {children}
      </button>
    );
  }

  function TextButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
    return (
      <button type="button" onClick={onClick}
        className="font-mono text-[11px] uppercase tracking-[0.14em] transition hover:opacity-70"
        style={{ color: "var(--muted-foreground)", background: "none", border: "none" }}>
        {children}
      </button>
    );
  }

  function ErrorBanner() {
    if (!error) return null;
    return (
      <div className="mb-4 rounded-md px-3 py-2 text-xs" style={{ color: "var(--bad)", background: "var(--bad-bg)", border: "1px solid rgba(181,58,58,0.25)" }}>
        {error}
      </div>
    );
  }

  function FieldLabel({ children }: { children: ReactNode }) {
    return (
      <label className="block font-mono text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: "var(--muted-foreground)" }}>
        {children}
      </label>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 1 — Welcome (Type A)
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 1) {
    const cards = [
      { label: "SENIOR ENGINEER", fill: 4, rotate: -6, top: 26, left: 0 },
      { label: "PRODUCT DESIGNER", fill: 3, rotate: 5, top: 0, right: 0 },
      { label: "DATA SCIENTIST", fill: 2, rotate: 2, bottom: 0, left: 38 },
    ];
    return (
      <TypeA
        ghost="01"
        rightLabel="What you get"
        daysLeft={daysLeft}
        leftBody={
          <>
            <div className="relative h-[120px] mb-7 hidden sm:block">
              {cards.map(c => (
                <div key={c.label} style={{
                  position: "absolute", width: 140,
                  top: c.top, left: c.left, right: c.right, bottom: c.bottom,
                  transform: `rotate(${c.rotate}deg)`,
                  background: "#252019", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, padding: "11px 12px",
                }}>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 8, letterSpacing: "0.16em", color: "rgba(255,255,255,0.4)", marginBottom: 7 }}>{c.label}</div>
                  <div style={{ display: "flex", gap: 3 }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                      <div key={i} style={{ height: 6, flex: 1, borderRadius: 2, background: i < c.fill ? "var(--accent)" : "rgba(255,255,255,0.12)" }} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <h1 className="nr-display text-[34px] leading-[1.1] mb-3">Welcome to NextRole</h1>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>Your AI-powered job search co-pilot.</p>
          </>
        }
        cta={<PrimaryButton onClick={() => setStep(3)}>Get started</PrimaryButton>}
      >
        <div className="flex flex-col gap-5">
          {[
            { title: "AI Evaluation", desc: "Score every job 1–5 before you apply." },
            { title: "Resume Tailoring", desc: "Generate a resume tuned to each job description." },
            { title: "Application Autofill", desc: "Fill forms from your profile automatically." },
            { title: "Job Tracker", desc: "Track every application from evaluation to offer." },
          ].map(f => (
            <div key={f.title} className="flex gap-3">
              <div className="w-4 h-4 rounded-[4px] flex-shrink-0 mt-0.5" style={{ background: "var(--accent)" }} />
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>{f.title}</div>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </TypeA>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 3 — Upload your CV (Type B)
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 3) {
    const extractedRows: Array<{ label: string; value: string | null; found: boolean }> = cvExtracted ? [
      { label: "Full name", value: cvExtracted.full_name ?? null, found: !!cvExtracted.full_name },
      { label: "Experience", value: (() => { const y = computeExperienceYears(cvExtracted.work_experience); return y ? `${y} years` : null; })(), found: !!computeExperienceYears(cvExtracted.work_experience) },
      { label: "Phone", value: cvExtracted.phone ?? null, found: !!cvExtracted.phone },
      { label: "LinkedIn", value: cvExtracted.linkedin_url ?? null, found: !!cvExtracted.linkedin_url },
    ] : [];

    return (
      <TypeB
        width={640}
        title="Upload your CV"
        subtitle="We'll read it once and pre-fill your profile and preferences."
        daysLeft={daysLeft}
        displayStep={displayStep}
        footer={
          <>
            <TextButton onClick={() => { setSkipped(s => ({ ...s, cv: true })); setStep(4); }}>Skip for now</TextButton>
            <PrimaryButton onClick={handleCvNext} disabled={cvStage === "uploading" || cvStage === "parsing"}>
              {cvStage === "review" ? "Continue" : "Skip and continue"}
            </PrimaryButton>
          </>
        }
      >
        {cvError && (
          <div className="mb-4 rounded-md px-3 py-2 text-xs" style={{ color: "var(--bad)", background: "var(--bad-bg)", border: "1px solid rgba(181,58,58,0.25)" }}>{cvError}</div>
        )}

        {cvStage === "upload" && (
          <>
            <div
              onClick={() => cvInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onCvDrop}
              className="h-[200px] rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-colors"
              style={{ borderColor: dragOver ? "var(--accent)" : "rgba(42,38,32,0.18)", background: "var(--background)" }}
            >
              <input ref={cvInputRef} type="file" accept={CV_ACCEPT} className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) void uploadCvFile(f); e.target.value = ""; }} />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground-2)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 3 H7 a2 2 0 0 0 -2 2 v14 a2 2 0 0 0 2 2 h10 a2 2 0 0 0 2 -2 V8 Z" /><path d="M14 3 v5 h5" />
              </svg>
              <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>
                Drag your CV here, <span style={{ color: "var(--accent)", fontWeight: 500 }}>or click to browse</span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 mt-3.5">
              {["PDF", "DOCX"].map(t => (
                <span key={t} className="font-mono text-[9px] tracking-[0.1em] rounded-full px-2.5 py-0.5" style={{ background: "var(--surface-soft)", color: "var(--muted-foreground)" }}>{t}</span>
              ))}
              <span className="font-mono text-[9px] tracking-[0.1em] ml-auto" style={{ color: "var(--muted-foreground-2)" }}>MAX 5 MB</span>
            </div>
            <div className="text-center mt-4">
              <button type="button" onClick={() => setCvStage("paste")}
                className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted-foreground)", background: "none", border: "none" }}>
                Paste text instead
              </button>
            </div>
          </>
        )}

        {cvStage === "paste" && (
          <>
            <textarea
              value={cvPasteText}
              onChange={e => setCvPasteText(e.target.value)}
              rows={8}
              placeholder={"Paste your CV text here…"}
              className="w-full p-3 text-sm font-mono rounded-lg outline-none resize-y"
              style={{ background: "var(--background)", border: "1px solid var(--line-soft)", color: "var(--foreground)", minHeight: 160 }}
            />
            <div className="flex items-center justify-between mt-3">
              <button type="button" onClick={() => setCvStage("upload")}
                className="font-mono text-[10px] uppercase tracking-[0.14em]" style={{ color: "var(--muted-foreground)", background: "none", border: "none" }}>
                Back to upload
              </button>
              <button type="button" onClick={submitPastedCv} disabled={!cvPasteText.trim()}
                className="rounded-full px-4 h-[32px] text-xs font-medium disabled:opacity-50"
                style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", color: "var(--foreground)" }}>
                Extract
              </button>
            </div>
          </>
        )}

        {(cvStage === "uploading" || cvStage === "parsing") && (
          <div className="h-[200px] rounded-xl flex flex-col items-center justify-center gap-3.5" style={{ background: "var(--background)" }}>
            <div className="w-8 h-8 rounded-full animate-spin" style={{ border: "3px solid rgba(200,74,31,0.18)", borderTopColor: "var(--accent)" }} />
            <div className="text-center">
              <div className="text-sm" style={{ color: "var(--muted-foreground)" }}>{cvStage === "uploading" ? "Reading your CV…" : "Extracting profile details…"}</div>
              <div className="text-xs mt-0.5" style={{ color: "var(--muted-foreground-2)" }}>{cvWords ? `${cvWords.toLocaleString()} words extracted` : "Extracting skills"}</div>
            </div>
          </div>
        )}

        {cvStage === "review" && (
          <>
            <div className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4" style={{ color: "var(--muted-foreground)" }}>We found this in your CV</div>
            <div className="flex flex-col">
              {extractedRows.map(row => (
                <div key={row.label} className="grid items-center gap-3 py-2.5 border-b" style={{ gridTemplateColumns: "120px 1fr auto", borderColor: "rgba(42,38,32,0.06)" }}>
                  <span className="font-mono text-[10px] tracking-[0.12em] uppercase" style={{ color: "var(--muted-foreground)" }}>{row.label}</span>
                  <span className="text-[13px]" style={{ color: row.found ? "var(--foreground)" : "var(--muted-foreground-2)" }}>{row.value ?? "—"}</span>
                  <span className="font-mono text-[9px] tracking-[0.1em] uppercase rounded-full px-2.5 py-1"
                    style={row.found ? { background: "var(--ok-bg)", color: "var(--ok)" } : { color: "var(--muted-foreground-2)" }}>
                    {row.found ? "Found" : "Not found"}
                  </span>
                </div>
              ))}
              <div className="grid items-start gap-3 py-2.5" style={{ gridTemplateColumns: "120px 1fr" }}>
                <span className="font-mono text-[10px] tracking-[0.12em] uppercase mt-1" style={{ color: "var(--muted-foreground)" }}>Skills</span>
                <div className="flex flex-wrap gap-1.5">
                  {(cvExtracted?.skills ?? []).length === 0 ? (
                    <span className="text-[13px]" style={{ color: "var(--muted-foreground-2)" }}>—</span>
                  ) : (
                    <>
                      {(cvExtracted!.skills ?? []).slice(0, 6).map(s => (
                        <span key={s} className="rounded-full px-2.5 py-1 text-xs" style={{ background: "var(--surface-soft)", border: "1px solid var(--line-soft)" }}>{s}</span>
                      ))}
                      {(cvExtracted!.skills?.length ?? 0) > 6 && (
                        <span className="rounded-full px-2.5 py-1 text-xs" style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", color: "var(--muted-foreground)" }}>
                          +{(cvExtracted!.skills!.length - 6)} more
                        </span>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="mt-4">
              <button type="button" onClick={() => { setCvStage("upload"); setCvExtracted(null); setCvWords(null); }}
                className="rounded-full px-4 h-[32px] text-xs" style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", color: "var(--foreground)" }}>
                Re-upload
              </button>
            </div>
          </>
        )}
      </TypeB>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 4 — Job preferences (Type B)
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 4) {
    return (
      <TypeB
        width={640}
        title="Job preferences"
        subtitle="Tell us what you're looking for so the AI scores the right jobs."
        daysLeft={daysLeft}
        displayStep={displayStep}
        footer={
          <>
            <TextButton onClick={handlePrefsSkip}>Skip for now</TextButton>
            <PrimaryButton onClick={handlePrefsNext} disabled={busy}>{busy ? "Saving…" : "Continue"}</PrimaryButton>
          </>
        }
      >
        <ErrorBanner />
        <div className="flex flex-col gap-5.5">
          <div>
            <FieldLabel>Target roles</FieldLabel>
            <ChipInput chips={roles} onAdd={r => setRoles(prev => [...prev, r])} onRemove={r => setRoles(prev => prev.filter(x => x !== r))} placeholder="Add a role…" />
          </div>
          <div>
            <FieldLabel>Preferred locations</FieldLabel>
            <TextInput value={targetLocations} onChange={setTargetLocations} placeholder="Bengaluru, Mumbai, Remote…" />
          </div>
          <div>
            <FieldLabel>Work mode</FieldLabel>
            <div className="flex gap-2">
              {(["remote", "hybrid", "onsite"] as const).map(mode => (
                <button key={mode} type="button" onClick={() => setWorkMode(prev => prev === mode ? null : mode)}
                  className="flex-1 h-10 rounded-full text-[13px] font-medium transition"
                  style={workMode === mode
                    ? { background: "var(--accent)", color: "#fffdf8", border: "none" }
                    : { background: "transparent", color: "var(--muted-foreground)", border: "1px solid var(--line-soft)" }}>
                  {mode === "onsite" ? "On-site" : mode.charAt(0).toUpperCase() + mode.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div>
            <FieldLabel>Expected salary</FieldLabel>
            <div className="flex items-center gap-2.5">
              <input type="number" min={0} max={9999} value={salaryMin} onChange={e => setSalaryMin(e.target.value)} placeholder="Min"
                className="h-[38px] w-full px-3 text-sm rounded-[6px] outline-none" style={{ background: "var(--surface)", border: "1px solid rgba(42,38,32,0.18)", color: "var(--foreground)" }} />
              <span className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>to</span>
              <input type="number" min={0} max={9999} value={salaryMax} onChange={e => setSalaryMax(e.target.value)} placeholder="Max"
                className="h-[38px] w-full px-3 text-sm rounded-[6px] outline-none" style={{ background: "var(--surface)", border: "1px solid rgba(42,38,32,0.18)", color: "var(--foreground)" }} />
              <span className="font-mono text-[11px] tracking-[0.1em]" style={{ color: "var(--muted-foreground)" }}>LPA</span>
            </div>
          </div>
        </div>
      </TypeB>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 5 — How AI scores jobs (Type B hybrid)
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 5) {
    return (
      <TypeB
        width={760}
        title="How AI scores jobs"
        subtitle="Every job is scored 1 to 5 across five dimensions."
        daysLeft={daysLeft}
        displayStep={displayStep}
        footer={
          <>
            <TextButton onClick={handleThresholdsSkip}>Use defaults</TextButton>
            <PrimaryButton onClick={handleThresholdsNext} disabled={busy}>{busy ? "Saving…" : "Save and continue"}</PrimaryButton>
          </>
        }
      >
        <ErrorBanner />

        <ScoreBar applyThreshold={applyScore} watchThreshold={watchScore} />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4.5 mb-1">
          {[
            { label: "Apply", color: "var(--ok)", bg: "var(--ok-bg)", desc: "Strong match — submit your application.", range: "3.5 and above" },
            { label: "Watch", color: "var(--warn)", bg: "var(--warn-bg)", desc: "Possible fit — worth monitoring.", range: "2.5 to 3.4" },
            { label: "Skip",  color: "var(--bad)", bg: "var(--bad-bg)", desc: "Poor match — not worth your time.", range: "Below 2.5" },
          ].map(d => (
            <div key={d.label} className="rounded-lg px-4 py-3.5" style={{ borderLeft: `3px solid ${d.color}`, background: d.bg }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold" style={{ color: d.color }}>{d.label}</span>
                <span className="font-mono text-[10px]" style={{ color: d.color }}>{d.range}</span>
              </div>
              <div className="text-xs mt-1.5" style={{ color: "var(--muted-foreground)" }}>{d.desc}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-5 mb-2">
          {[
            { name: "Role Fit", desc: "How well the role matches your target." },
            { name: "CV Match", desc: "Overlap between your skills and the JD." },
            { name: "Compensation", desc: "Pay versus your expected range." },
            { name: "Level Strategy", desc: "Whether the seniority fits your trajectory." },
            { name: "Legitimacy", desc: "Signals the posting is real and active." },
          ].map(d => (
            <div key={d.name} className="rounded-[10px] px-3.5 py-3" style={{ background: "var(--surface-soft)" }}>
              <div className="text-xs font-bold" style={{ color: "var(--foreground)" }}>{d.name}</div>
              <div className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{d.desc}</div>
            </div>
          ))}
          <div className="rounded-[10px] px-3.5 py-3" style={{ background: "var(--accent-soft)", border: "1px solid var(--accent-border)" }}>
            <div className="text-xs font-bold" style={{ color: "var(--accent)" }}>Final Score</div>
            <div className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>Weighted blend of all five dimensions.</div>
          </div>
        </div>

        <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--line-softer)" }}>
          <p className="font-mono text-[10px] tracking-[0.2em] uppercase mb-4.5" style={{ color: "var(--muted-foreground)" }}>Set your thresholds</p>

          <div className="mb-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-bold" style={{ color: "var(--ok)" }}>Apply threshold</span>
              <span className="font-mono text-xl font-medium" style={{ color: "var(--ok)" }}>{applyScore.toFixed(1)}</span>
            </div>
            <input type="range" min={watchScore + 0.1} max={5} step={0.1} value={applyScore}
              onChange={e => setApplyScore(Math.round(parseFloat(e.target.value) * 10) / 10)}
              className="w-full" style={{ accentColor: "var(--ok)" }} />
          </div>

          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[13px] font-bold" style={{ color: "var(--warn)" }}>Watch threshold</span>
              <span className="font-mono text-xl font-medium" style={{ color: "var(--warn)" }}>{watchScore.toFixed(1)}</span>
            </div>
            <input type="range" min={1} max={applyScore - 0.1} step={0.1} value={watchScore}
              onChange={e => setWatchScore(Math.round(parseFloat(e.target.value) * 10) / 10)}
              className="w-full" style={{ accentColor: "var(--warn)" }} />
          </div>

          <p className="font-mono text-[10px] mt-4" style={{ color: "var(--muted-foreground-2)" }}>
            Default: Apply 3.5 · Watch 2.5 · Change anytime in Settings
          </p>
        </div>
      </TypeB>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 6 — Your job search flow (Type A)
  // ═══════════════════════════════════════════════════════════════════════════

  if (step === 6) {
    const Node = ({ label, active }: { label: string; active?: boolean }) => (
      <div className="flex-1 h-9 rounded-lg flex items-center justify-center font-mono text-[10px] tracking-[0.1em]"
        style={active
          ? { background: "var(--accent)", color: "#fffdf8" }
          : { border: "1px solid rgba(255,255,255,0.2)", color: "rgba(255,255,255,0.5)" }}>
        {label}
      </div>
    );
    return (
      <TypeA
        ghost="06"
        daysLeft={daysLeft}
        leftBody={
          <>
            <div className="flex flex-col gap-2.5 mb-7">
              <div className="flex items-center gap-2">
                <Node label="FIND" /><span style={{ color: "rgba(255,255,255,0.3)" }}>→</span><Node label="EVALUATE" active />
              </div>
              <div className="flex items-center gap-2 pl-7">
                <span style={{ color: "rgba(255,255,255,0.3)" }}>↳</span><Node label="TRACK" /><span style={{ color: "rgba(255,255,255,0.3)" }}>→</span><Node label="TAILOR" />
              </div>
              <div className="flex items-center gap-2 pl-14">
                <span style={{ color: "rgba(255,255,255,0.3)" }}>↳</span><Node label="AUTOFILL" />
              </div>
            </div>
            <h1 className="nr-display text-[32px] leading-[1.12] mb-3">Your job search flow</h1>
            <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>From spotting a job to landing an offer.</p>
          </>
        }
        cta={<PrimaryButton onClick={() => setStep(7)}>Got it</PrimaryButton>}
      >
        <div className="flex flex-col gap-4">
          {[
            { n: 1, title: "Find", desc: "Spot a job on any job board or company site." },
            { n: 2, title: "Evaluate", credits: "5 credits", desc: "AI scores it 1–5 in seconds." },
            { n: 3, title: "Track", desc: "Job added to your pipeline board automatically." },
            { n: 4, title: "Tailor", credits: "10 credits", desc: "Generate a resume matched to the job description." },
            { n: 5, title: "Autofill", desc: "Browser extension fills the application form from your profile." },
          ].map(item => (
            <div key={item.n} className="flex gap-3 items-start">
              <span className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0" style={{ background: "var(--accent)", color: "#fffdf8" }}>
                {item.n}
              </span>
              <div>
                <div className="text-sm font-semibold" style={{ color: "var(--foreground)" }}>
                  {item.title}{item.credits && <span className="font-mono text-[10px] font-normal ml-1.5" style={{ color: "var(--muted-foreground-2)" }}>· {item.credits}</span>}
                </div>
                <div className="text-[13px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>{item.desc}</div>
              </div>
            </div>
          ))}
          <div className="rounded-[10px] px-4 py-3.5 mt-1" style={{ background: "var(--surface-soft)", border: "1px solid var(--line-soft)" }}>
            <div className="font-mono text-[10px] tracking-[0.16em] uppercase mb-1.5" style={{ color: "var(--muted-foreground)" }}>Credits</div>
            <div className="text-xs" style={{ color: "var(--muted-foreground)" }}>Earn up to 100 free credits · Starter: 100 credits/day · Pro: 300 credits/day</div>
          </div>
        </div>
      </TypeA>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // STEP 7 — All set! (Type A)
  // ═══════════════════════════════════════════════════════════════════════════

  const checklist = [
    { label: "Profile created", done: true, skippedTag: false },
    { label: "CV uploaded and parsed", done: cvStage === "review" && !skipped.cv, skippedTag: !!skipped.cv },
    { label: "Job preferences set", done: !skipped.prefs, skippedTag: !!skipped.prefs },
    { label: "AI score thresholds configured", done: !skipped.thresholds, skippedTag: !!skipped.thresholds },
  ];

  const quickActions = [
    { label: "Evaluate a job", desc: "Score your first listing.", href: "/dashboard/evaluate" },
    { label: "View pipeline", desc: "See your tracked jobs.", href: "/dashboard/pipeline" },
    { label: "Tailor a resume", desc: "Match your CV to a JD.", href: "/dashboard/profile" },
    { label: "Get the extension", desc: "Autofill applications.", href: "/dashboard/extension" },
  ];

  return (
    <TypeA
      ghost="07"
      daysLeft={daysLeft}
      leftBody={
        <>
          <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6.5" style={{ background: "var(--ok)" }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fffdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12 l4 4 L19 7" />
            </svg>
          </div>
          <h1 className="nr-display text-[34px] leading-[1.1] mb-3">You are all set!</h1>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>Time to find your next role.</p>
        </>
      }
      cta={
        <button type="button" onClick={handleComplete} disabled={busy}
          className="w-full rounded-full h-11 text-sm font-medium transition disabled:opacity-50"
          style={{ background: "var(--accent)", color: "#fffdf8", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.25)" }}>
          {busy ? "Heading in…" : "Go to dashboard"}
        </button>
      }
      rightLabel="What we set up"
    >
      <div className="flex flex-col gap-3 mb-6">
        {checklist.map(item => (
          <div key={item.label} className="flex items-center gap-2.5">
            {item.done ? <CheckCircle size={18} /> : (
              <span className="w-[18px] h-[18px] rounded-full flex-shrink-0" style={{ border: "1px solid var(--line-soft)" }} />
            )}
            <span className="text-sm" style={{ color: item.done ? "var(--foreground)" : "var(--muted-foreground)" }}>{item.label}</span>
            {item.skippedTag && (
              <span className="font-mono text-[9px] tracking-[0.12em] uppercase ml-auto" style={{ color: "var(--muted-foreground-2)" }}>Skipped</span>
            )}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {quickActions.map(a => (
          <button
            key={a.label}
            type="button"
            onClick={() => void handleCompleteAndGo(a.href)}
            disabled={busy}
            className="rounded-xl p-4 text-left transition-shadow disabled:opacity-50"
            style={{ background: "var(--surface)", border: "1px solid var(--line-soft)", cursor: "pointer" }}
            onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.07)")}
            onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
          >
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-semibold" style={{ color: "var(--foreground)" }}>{a.label}</span>
              <span style={{ color: "var(--accent)" }}>→</span>
            </div>
            <div className="text-xs mt-1" style={{ color: "var(--muted-foreground)" }}>{a.desc}</div>
          </button>
        ))}
      </div>
    </TypeA>
  );
}
