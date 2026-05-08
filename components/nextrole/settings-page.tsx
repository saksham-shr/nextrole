"use client";

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { updateProfile } from "@/app/actions/profile";
import type { ProfileRow } from "@/lib/db/types";

// ─── Primitives ───────────────────────────────────────────────────────────────

function Alert({ message, tone }: { message: string; tone: "ok" | "bad" }) {
  const styles = {
    ok: "border-[var(--ok)] bg-[#eef8f0] text-[var(--ok)]",
    bad: "border-[var(--bad)] bg-[#faebeb] text-[var(--bad)]",
  };
  return (
    <p className={`rounded-lg border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.16em] ${styles[tone]}`}>
      {message}
    </p>
  );
}

function SettingsCard({ id, title, subtitle, children }: { id?: string; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div id={id} className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6">
      <div className="mb-4 border-b border-[var(--line-soft)] pb-4">
        <div className="text-[15px] font-semibold">{title}</div>
        {subtitle && <div className="mt-1 text-[12.5px] text-[var(--muted-foreground)]">{subtitle}</div>}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">{hint}</div>}
    </div>
  );
}

const inputCls = "w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]";
const selectCls = "w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--accent)]";
const textareaCls = "w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[13px] leading-[1.6] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]";

// ─── Tag input with autocomplete ──────────────────────────────────────────────

const SUGGESTIONS: Record<string, string[]> = {
  locations: [
    "Remote", "Remote (India)", "Remote (US)", "Remote (EU)",
    "Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai", "Kolkata", "Noida", "Gurugram",
    "San Francisco", "New York", "Seattle", "Austin", "Los Angeles", "Boston", "Chicago",
    "London", "Amsterdam", "Berlin", "Paris", "Dublin", "Zürich", "Stockholm",
    "Singapore", "Dubai", "Toronto", "Sydney", "Tokyo",
  ],
  roles: [
    "Software Engineer", "Senior Software Engineer", "Staff Engineer", "Principal Engineer",
    "Engineering Manager", "Director of Engineering", "VP Engineering", "CTO",
    "Product Manager", "Senior Product Manager", "Group PM", "Technical PM",
    "Data Engineer", "ML Engineer", "AI Engineer", "Backend Engineer", "Frontend Engineer",
    "Full Stack Engineer", "DevOps Engineer", "Platform Engineer", "Site Reliability Engineer",
    "Solutions Architect", "Software Architect", "Developer Advocate",
  ],
  archetypes: [
    "Backend", "Frontend", "Full Stack", "Platform", "Product Eng", "LLMOps", "Agentic",
    "AI Platform", "Technical PM", "SA", "FDE", "Transformation", "Data", "ML/AI",
  ],
  company_types: [
    "startup", "scaleup", "enterprise", "AI lab", "fintech", "SaaS", "B2B", "B2C",
    "consumer", "deep tech", "climate tech", "crypto/web3", "healthcare tech", "edtech",
  ],
  languages: [
    "TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "Kotlin", "Swift",
    "C++", "C#", "Ruby", "PHP", "Scala", "Haskell", "Elixir", "Dart", "R",
    "SQL", "GraphQL", "Solidity",
  ],
};

function TagInput({
  name,
  label,
  suggestKey,
  defaultValue,
  placeholder,
  hint,
}: {
  name: string;
  label: string;
  suggestKey: keyof typeof SUGGESTIONS;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
}) {
  const [tags, setTags] = useState<string[]>(() =>
    (defaultValue ?? "").split(",").map((s) => s.trim()).filter(Boolean),
  );
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  const suggestions = SUGGESTIONS[suggestKey] ?? [];
  const filtered = suggestions
    .filter((s) => s.toLowerCase().includes(input.toLowerCase()) && !tags.includes(s))
    .slice(0, 7);

  function addTag(val: string) {
    const v = val.trim();
    if (v && !tags.includes(v)) setTags((t) => [...t, v]);
    setInput("");
    setFocusIdx(-1);
    inputRef.current?.focus();
  }

  function removeTag(i: number) {
    setTags((t) => t.filter((_, j) => j !== i));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (focusIdx >= 0 && filtered[focusIdx]) addTag(filtered[focusIdx]);
      else addTag(input);
    } else if (e.key === "Backspace" && !input && tags.length) {
      setTags((t) => t.slice(0, -1));
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusIdx((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const showDrop = open && (filtered.length > 0 || input.trim().length > 0);

  return (
    <Field label={label} hint={hint}>
      <input type="hidden" name={name} value={tags.join(", ")} />
      <div ref={dropRef} className="relative">
        <div
          className="flex min-h-[42px] flex-wrap gap-1.5 rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-2.5 py-1.5 cursor-text focus-within:border-[var(--accent)]"
          onClick={() => inputRef.current?.focus()}
        >
          {tags.map((tag, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--line-soft)] bg-[var(--background)] px-2 py-0.5 text-[12px]"
            >
              {tag}
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); removeTag(i); }}
                className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] leading-none"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => { setInput(e.target.value); setOpen(true); setFocusIdx(-1); }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={tags.length === 0 ? placeholder : ""}
            className="flex-1 min-w-[120px] bg-transparent text-[13px] outline-none placeholder:text-[var(--muted-foreground)]"
          />
        </div>

        {showDrop && (
          <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] py-1 shadow-lg">
            {filtered.map((s, i) => (
              <div
                key={s}
                className="flex items-center px-3 py-2 text-[13px] cursor-pointer"
                style={{
                  background: i === focusIdx ? "var(--surface-soft)" : "transparent",
                  color: "var(--foreground)",
                }}
                onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
                onMouseEnter={() => setFocusIdx(i)}
              >
                {s}
              </div>
            ))}
            {input.trim() && !filtered.includes(input.trim()) && (
              <div
                className="flex items-center gap-2 px-3 py-2 text-[13px] cursor-pointer border-t border-[var(--line-soft)]"
                style={{ color: "var(--accent)" }}
                onMouseDown={(e) => { e.preventDefault(); addTag(input.trim()); }}
              >
                <span className="text-[var(--muted-foreground)]">Add</span> "{input.trim()}"
              </div>
            )}
          </div>
        )}
      </div>
    </Field>
  );
}

// ─── Compensation range slider ────────────────────────────────────────────────

function useIsIndia(): boolean {
  return useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz === "Asia/Kolkata" || tz === "Asia/Calcutta";
    } catch { return false; }
  }, []);
}

function CompensationSlider({
  isIndia,
  currentComp,
  compMin,
  compMax,
}: {
  isIndia: boolean;
  currentComp?: number | null;
  compMin?: number | null;
  compMax?: number | null;
}) {
  const sliderMin = isIndia ? 1 : 30000;
  const sliderMax = isIndia ? 300 : 600000;
  const step = isIndia ? 1 : 10000;
  const unit = isIndia ? "LPA" : "/ yr";
  const prefix = isIndia ? "₹" : "$";

  function fmt(v: number) {
    if (isIndia) return `${v} LPA`;
    return `$${(v / 1000).toFixed(0)}k`;
  }

  const defaultMin = compMin ?? (isIndia ? 10 : 80000);
  const defaultMax = compMax ?? (isIndia ? 30 : 200000);
  const defaultCurrent = currentComp ?? (isIndia ? 15 : 100000);

  const [minVal, setMinVal] = useState(defaultMin);
  const [maxVal, setMaxVal] = useState(defaultMax);
  const [currentVal, setCurrentVal] = useState(defaultCurrent);

  const minPct = ((minVal - sliderMin) / (sliderMax - sliderMin)) * 100;
  const maxPct = ((maxVal - sliderMin) / (sliderMax - sliderMin)) * 100;

  return (
    <div className="flex flex-col gap-6">
      {/* Current comp */}
      <Field label={`Current compensation (${isIndia ? "LPA" : "USD / yr"})`}>
        <input type="hidden" name="current_comp" value={currentVal} />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-[var(--muted-foreground)]">Current</span>
          <span className="font-mono text-[14px] font-medium text-[var(--foreground)]">{fmt(currentVal)}</span>
        </div>
        <input
          type="range"
          min={sliderMin}
          max={sliderMax}
          step={step}
          value={currentVal}
          onChange={(e) => setCurrentVal(Number(e.target.value))}
          className="w-full accent-[var(--accent)] h-[5px]"
          style={{ accentColor: "var(--accent)" }}
        />
        <div className="flex justify-between mt-1 text-[10px] text-[var(--muted-foreground)] font-mono">
          <span>{fmt(sliderMin)}</span>
          <span>{fmt(sliderMax)}</span>
        </div>
      </Field>

      {/* Target range */}
      <Field label={`Target range (${isIndia ? "LPA" : "USD / yr"})`} hint="Drag both ends to set your min and max target">
        <input type="hidden" name="comp_min" value={minVal} />
        <input type="hidden" name="comp_max" value={maxVal} />

        <div className="flex items-center justify-between mb-3">
          <div className="text-center">
            <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase mb-0.5">Min</div>
            <div className="font-mono text-[14px] font-medium text-[var(--accent)]">{fmt(minVal)}</div>
          </div>
          <div className="flex-1 mx-4 relative">
            {/* Track fill */}
            <div className="relative h-[6px] rounded-full" style={{ background: "var(--line-soft)" }}>
              <div
                className="absolute h-full rounded-full"
                style={{
                  left: `${minPct}%`,
                  right: `${100 - maxPct}%`,
                  background: "var(--accent)",
                }}
              />
            </div>
            {/* Min thumb */}
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={step}
              value={minVal}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v < maxVal) setMinVal(v);
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-[6px]"
              style={{ height: 6 }}
            />
            {/* Max thumb — layered on top, same track */}
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={step}
              value={maxVal}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > minVal) setMaxVal(v);
              }}
              className="absolute inset-0 w-full opacity-0 cursor-pointer h-[6px]"
              style={{ height: 6 }}
            />
            {/* Thumb dots */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[var(--accent)] bg-[var(--surface)] shadow pointer-events-none"
              style={{ left: `calc(${minPct}% - 8px)` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-[var(--accent)] bg-[var(--surface)] shadow pointer-events-none"
              style={{ left: `calc(${maxPct}% - 8px)` }}
            />
          </div>
          <div className="text-center">
            <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase mb-0.5">Max</div>
            <div className="font-mono text-[14px] font-medium text-[var(--accent)]">{fmt(maxVal)}</div>
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] font-mono">
          <span>{fmt(sliderMin)}</span>
          <span>{fmt(sliderMax)}</span>
        </div>
      </Field>
    </div>
  );
}

// ─── Nav ─────────────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { id: "profile",      label: "Profile & CV" },
  { id: "preferences",  label: "Job preferences" },
  { id: "compensation", label: "Compensation" },
  { id: "ai",          label: "AI & Evaluation" },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export function SettingsPageContent({
  profile,
  error,
  message,
}: {
  profile: ProfileRow | null;
  error?: string;
  message?: string;
}) {
  const [activeSection, setActiveSection] = useState("profile");
  const [navOpen, setNavOpen] = useState(true);
  const cvMissing = !profile?.base_cv;
  const isIndia = useIsIndia();

  function scrollTo(id: string) {
    setActiveSection(id);
    // On mobile collapse the nav after picking a section
    if (typeof window !== "undefined" && window.innerWidth < 768) setNavOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="mx-auto pt-4" style={{ maxWidth: 1100 }}>
      {/* Collapsible sidebar + main */}
      <div className={`grid grid-cols-1 gap-8 ${navOpen ? "md:grid-cols-[200px_1fr]" : ""}`}>

      {/* Sidebar — visible when navOpen */}
      {navOpen && (
        <div className="shrink-0">
          {/* Header row with collapse button */}
          <div className="mb-3 flex items-center justify-between">
            <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-foreground)]">Settings</span>
            <button
              onClick={() => setNavOpen(false)}
              title="Collapse sidebar"
              className="rounded-[5px] p-1 text-[var(--muted-foreground)] transition hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
            >
              {/* Left arrow / close */}
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 12L6 8l4-4" />
              </svg>
            </button>
          </div>
          <div className="flex flex-col gap-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                className="rounded-[5px] px-3 py-2 text-left text-[13px] transition"
                style={{
                  background: activeSection === item.id ? "var(--surface)" : "transparent",
                  border: `1px solid ${activeSection === item.id ? "var(--line-soft)" : "transparent"}`,
                  color: activeSection === item.id ? "var(--foreground)" : "var(--muted-foreground)",
                  fontWeight: activeSection === item.id ? 500 : 400,
                }}
              >
                {item.label}
              </button>
            ))}
            <Link href="/dashboard/billing" className="rounded-[5px] px-3 py-2 text-left text-[13px] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]">
              Billing
            </Link>
          </div>
        </div>
      )}

      {/* Main */}
      <div>
        {/* Page header — always shows expand button when sidebar is closed */}
        <div className="mb-6 flex items-center gap-3">
          {!navOpen && (
            <button
              onClick={() => setNavOpen(true)}
              title="Open sidebar"
              className="rounded-[6px] border border-[var(--line-soft)] p-1.5 text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="2" y1="4" x2="14" y2="4" />
                <line x1="2" y1="8" x2="14" y2="8" />
                <line x1="2" y1="12" x2="14" y2="12" />
              </svg>
            </button>
          )}
          <h1 className="text-[24px] font-normal tracking-[-0.02em]">Settings</h1>
        </div>

        {error && <div className="mb-4"><Alert message={error} tone="bad" /></div>}
        {message && <div className="mb-4"><Alert message={message} tone="ok" /></div>}

        {cvMissing && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <div className="text-[14px] font-semibold text-amber-800">CV required</div>
            <p className="mt-1 text-[12.5px] text-amber-700">Paste your base CV below — the evaluator reads it for every job analysis.</p>
          </div>
        )}

        <form action={updateProfile} className="flex flex-col gap-6">

          {/* Profile & CV */}
          <SettingsCard id="profile" title="Personal info" subtitle="Name and email — your account identity.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Full name">
                <input name="full_name" className={inputCls} defaultValue={profile?.full_name ?? ""} placeholder="Alex Johnson" />
              </Field>
              <Field label="Email">
                <input className={inputCls} defaultValue={profile?.email ?? ""} disabled style={{ opacity: 0.5 }} />
              </Field>
              <Field label="Years of experience">
                <input name="years_experience" type="number" className={inputCls} placeholder="8" defaultValue={profile?.years_experience ?? ""} />
              </Field>
              <Field label="Seniority level">
                <select name="seniority" className={selectCls} defaultValue={profile?.seniority ?? ""}>
                  <option value="">— not set —</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid-level</option>
                  <option value="senior">Senior</option>
                  <option value="staff">Staff</option>
                  <option value="principal">Principal / Distinguished</option>
                </select>
              </Field>
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" className="rounded-lg border border-[var(--line-soft)] px-4 py-2 text-[13px] font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                Save
              </button>
            </div>
          </SettingsCard>

          {/* CV */}
          <SettingsCard title="Your CV" subtitle="Used to score job fit and tailor resumes." id="cv">
            <textarea
              name="base_cv"
              className={textareaCls}
              style={{ minHeight: 220, fontFamily: "DM Mono, monospace", fontSize: 12.5, lineHeight: 1.6 }}
              placeholder="Paste your full CV here (plain text is fine)..."
              defaultValue={profile?.base_cv ?? ""}
            />
            <div className="mt-3 flex items-center justify-between">
              <div className="text-[12px] text-[var(--muted-foreground)]">
                Plain text or markdown · {profile?.base_cv ? `${profile.base_cv.split(/\s+/).filter(Boolean).length} words` : "no CV yet"}
              </div>
              <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90">
                Save CV
              </button>
            </div>
          </SettingsCard>

          {/* Job preferences — tag inputs with autocomplete */}
          <SettingsCard id="preferences" title="Job preferences" subtitle="Tunes detection, scoring and resume focus.">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TagInput
                name="target_roles"
                label="Target roles"
                suggestKey="roles"
                defaultValue={profile?.target_roles?.join(", ")}
                placeholder="Staff Engineer, PM…"
              />
              <TagInput
                name="target_locations"
                label="Target locations"
                suggestKey="locations"
                defaultValue={profile?.target_locations?.join(", ")}
                placeholder="Bengaluru, Remote…"
              />
              <Field label="Work mode">
                <select name="work_mode" className={selectCls} defaultValue={profile?.work_mode ?? ""}>
                  <option value="">— not set —</option>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </select>
              </Field>
              <TagInput
                name="target_archetypes"
                label="Target archetypes"
                suggestKey="archetypes"
                defaultValue={profile?.target_archetypes?.join(", ")}
                placeholder="Platform, LLMOps…"
              />
              <TagInput
                name="preferred_company_types"
                label="Company types"
                suggestKey="company_types"
                defaultValue={profile?.preferred_company_types?.join(", ")}
                placeholder="startup, SaaS…"
              />
              <TagInput
                name="languages"
                label="Technical languages"
                suggestKey="languages"
                defaultValue={profile?.languages?.join(", ")}
                placeholder="TypeScript, Go…"
              />
            </div>
            <div className="mt-4 flex justify-end">
              <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90">
                Save preferences
              </button>
            </div>
          </SettingsCard>

          {/* Compensation — locale-aware range slider */}
          <SettingsCard
            id="compensation"
            title="Compensation"
            subtitle={isIndia ? "All figures in LPA (Lakhs Per Annum) — ₹ India" : "All figures in USD per year"}
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="text-[11px] text-[var(--muted-foreground)]">Currency:</span>
              <span
                className="inline-flex items-center gap-1.5 rounded-[4px] border border-[var(--line-soft)] bg-[var(--background)] px-2.5 py-1 text-[12px] font-mono"
              >
                {isIndia ? "🇮🇳 ₹ INR · LPA" : "🌍 $ USD · per year"}
              </span>
            </div>
            <CompensationSlider
              isIndia={isIndia}
              currentComp={profile?.current_comp ?? null}
              compMin={profile?.comp_min ?? null}
              compMax={profile?.comp_max ?? null}
            />
            <div className="mt-4 flex justify-end">
              <button type="submit" className="rounded-lg border border-[var(--line-soft)] px-4 py-2 text-[13px] font-medium transition hover:border-[var(--accent)] hover:text-[var(--accent)]">
                Save
              </button>
            </div>
          </SettingsCard>

          {/* AI & Evaluation */}
          <SettingsCard id="ai" title="AI & Evaluation" subtitle="Customise how every AI workflow runs for you.">
            <div className="flex flex-col gap-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Preferred output language">
                  <select name="preferred_language" className={selectCls} defaultValue={profile?.preferred_language ?? "en"}>
                    <option value="en">English</option>
                    <option value="hi">Hindi / हिन्दी</option>
                    <option value="es">Spanish / Español</option>
                    <option value="fr">French / Français</option>
                    <option value="de">German / Deutsch</option>
                    <option value="pt">Portuguese / Português</option>
                    <option value="zh">Chinese / 中文</option>
                    <option value="ja">Japanese / 日本語</option>
                    <option value="ar">Arabic / العربية</option>
                    <option value="ko">Korean / 한국어</option>
                    <option value="it">Italian / Italiano</option>
                    <option value="nl">Dutch / Nederlands</option>
                  </select>
                </Field>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Apply threshold (default 3.5)">
                  <input name="eval_score_apply" type="number" className={inputCls} placeholder="3.5" defaultValue={profile?.eval_score_apply ?? 3.5} step="0.1" />
                </Field>
                <Field label="Watch threshold (default 2.5)">
                  <input name="eval_score_watch" type="number" className={inputCls} placeholder="2.5" defaultValue={profile?.eval_score_watch ?? 2.5} step="0.1" />
                </Field>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Scores above Apply → "apply" · between thresholds → "watch" · below Watch → "skip"
              </p>

              <Field label="Custom evaluation focus (optional)">
                <textarea
                  name="custom_eval_focus"
                  className={textareaCls}
                  rows={4}
                  placeholder="e.g. Prioritise companies with strong remote culture. Weight AI/ML stack experience highly."
                  defaultValue={profile?.custom_eval_focus ?? ""}
                />
              </Field>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[var(--muted-foreground)]">
                Plain English injected into every evaluation prompt
              </p>

              <TagInput
                name="custom_archetypes"
                label="Custom archetypes (optional — overrides defaults)"
                suggestKey="archetypes"
                defaultValue={profile?.custom_archetypes?.join(", ")}
                placeholder="AI Infrastructure, Applied ML…"
              />

              <div className="flex justify-end">
                <button type="submit" className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white transition hover:opacity-90">
                  Save settings
                </button>
              </div>
            </div>
          </SettingsCard>
        </form>
      </div>
      </div>{/* end grid */}
    </div>
  );
}
