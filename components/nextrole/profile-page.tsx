"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type {
  ProfileRow,
  WorkExperienceEntry,
  EducationEntry,
  CertificationEntry,
  ProjectEntry,
} from "@/lib/db/types";
import { CompensationSlider, useIsIndia } from "@/components/nextrole/compensation-slider";

// ─── Style tokens (match settings-page.tsx) ───────────────────────────────────

const inputCls    = "w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]";
const selectCls   = "w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--accent)]";
const textareaCls = "w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[13px] leading-[1.6] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] min-h-[80px]";

// ─── Section registry — drives the sidebar nav and the cards ──────────────────

type SectionId =
  | "cv" | "contact" | "preferences" | "job_targets" | "compensation"
  | "experience" | "education" | "skills"
  | "projects" | "certifications" | "address" | "demographics";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "cv",              label: "CV" },
  { id: "contact",         label: "Contact & Identity" },
  { id: "preferences",     label: "Availability" },
  { id: "job_targets",     label: "Job Targets" },
  { id: "compensation",    label: "Compensation" },
  { id: "experience",      label: "Work experience" },
  { id: "education",       label: "Education" },
  { id: "skills",          label: "Key skills" },
  { id: "projects",        label: "Projects" },
  { id: "certifications",  label: "Certifications" },
  { id: "address",         label: "Address" },
  { id: "demographics",    label: "Demographics" },
];

// ─── Primitives ───────────────────────────────────────────────────────────────

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">{hint}</div>}
    </div>
  );
}

function Card({
  id, title, subtitle, action, children,
}: {
  id: string; title: string; subtitle?: string;
  action?: React.ReactNode; children: React.ReactNode;
}) {
  return (
    <section
      id={`section-${id}`}
      className="scroll-mt-24 rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-6"
    >
      <header className="mb-4 flex items-start justify-between gap-3 border-b border-[var(--line-soft)] pb-4">
        <div>
          <div className="text-[15px] font-semibold">{title}</div>
          {subtitle && <div className="mt-1 text-[12.5px] text-[var(--muted-foreground)]">{subtitle}</div>}
        </div>
        <div className="flex shrink-0 gap-2">{action}</div>
      </header>
      {children}
    </section>
  );
}

function PrimaryBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50 ${className ?? ""}`}
    />
  );
}

function GhostBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-[12.5px] hover:bg-[var(--surface-soft)] disabled:opacity-50 ${className ?? ""}`}
    />
  );
}

function LinkBtn(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className, ...rest } = props;
  return (
    <button
      type="button"
      {...rest}
      className={`text-[13px] font-medium text-[var(--accent)] hover:underline disabled:opacity-50 ${className ?? ""}`}
    />
  );
}

// ─── Save helper ──────────────────────────────────────────────────────────────

async function savePatch(patch: Record<string, unknown>) {
  const res = await fetch("/api/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? `Save failed (${res.status})`);
  }
  return res.json() as Promise<{ ok: boolean; updated: number }>;
}

// ─── Inline save feedback ─────────────────────────────────────────────────────

function useSaveState(onComplete?: () => void) {
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  function setSaved() {
    if (timer.current) clearTimeout(timer.current);
    setSavedMsg("Saved");
    timer.current = setTimeout(() => { setSavedMsg(null); onComplete?.(); }, 1400);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return { savedMsg, setSaved };
}

function SaveStatus({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <span className="flex items-center gap-1 text-[12px] font-medium text-[var(--ok)]">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
      {msg}
    </span>
  );
}

// ─── Tag input (used by skills, target_roles, languages) ──────────────────────

function TagInput({
  tags, onChange, placeholder, suggestions = [],
}: {
  tags: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  suggestions?: string[];
}) {
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const filtered = useMemo(() => {
    const q = input.toLowerCase().trim();
    if (!q) return [];
    return suggestions.filter((s) => s.toLowerCase().includes(q) && !tags.includes(s)).slice(0, 6);
  }, [input, suggestions, tags]);

  function add(v: string) {
    const t = v.trim();
    if (!t || tags.includes(t)) return;
    onChange([...tags, t]);
    setInput("");
  }

  return (
    <div className="relative">
      <div
        className="flex min-h-[42px] flex-wrap gap-1.5 rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-2.5 py-1.5 cursor-text focus-within:border-[var(--accent)]"
        onClick={() => inputRef.current?.focus()}
      >
        {tags.map((tag, i) => (
          <span key={i} className="inline-flex items-center gap-1 rounded-[4px] border border-[var(--line-soft)] bg-[var(--background)] px-2 py-0.5 text-[12px]">
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(tags.filter((_, j) => j !== i)); }}
              className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] leading-none"
              aria-label={`Remove ${tag}`}
            >×</button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(input); }
            else if (e.key === "Backspace" && !input && tags.length) onChange(tags.slice(0, -1));
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="flex-1 min-w-[120px] bg-transparent text-[13px] outline-none placeholder:text-[var(--muted-foreground)]"
        />
      </div>
      {filtered.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] py-1 shadow-lg max-h-[200px] overflow-y-auto">
          {filtered.map((s) => (
            <div
              key={s}
              onMouseDown={(e) => { e.preventDefault(); add(s); }}
              className="cursor-pointer px-3 py-2 text-[13px] hover:bg-[var(--surface-soft)]"
            >{s}</div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function ProfileSidebar({ profile, completion }: { profile: ProfileRow; completion: number }) {
  const [active, setActive] = useState<SectionId>("preferences");
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            const id = e.target.id.replace("section-", "") as SectionId;
            setActive(id);
            break;
          }
        }
      },
      { rootMargin: "-30% 0px -60% 0px", threshold: 0 },
    );
    SECTIONS.forEach((s) => {
      const el = document.getElementById(`section-${s.id}`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, []);

  return (
    <aside className="sticky top-6 hidden w-[220px] shrink-0 self-start lg:block">
      <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
        <div className="mb-3 text-[13px] font-semibold">Quick links</div>
        <nav className="flex flex-col gap-1">
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#section-${s.id}`}
              className={`rounded-md px-2.5 py-1.5 text-[12.5px] transition-colors ${
                active === s.id
                  ? "bg-[var(--surface-soft)] text-[var(--foreground)] font-medium"
                  : "text-[var(--muted-foreground)] hover:bg-[var(--surface-soft)] hover:text-[var(--foreground)]"
              }`}
            >
              {s.label}
            </a>
          ))}
        </nav>

        <div className="mt-5 border-t border-[var(--line-soft)] pt-4">
          <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            Profile completion
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[var(--surface-soft)]">
            <div
              className="h-full bg-[var(--accent)] transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">
            {completion}% complete · used for autofill
          </div>
        </div>
        <input type="hidden" data-name={profile.full_name ?? ""} />
      </div>
    </aside>
  );
}

// ─── Completion calculator ────────────────────────────────────────────────────

function computeCompletion(p: ProfileRow): number {
  let s = 0;
  const has = (v: unknown) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
  if (has(p.full_name)) s += 5;
  if (has(p.phone)) s += 5;
  if (has(p.linkedin_url)) s += 5;
  if (has(p.github_url) || has(p.portfolio_url)) s += 5;
  if (has(p.country) && has(p.city)) s += 10;
  if (has(p.state_province) && has(p.zip_postal)) s += 5;
  if (has(p.work_mode) && has(p.seniority)) s += 10;
  if (has(p.years_experience)) s += 5;
  if (has(p.notice_period)) s += 5;
  if (has(p.target_roles) && (p.target_roles?.length ?? 0) > 0) s += 5;
  if (has(p.work_experience) && (p.work_experience?.length ?? 0) > 0) s += 15;
  if (has(p.education) && (p.education?.length ?? 0) > 0) s += 10;
  if (has(p.skills) && (p.skills?.length ?? 0) >= 5) s += 10;
  if (has(p.base_cv)) s += 5;
  return Math.min(100, s);
}

// ============================================================================
// SECTION COMPONENTS
// ============================================================================

// ─── 1. Career (work_mode, seniority, years_exp, notice, relocate, visa) ─────

function PreferencesCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [workMode, setWorkMode] = useState(p.work_mode ?? "");
  const [seniority, setSeniority] = useState(p.seniority ?? "");
  const [yearsExp, setYearsExp] = useState(p.years_experience?.toString() ?? "");
  const [notice, setNotice] = useState(p.notice_period ?? "");
  const [relocate, setRelocate] = useState(p.willing_to_relocate ?? true);
  const [sponsor, setSponsor] = useState(p.sponsorship_needed ?? false);
  const { savedMsg, setSaved } = useSaveState(() => setEditing(false));

  async function save() {
    setBusy(true);
    try {
      const patch = {
        work_mode: workMode || null,
        seniority: seniority || null,
        years_experience: yearsExp ? Number(yearsExp) : null,
        notice_period: notice || null,
        willing_to_relocate: relocate,
        sponsorship_needed: sponsor,
      };
      await savePatch(patch);
      onSaved(patch as Partial<ProfileRow>);
      setSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!editing) {
    return (
      <Card id="preferences" title="Availability" action={<LinkBtn onClick={() => setEditing(true)}>Edit</LinkBtn>}>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <ViewField label="Work mode" value={p.work_mode} />
          <ViewField label="Seniority" value={p.seniority} />
          <ViewField label="Years of experience" value={p.years_experience?.toString()} />
          <ViewField label="Notice period" value={p.notice_period?.replace(/_/g, " ")} />
          <ViewField label="Willing to relocate" value={p.willing_to_relocate === true ? "Yes" : p.willing_to_relocate === false ? "No" : null} />
          <ViewField label="Visa sponsorship needed" value={p.sponsorship_needed === true ? "Yes" : p.sponsorship_needed === false ? "No" : null} />
        </div>
      </Card>
    );
  }

  return (
    <Card id="preferences" title="Availability" subtitle="Used for fill suggestions on every application">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Work mode">
          <select className={selectCls} value={workMode} onChange={(e) => setWorkMode(e.target.value)}>
            <option value="">—</option><option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option><option value="onsite">On-site</option>
          </select>
        </Field>
        <Field label="Seniority">
          <select className={selectCls} value={seniority} onChange={(e) => setSeniority(e.target.value)}>
            <option value="">—</option><option value="junior">Junior / Entry</option>
            <option value="mid">Mid</option><option value="senior">Senior</option>
            <option value="staff">Staff</option><option value="principal">Principal</option>
          </select>
        </Field>
        <Field label="Years of experience">
          <input className={inputCls} type="number" min={0} max={50} value={yearsExp} onChange={(e) => setYearsExp(e.target.value)} />
        </Field>
        <Field label="Notice period">
          <select className={selectCls} value={notice} onChange={(e) => setNotice(e.target.value)}>
            <option value="">—</option>
            <option value="immediately">Immediately</option>
            <option value="2_weeks">2 weeks</option>
            <option value="1_month">1 month</option>
            <option value="2_months">2 months</option>
            <option value="3_months">3 months</option>
          </select>
        </Field>
        <Field label="Willing to relocate">
          <select className={selectCls} value={relocate ? "yes" : "no"} onChange={(e) => setRelocate(e.target.value === "yes")}>
            <option value="yes">Yes</option><option value="no">No</option>
          </select>
        </Field>
        <Field label="Need visa sponsorship?">
          <select className={selectCls} value={sponsor ? "yes" : "no"} onChange={(e) => setSponsor(e.target.value === "yes")}>
            <option value="no">No</option><option value="yes">Yes</option>
          </select>
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
        <SaveStatus msg={savedMsg} />
      </div>
    </Card>
  );
}

// ─── 1b. Job Targets (roles, locations, archetypes, company types, languages) ─

const ROLE_SUGGESTIONS = [
  "Software Engineer", "Senior Software Engineer", "Staff Engineer", "Principal Engineer",
  "Engineering Manager", "Director of Engineering", "VP Engineering", "CTO",
  "Product Manager", "Senior Product Manager", "Data Engineer", "ML Engineer",
  "AI Engineer", "Backend Engineer", "Frontend Engineer", "Full Stack Engineer",
  "DevOps Engineer", "Platform Engineer", "Site Reliability Engineer",
];
const LOCATION_SUGGESTIONS = [
  "Remote", "Remote (India)", "Remote (US)", "Remote (EU)",
  "Bengaluru", "Mumbai", "Delhi", "Hyderabad", "Pune", "Chennai",
  "San Francisco", "New York", "Seattle", "Austin", "London", "Singapore", "Dubai",
];
const ARCHETYPE_SUGGESTIONS = [
  "Backend", "Frontend", "Full Stack", "Platform", "Product Eng", "LLMOps", "Agentic",
  "AI Platform", "Technical PM", "SA", "FDE", "Transformation", "Data", "ML/AI",
];
const COMPANY_TYPE_SUGGESTIONS = [
  "startup", "scaleup", "enterprise", "AI lab", "fintech", "SaaS", "B2B", "B2C",
  "consumer", "deep tech", "climate tech", "crypto/web3", "healthcare tech", "edtech",
];
const LANG_SUGGESTIONS = [
  "TypeScript", "JavaScript", "Python", "Go", "Rust", "Java", "Kotlin", "Swift",
  "C++", "C#", "Ruby", "PHP", "Scala", "Elixir", "SQL", "GraphQL",
];

function JobTargetsCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [roles, setRoles]          = useState<string[]>(p.target_roles ?? []);
  const [locations, setLocations]  = useState<string[]>(p.target_locations ?? []);
  const [archetypes, setArchetypes]= useState<string[]>(p.target_archetypes ?? []);
  const [companyTypes, setCompanyTypes] = useState<string[]>(p.preferred_company_types ?? []);
  const [languages, setLanguages]  = useState<string[]>(p.languages ?? []);
  const { savedMsg, setSaved } = useSaveState(() => setEditing(false));
  useEffect(() => { setRoles(p.target_roles ?? []); }, [p.target_roles]);
  useEffect(() => { setLocations(p.target_locations ?? []); }, [p.target_locations]);
  useEffect(() => { setArchetypes(p.target_archetypes ?? []); }, [p.target_archetypes]);
  useEffect(() => { setCompanyTypes(p.preferred_company_types ?? []); }, [p.preferred_company_types]);
  useEffect(() => { setLanguages(p.languages ?? []); }, [p.languages]);

  async function save() {
    setBusy(true);
    try {
      const patch = {
        target_roles: roles,
        target_locations: locations,
        target_archetypes: archetypes,
        preferred_company_types: companyTypes,
        languages,
      };
      await savePatch(patch);
      onSaved(patch as Partial<ProfileRow>);
      setSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!editing) {
    return (
      <Card id="job_targets" title="Job Targets" action={<LinkBtn onClick={() => setEditing(true)}>Edit</LinkBtn>}>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <ViewField label="Target roles" value={(p.target_roles ?? []).join(", ") || null} className="sm:col-span-2" />
          <ViewField label="Preferred locations" value={(p.target_locations ?? []).join(", ") || null} className="sm:col-span-2" />
          <ViewField label="Archetypes" value={(p.target_archetypes ?? []).join(", ") || null} />
          <ViewField label="Company types" value={(p.preferred_company_types ?? []).join(", ") || null} />
          <ViewField label="Technical languages" value={(p.languages ?? []).join(", ") || null} className="sm:col-span-2" />
        </div>
      </Card>
    );
  }

  return (
    <Card id="job_targets" title="Job Targets" subtitle="Tunes AI scoring and resume focus for every evaluation.">
      <div className="flex flex-col gap-4">
        <Field label="Target roles">
          <TagInput tags={roles} onChange={setRoles} placeholder="Add role…" suggestions={ROLE_SUGGESTIONS} />
        </Field>
        <Field label="Preferred locations">
          <TagInput tags={locations} onChange={setLocations} placeholder="Add city or 'Remote'…" suggestions={LOCATION_SUGGESTIONS} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Archetypes">
            <TagInput tags={archetypes} onChange={setArchetypes} placeholder="Platform, LLMOps…" suggestions={ARCHETYPE_SUGGESTIONS} />
          </Field>
          <Field label="Company types">
            <TagInput tags={companyTypes} onChange={setCompanyTypes} placeholder="startup, SaaS…" suggestions={COMPANY_TYPE_SUGGESTIONS} />
          </Field>
        </div>
        <Field label="Technical languages">
          <TagInput tags={languages} onChange={setLanguages} placeholder="TypeScript, Go…" suggestions={LANG_SUGGESTIONS} />
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
        <SaveStatus msg={savedMsg} />
      </div>
    </Card>
  );
}

// ─── 1c. Compensation (slider, locale-aware) ──────────────────────────────────

function CompensationCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy]       = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const isIndia = useIsIndia();
  const { savedMsg, setSaved } = useSaveState(() => setEditing(false));

  function fmt(v: number | null | undefined) {
    if (v == null) return null;
    if (isIndia) return `${v} LPA`;
    return `$${(v / 1000).toFixed(0)}k / yr`;
  }

  async function save() {
    if (!formRef.current) return;
    setBusy(true);
    const data = new FormData(formRef.current);
    const patch = {
      current_comp: data.get("current_comp") ? Number(data.get("current_comp")) : null,
      comp_min:     data.get("comp_min")     ? Number(data.get("comp_min"))     : null,
      comp_max:     data.get("comp_max")     ? Number(data.get("comp_max"))     : null,
    };
    try {
      await savePatch(patch);
      onSaved(patch as Partial<ProfileRow>);
      setSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!editing) {
    return (
      <Card id="compensation" title="Compensation" action={<LinkBtn onClick={() => setEditing(true)}>Edit</LinkBtn>}>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-3">
          <ViewField label="Current" value={fmt(p.current_comp)} />
          <ViewField label="Target min" value={fmt(p.comp_min)} />
          <ViewField label="Target max" value={fmt(p.comp_max)} />
        </div>
      </Card>
    );
  }

  return (
    <Card id="compensation" title="Compensation" subtitle={isIndia ? "All figures in LPA (Lakhs Per Annum)" : "All figures in USD per year"}>
      <form ref={formRef}>
        <CompensationSlider isIndia={isIndia} currentComp={p.current_comp} compMin={p.comp_min} compMax={p.comp_max} />
      </form>
      <div className="mt-5 flex items-center gap-3">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
        <SaveStatus msg={savedMsg} />
      </div>
    </Card>
  );
}

// AIEvalCard moved to Settings page. See components/nextrole/settings-page.tsx.

// ─── 1e. CV upload ────────────────────────────────────────────────────────────

function CVCard({ p, onSaved, onImport }: {
  p: ProfileRow;
  onSaved: (next: Partial<ProfileRow>) => void;
  onImport: (data: Partial<ProfileRow>) => void;
}) {
  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [filling, setFilling]         = useState(false);
  const [fillError, setFillError]     = useState<string | null>(null);
  const [fillDone, setFillDone]       = useState(false);
  const [wordCount, setWordCount]     = useState<number | null>(
    p.base_cv ? p.base_cv.split(/\s+/).filter(Boolean).length : null,
  );
  const inputRef = useRef<HTMLInputElement>(null);
  const CV_ACCEPT = ".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

  async function uploadFile(file: File) {
    setUploading(true);
    setUploadError(null);
    setFillDone(false);
    setFillError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/profile/base-cv", { method: "POST", body: form });
      const j = await res.json().catch(() => ({})) as { words?: number; error?: string };
      if (!res.ok) throw new Error(j.error ?? `Upload failed (${res.status})`);
      setWordCount(j.words ?? null);
      onSaved({ base_cv: "__uploaded__" } as Partial<ProfileRow>);
    } catch (e) {
      setUploadError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function fillProfileFromCv() {
    setFilling(true);
    setFillError(null);
    setFillDone(false);
    try {
      const res = await fetch("/api/extension/cv-structure-import", { method: "POST" });
      const data = await res.json() as Partial<ProfileRow> & { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed to fill profile");
      onImport(data);
      setFillDone(true);
    } catch (e) {
      setFillError((e as Error).message);
    } finally {
      setFilling(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void uploadFile(f);
  }

  const hasCV = wordCount !== null && wordCount > 0;

  return (
    <Card
      id="cv"
      title="CV"
      subtitle="Upload once — powers every evaluation, tailoring, cover letter, and auto-fill."
    >
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          dragging ? "border-[var(--accent)] bg-[var(--surface-soft)]" : "border-[var(--line-soft)] hover:bg-[var(--surface-soft)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={CV_ACCEPT}
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void uploadFile(f);
            e.target.value = "";
          }}
        />
        <svg className="mx-auto mb-3 text-[var(--muted-foreground)]" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
          <polyline points="14 2 14 8 20 8"/>
          <line x1="12" y1="18" x2="12" y2="12"/>
          <line x1="9" y1="15" x2="15" y2="15"/>
        </svg>
        <div className="text-[14px] font-medium">
          {uploading ? "Extracting text…" : hasCV ? "Replace CV" : "Upload your CV or resume"}
        </div>
        <div className="mt-1 text-[12px] text-[var(--muted-foreground)]">
          PDF or DOCX · up to 5 MB
        </div>
      </div>

      {/* Status row */}
      <div className="mt-3 flex items-center gap-2">
        {uploadError ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span className="text-[12px] text-[var(--bad)]">{uploadError}</span>
          </>
        ) : hasCV ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
            <span className="text-[12px] text-[var(--ok)] font-medium">CV ready</span>
            <span className="text-[12px] text-[var(--muted-foreground)]">· {wordCount?.toLocaleString()} words extracted</span>
          </>
        ) : (
          <span className="text-[12px] text-[var(--muted-foreground)]">
            Upload your CV — we extract text, then you can fill your profile from it.
          </span>
        )}
      </div>

      {/* Fill profile button — only shown once a CV is uploaded */}
      {hasCV && (
        <div className="mt-4 pt-4 border-t border-[var(--line-softer)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[13px] font-medium">Fill profile from CV</p>
              <p className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                Pulls work experience, education, skills and certifications out of your CV and populates the sections below.
              </p>
            </div>
            <button
              type="button"
              onClick={fillProfileFromCv}
              disabled={filling}
              className="shrink-0 flex items-center gap-1.5 rounded-lg border border-[var(--line-soft)] bg-[var(--surface-soft)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-50"
            >
              {filling ? (
                <>
                  <div className="h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
                  Filling…
                </>
              ) : (
                <>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 3c.3 3.5 3.5 6.5 7 7-3.5.3-6.7 3.5-7 7-.3-3.5-3.5-6.7-7-7 3.5-.3 6.7-3.5 7-7Z" />
                  </svg>
                  Fill profile
                </>
              )}
            </button>
          </div>

          {fillDone && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-[var(--ok-bg)] px-3 py-2">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
              <span className="text-[12px] text-[var(--ok)] font-medium">Profile filled — review and adjust the sections below.</span>
            </div>
          )}

          {fillError && (
            <div className="mt-3 rounded-lg border border-[var(--bad)] bg-[var(--bad-bg)] px-3 py-2 text-[12px] text-[var(--bad)]">
              {fillError}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

function ViewField({ label, value, className }: { label: string; value: string | null | undefined; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">{label}</div>
      <div className="text-[13.5px] capitalize">{value ?? <span className="text-[var(--muted-foreground)] normal-case italic">Not set</span>}</div>
    </div>
  );
}

// ─── 2. Contact & Links ───────────────────────────────────────────────────────

function ContactCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [full, setFull] = useState(p.full_name ?? "");
  const [middle, setMiddle] = useState((p as unknown as Record<string, string>).middle_name ?? "");
  const [phone, setPhone] = useState(p.phone ?? "");
  const [li, setLi] = useState(p.linkedin_url ?? "");
  const [gh, setGh] = useState(p.github_url ?? "");
  const [pf, setPf] = useState(p.portfolio_url ?? "");
  const { savedMsg, setSaved } = useSaveState(() => setEditing(false));

  async function save() {
    setBusy(true);
    try {
      const patch = {
        full_name: full || null,
        middle_name: middle || null,
        phone: phone || null,
        linkedin_url: li || null,
        github_url: gh || null,
        portfolio_url: pf || null,
      };
      await savePatch(patch);
      onSaved(patch as Partial<ProfileRow>);
      setSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!editing) {
    return (
      <Card id="contact" title="Contact & links" action={<LinkBtn onClick={() => setEditing(true)}>Edit</LinkBtn>}>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <ViewField label="Full name" value={p.full_name} />
          <ViewField label="Middle name" value={(p as unknown as Record<string, string>).middle_name} />
          <ViewField label="Email" value={p.email} />
          <ViewField label="Phone" value={p.phone} />
          <ViewField label="LinkedIn" value={p.linkedin_url} />
          <ViewField label="GitHub" value={p.github_url} />
          <ViewField label="Portfolio / website" value={p.portfolio_url} />
        </div>
      </Card>
    );
  }
  return (
    <Card id="contact" title="Contact & links">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name"><input className={inputCls} value={full} onChange={(e) => setFull(e.target.value)} /></Field>
        <Field label="Middle name (optional)" hint="Keka, Oracle, and some ATS require this"><input className={inputCls} value={middle} onChange={(e) => setMiddle(e.target.value)} placeholder="Middle name" /></Field>
        <Field label="Email" hint="Change in account settings"><input className={inputCls} value={p.email} disabled /></Field>
        <Field label="Phone" hint="Include country code, e.g. +91 9876543210">
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
        </Field>
        <Field label="LinkedIn URL"><input className={inputCls} value={li} onChange={(e) => setLi(e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
        <Field label="GitHub URL"><input className={inputCls} value={gh} onChange={(e) => setGh(e.target.value)} placeholder="https://github.com/…" /></Field>
        <Field label="Portfolio / website"><input className={inputCls} value={pf} onChange={(e) => setPf(e.target.value)} placeholder="https://…" /></Field>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
        <SaveStatus msg={savedMsg} />
      </div>
    </Card>
  );
}

// ─── 3. Address ───────────────────────────────────────────────────────────────

const COUNTRIES = [
  "India", "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Netherlands", "Ireland", "Singapore", "United Arab Emirates", "Japan",
  "Other",
];

const WORK_AUTH_OPTIONS = ["Unrestricted", "OPT/CPT", "H-1B", "Other"] as const;

function AddressCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const extra = p as unknown as Record<string, string | null>;
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState(p.country ?? "India");
  const [city, setCity] = useState(p.city ?? "");
  const [state, setState] = useState(p.state_province ?? "");
  const [zip, setZip] = useState(p.zip_postal ?? "");
  const [street, setStreet] = useState(p.street_address ?? "");
  const [nationality, setNationality] = useState(p.nationality ?? "Indian");
  const [dob, setDob] = useState(extra.dob ?? "");
  const [workAuth, setWorkAuth] = useState(extra.work_authorization ?? "");
  const [phoneCC, setPhoneCC] = useState(extra.phone_country_code ?? "+91");
  const { savedMsg, setSaved } = useSaveState(() => setEditing(false));

  async function save() {
    setBusy(true);
    try {
      const patch = {
        country: country || null,
        city: city || null,
        state_province: state || null,
        zip_postal: zip || null,
        street_address: street || null,
        nationality: nationality || null,
        dob: dob || null,
        work_authorization: workAuth || null,
        phone_country_code: phoneCC || "+91",
      };
      await savePatch(patch);
      onSaved(patch as Partial<ProfileRow>);
      setSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!editing) {
    return (
      <Card id="address" title="Address" subtitle="Some sites require full address — Workday, iCIMS, SAP" action={<LinkBtn onClick={() => setEditing(true)}>Edit</LinkBtn>}>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <ViewField label="Country" value={p.country} />
          <ViewField label="Nationality" value={p.nationality} />
          <ViewField label="State / province" value={p.state_province} />
          <ViewField label="City" value={p.city} />
          <ViewField label="ZIP / postal code" value={p.zip_postal} />
          <ViewField label="Street address" value={p.street_address} className="sm:col-span-2" />
          <ViewField label="Date of birth" value={extra.dob} />
          <ViewField label="Work authorization" value={extra.work_authorization} />
          <ViewField label="Phone country code" value={extra.phone_country_code} />
        </div>
      </Card>
    );
  }
  return (
    <Card id="address" title="Address">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Country">
          <select className={selectCls} value={country} onChange={(e) => setCountry(e.target.value)}>
            {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
        <Field label="Nationality">
          <input className={inputCls} value={nationality} onChange={(e) => setNationality(e.target.value)} placeholder="e.g. Indian" />
        </Field>
        <Field label="State / province">
          <input className={inputCls} value={state} onChange={(e) => setState(e.target.value)} placeholder="e.g. Karnataka" />
        </Field>
        <Field label="City">
          <input className={inputCls} value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bengaluru" />
        </Field>
        <Field label="ZIP / postal code">
          <input className={inputCls} value={zip} onChange={(e) => setZip(e.target.value)} placeholder="e.g. 560001" />
        </Field>
        <Field label="Street address" hint="Optional — required by some Workday gov instances">
          <input className={inputCls} value={street} onChange={(e) => setStreet(e.target.value)} />
        </Field>
        <Field label="Date of birth (optional)" hint="Used for age-gated ATS forms (Oracle, some Workday)">
          <input type="date" className={inputCls} value={dob} onChange={(e) => setDob(e.target.value)} />
        </Field>
        <Field label="Work authorization (optional)" hint="Ashby, Greenhouse international forms">
          <select className={selectCls} value={workAuth} onChange={(e) => setWorkAuth(e.target.value)}>
            <option value="">Not specified</option>
            {WORK_AUTH_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        </Field>
        <Field label="Phone country code" hint="TurboHire, MyNextHire store code separately">
          <input className={inputCls} value={phoneCC} onChange={(e) => setPhoneCC(e.target.value)} placeholder="+91" />
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
        <SaveStatus msg={savedMsg} />
      </div>
    </Card>
  );
}

// ─── 4. Work experience (list with add/edit/delete) ───────────────────────────

function ExperienceCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [entries, setEntries] = useState<WorkExperienceEntry[]>(p.work_experience ?? []);
  useEffect(() => { setEntries(p.work_experience ?? []); }, [p.work_experience]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<WorkExperienceEntry | null>(null);

  function openNew() {
    setDraft({ role: "", company: "", start: "", end: "", current: false, description: "" });
    setEditIdx(-1);
  }
  function openEdit(i: number) { setDraft({ ...entries[i] }); setEditIdx(i); }
  function cancel() { setDraft(null); setEditIdx(null); }
  const { savedMsg, setSaved } = useSaveState(cancel);

  async function saveDraft() {
    if (!draft?.role || !draft?.company) {
      alert("Role and company are required");
      return;
    }
    const next = editIdx === -1
      ? [draft, ...entries]
      : entries.map((e, i) => (i === editIdx ? draft : e));
    setBusy(true);
    try {
      await savePatch({ work_experience: next });
      setEntries(next);
      onSaved({ work_experience: next });
      setSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  async function remove(i: number) {
    if (!confirm("Delete this entry?")) return;
    const next = entries.filter((_, j) => j !== i);
    await savePatch({ work_experience: next });
    setEntries(next);
    onSaved({ work_experience: next });
  }

  return (
    <Card
      id="experience"
      title="Work experience"
      subtitle={entries.length === 0 ? "Used to fill Workday/Greenhouse work history modals" : undefined}
      action={editIdx === null && <LinkBtn onClick={openNew}>+ Add</LinkBtn>}
    >
      {editIdx !== null && draft && (
        <div className="mb-5 rounded-lg border border-[var(--accent)] bg-[var(--surface)] p-4">
          <div className="mb-3 text-[13px] font-semibold">{editIdx === -1 ? "Add experience" : "Edit experience"}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Role / job title">
              <input className={inputCls} value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })} />
            </Field>
            <Field label="Company">
              <input className={inputCls} value={draft.company} onChange={(e) => setDraft({ ...draft, company: e.target.value })} />
            </Field>
            <Field label="Start" hint="MM/YYYY or YYYY">
              <input className={inputCls} value={draft.start ?? ""} onChange={(e) => setDraft({ ...draft, start: e.target.value })} placeholder="06/2023" />
            </Field>
            <Field label="End" hint="Leave blank if current">
              <input className={inputCls} value={draft.end ?? ""} onChange={(e) => setDraft({ ...draft, end: e.target.value })} placeholder="Present" disabled={draft.current} />
            </Field>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-[13px]">
                <input type="checkbox" checked={draft.current ?? false} onChange={(e) => setDraft({ ...draft, current: e.target.checked, end: e.target.checked ? "Present" : "" })} />
                I currently work here
              </label>
            </div>
            <Field label="Location"><input className={inputCls} value={draft.location ?? ""} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder="Bengaluru, India" /></Field>
            <Field label="Employment type">
              <select className={selectCls} value={draft.employment_type ?? ""} onChange={(e) => setDraft({ ...draft, employment_type: (e.target.value || undefined) as WorkExperienceEntry["employment_type"] })}>
                <option value="">—</option>
                <option value="full_time">Full-time</option><option value="part_time">Part-time</option>
                <option value="contract">Contract</option><option value="internship">Internship</option>
                <option value="freelance">Freelance</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Description" hint="1–2 sentences. Used as default; tailored per-job at fill time.">
                <textarea className={textareaCls} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} />
              </Field>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <PrimaryBtn onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save entry"}</PrimaryBtn>
            <GhostBtn onClick={cancel} disabled={busy}>Cancel</GhostBtn>
            <SaveStatus msg={savedMsg} />
          </div>
        </div>
      )}

      {entries.length === 0 && editIdx === null && (
        <div className="text-center text-[13px] text-[var(--muted-foreground)] py-6">
          No work experience yet. <LinkBtn onClick={openNew}>+ Add your first job</LinkBtn>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {entries.map((e, i) => (
          <div key={i} className="rounded-lg border border-[var(--line-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold">{e.role}</div>
                <div className="text-[13px] text-[var(--muted-foreground)]">{e.company}{e.location ? ` · ${e.location}` : ""}</div>
                <div className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                  {e.start ?? "?"} – {e.current ? "Present" : (e.end ?? "?")}
                  {e.employment_type && ` · ${e.employment_type.replace("_", "-")}`}
                </div>
                {e.description && <div className="mt-2 text-[12.5px] leading-[1.55]">{e.description}</div>}
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openEdit(i)} className="text-[12px] text-[var(--accent)] hover:underline">Edit</button>
                <span className="text-[var(--muted-foreground)]">·</span>
                <button onClick={() => remove(i)} className="text-[12px] text-[var(--bad)] hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── 5. Education ─────────────────────────────────────────────────────────────

function EducationCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [entries, setEntries] = useState<EducationEntry[]>(p.education ?? []);
  useEffect(() => { setEntries(p.education ?? []); }, [p.education]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<EducationEntry | null>(null);

  function openNew() { setDraft({ degree: "", institution: "", field: "", start: "", end: "", grade: "" }); setEditIdx(-1); }
  function openEdit(i: number) { setDraft({ ...entries[i] }); setEditIdx(i); }
  function cancel() { setDraft(null); setEditIdx(null); }
  const { savedMsg, setSaved } = useSaveState(cancel);

  async function saveDraft() {
    if (!draft?.degree || !draft?.institution) { alert("Degree and institution are required"); return; }
    const next = editIdx === -1 ? [draft, ...entries] : entries.map((e, i) => (i === editIdx ? draft : e));
    setBusy(true);
    try {
      await savePatch({ education: next });
      setEntries(next); onSaved({ education: next }); setSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }
  async function remove(i: number) {
    if (!confirm("Delete this entry?")) return;
    const next = entries.filter((_, j) => j !== i);
    await savePatch({ education: next });
    setEntries(next); onSaved({ education: next });
  }

  return (
    <Card id="education" title="Education" action={editIdx === null && <LinkBtn onClick={openNew}>+ Add</LinkBtn>}>
      {editIdx !== null && draft && (
        <div className="mb-5 rounded-lg border border-[var(--accent)] bg-[var(--surface)] p-4">
          <div className="mb-3 text-[13px] font-semibold">{editIdx === -1 ? "Add education" : "Edit education"}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Degree"><input className={inputCls} value={draft.degree} onChange={(e) => setDraft({ ...draft, degree: e.target.value })} placeholder="B.Tech, M.Sc, Class XII, …" /></Field>
            <Field label="Institution"><input className={inputCls} value={draft.institution} onChange={(e) => setDraft({ ...draft, institution: e.target.value })} /></Field>
            <Field label="Field of study"><input className={inputCls} value={draft.field ?? ""} onChange={(e) => setDraft({ ...draft, field: e.target.value })} placeholder="Computer Science" /></Field>
            <Field label="Grade / CGPA / %"><input className={inputCls} value={draft.grade ?? ""} onChange={(e) => setDraft({ ...draft, grade: e.target.value })} placeholder="8.5 CGPA / 89.5%" /></Field>
            <Field label="Start year"><input className={inputCls} value={draft.start ?? ""} onChange={(e) => setDraft({ ...draft, start: e.target.value })} placeholder="2022" /></Field>
            <Field label="End year"><input className={inputCls} value={draft.end ?? ""} onChange={(e) => setDraft({ ...draft, end: e.target.value })} placeholder="2026 or Present" /></Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <PrimaryBtn onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save entry"}</PrimaryBtn>
            <GhostBtn onClick={cancel} disabled={busy}>Cancel</GhostBtn>
            <SaveStatus msg={savedMsg} />
          </div>
        </div>
      )}
      {entries.length === 0 && editIdx === null && (
        <div className="text-center text-[13px] text-[var(--muted-foreground)] py-6">
          No education yet. <LinkBtn onClick={openNew}>+ Add a degree</LinkBtn>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {entries.map((e, i) => (
          <div key={i} className="rounded-lg border border-[var(--line-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-[14px] font-semibold">{e.degree}{e.field ? ` · ${e.field}` : ""}</div>
                <div className="text-[13px] text-[var(--muted-foreground)]">{e.institution}</div>
                <div className="mt-0.5 text-[12px] text-[var(--muted-foreground)]">
                  {e.start ?? "?"} – {e.end ?? "?"}{e.grade ? ` · ${e.grade}` : ""}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openEdit(i)} className="text-[12px] text-[var(--accent)] hover:underline">Edit</button>
                <span className="text-[var(--muted-foreground)]">·</span>
                <button onClick={() => remove(i)} className="text-[12px] text-[var(--bad)] hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── 6. Skills ────────────────────────────────────────────────────────────────

const SKILL_SUGGESTIONS = [
  "Java","Python","JavaScript","TypeScript","React","Node.js","Next.js","Vue.js","Angular",
  "Go","Rust","C++","C#","Kotlin","Swift","Ruby","PHP","SQL","NoSQL","MongoDB","PostgreSQL",
  "Redis","AWS","GCP","Azure","Docker","Kubernetes","CI/CD","Git","REST","GraphQL","gRPC",
  "Linux","Bash","HTML","CSS","Tailwind CSS","Express","NestJS","Django","Flask","FastAPI",
  "Spring Boot","Microservices","Machine Learning","Deep Learning","NLP","Computer Vision",
  "PyTorch","TensorFlow","Pandas","NumPy","Data Structures","Algorithms","System Design",
];

function SkillsCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [skills, setSkills] = useState<string[]>(p.skills ?? []);
  const { savedMsg, setSaved } = useSaveState(() => setEditing(false));
  useEffect(() => { setSkills(p.skills ?? []); }, [p.skills]);

  async function save() {
    setBusy(true);
    try { await savePatch({ skills }); onSaved({ skills }); setSaved(); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!editing) {
    return (
      <Card id="skills" title="Key skills" action={<LinkBtn onClick={() => setEditing(true)}>Edit</LinkBtn>}>
        {(p.skills ?? []).length === 0 ? (
          <div className="text-[13px] text-[var(--muted-foreground)]">No skills added.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(p.skills ?? []).map((s, i) => (
              <span key={i} className="rounded-full border border-[var(--line-soft)] bg-[var(--background)] px-3 py-1 text-[12px]">{s}</span>
            ))}
          </div>
        )}
      </Card>
    );
  }
  return (
    <Card id="skills" title="Key skills" subtitle="Used to fill skills ng-select fields and pick relevant items per JD">
      <TagInput tags={skills} onChange={setSkills} suggestions={SKILL_SUGGESTIONS} placeholder="Add a skill and press Enter…" />
      <div className="mt-4 flex items-center gap-3">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
        <SaveStatus msg={savedMsg} />
      </div>
    </Card>
  );
}

// ─── 8. Projects ──────────────────────────────────────────────────────────────

function ProjectsCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [entries, setEntries] = useState<ProjectEntry[]>(p.projects ?? []);
  useEffect(() => { setEntries(p.projects ?? []); }, [p.projects]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ProjectEntry | null>(null);

  function openNew() { setDraft({ title: "", description: "", tech: [], url: "" }); setEditIdx(-1); }
  function openEdit(i: number) { setDraft({ ...entries[i], tech: entries[i].tech ?? [] }); setEditIdx(i); }
  function cancel() { setDraft(null); setEditIdx(null); }
  const { savedMsg, setSaved } = useSaveState(cancel);

  async function saveDraft() {
    if (!draft?.title) { alert("Title is required"); return; }
    const next = editIdx === -1 ? [draft, ...entries] : entries.map((e, i) => (i === editIdx ? draft : e));
    setBusy(true);
    try {
      await savePatch({ projects: next });
      setEntries(next); onSaved({ projects: next }); setSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }
  async function remove(i: number) {
    if (!confirm("Delete this project?")) return;
    const next = entries.filter((_, j) => j !== i);
    await savePatch({ projects: next });
    setEntries(next); onSaved({ projects: next });
  }

  return (
    <Card id="projects" title="Projects" action={editIdx === null && <LinkBtn onClick={openNew}>+ Add</LinkBtn>}>
      {editIdx !== null && draft && (
        <div className="mb-5 rounded-lg border border-[var(--accent)] bg-[var(--surface)] p-4">
          <div className="mb-3 text-[13px] font-semibold">{editIdx === -1 ? "Add project" : "Edit project"}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title"><input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} /></Field>
            <Field label="URL"><input className={inputCls} value={draft.url ?? ""} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://github.com/…" /></Field>
            <div className="sm:col-span-2">
              <Field label="Tech stack"><TagInput tags={draft.tech ?? []} onChange={(t) => setDraft({ ...draft, tech: t })} suggestions={SKILL_SUGGESTIONS} placeholder="Add tech…" /></Field>
            </div>
            <div className="sm:col-span-2">
              <Field label="Description"><textarea className={textareaCls} value={draft.description ?? ""} onChange={(e) => setDraft({ ...draft, description: e.target.value })} rows={3} /></Field>
            </div>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <PrimaryBtn onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
            <GhostBtn onClick={cancel} disabled={busy}>Cancel</GhostBtn>
            <SaveStatus msg={savedMsg} />
          </div>
        </div>
      )}
      {entries.length === 0 && editIdx === null && (
        <div className="text-center text-[13px] text-[var(--muted-foreground)] py-6">
          No projects yet. <LinkBtn onClick={openNew}>+ Add one</LinkBtn>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {entries.map((e, i) => (
          <div key={i} className="rounded-lg border border-[var(--line-soft)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[14px] font-semibold">{e.title}</div>
                {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-[12px] text-[var(--accent)] hover:underline">{e.url}</a>}
                {e.description && <div className="mt-1 text-[12.5px] leading-[1.55]">{e.description}</div>}
                {e.tech && e.tech.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.tech.map((t, j) => <span key={j} className="rounded border border-[var(--line-soft)] bg-[var(--background)] px-1.5 py-0.5 text-[11px]">{t}</span>)}
                  </div>
                )}
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => openEdit(i)} className="text-[12px] text-[var(--accent)] hover:underline">Edit</button>
                <span className="text-[var(--muted-foreground)]">·</span>
                <button onClick={() => remove(i)} className="text-[12px] text-[var(--bad)] hover:underline">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── 9. Certifications ────────────────────────────────────────────────────────

function CertificationsCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [entries, setEntries] = useState<CertificationEntry[]>(p.certifications ?? []);
  useEffect(() => { setEntries(p.certifications ?? []); }, [p.certifications]);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<CertificationEntry | null>(null);

  function openNew() { setDraft({ title: "", issuer: "", year: "", url: "" }); setEditIdx(-1); }
  function openEdit(i: number) { setDraft({ ...entries[i] }); setEditIdx(i); }
  function cancel() { setDraft(null); setEditIdx(null); }
  const { savedMsg, setSaved } = useSaveState(cancel);

  async function saveDraft() {
    if (!draft?.title) { alert("Title is required"); return; }
    const next = editIdx === -1 ? [draft, ...entries] : entries.map((e, i) => (i === editIdx ? draft : e));
    setBusy(true);
    try {
      await savePatch({ certifications: next });
      setEntries(next); onSaved({ certifications: next }); setSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }
  async function remove(i: number) {
    if (!confirm("Delete this certification?")) return;
    const next = entries.filter((_, j) => j !== i);
    await savePatch({ certifications: next });
    setEntries(next); onSaved({ certifications: next });
  }

  return (
    <Card id="certifications" title="Certifications" action={editIdx === null && <LinkBtn onClick={openNew}>+ Add</LinkBtn>}>
      {editIdx !== null && draft && (
        <div className="mb-5 rounded-lg border border-[var(--accent)] bg-[var(--surface)] p-4">
          <div className="mb-3 text-[13px] font-semibold">{editIdx === -1 ? "Add certification" : "Edit certification"}</div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Title"><input className={inputCls} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder="AWS Solutions Architect" /></Field>
            <Field label="Issuer"><input className={inputCls} value={draft.issuer ?? ""} onChange={(e) => setDraft({ ...draft, issuer: e.target.value })} placeholder="Amazon Web Services" /></Field>
            <Field label="Year"><input className={inputCls} value={draft.year ?? ""} onChange={(e) => setDraft({ ...draft, year: e.target.value })} placeholder="2024" /></Field>
            <Field label="Credential URL"><input className={inputCls} value={draft.url ?? ""} onChange={(e) => setDraft({ ...draft, url: e.target.value })} placeholder="https://…" /></Field>
          </div>
          <div className="mt-4 flex items-center gap-3">
            <PrimaryBtn onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
            <GhostBtn onClick={cancel} disabled={busy}>Cancel</GhostBtn>
            <SaveStatus msg={savedMsg} />
          </div>
        </div>
      )}
      {entries.length === 0 && editIdx === null && (
        <div className="text-center text-[13px] text-[var(--muted-foreground)] py-6">
          No certifications yet. <LinkBtn onClick={openNew}>+ Add one</LinkBtn>
        </div>
      )}
      <div className="flex flex-col gap-3">
        {entries.map((e, i) => (
          <div key={i} className="rounded-lg border border-[var(--line-soft)] p-4 flex items-start justify-between gap-3">
            <div>
              <div className="text-[14px] font-semibold">{e.title}</div>
              <div className="text-[12.5px] text-[var(--muted-foreground)]">{[e.issuer, e.year].filter(Boolean).join(" · ")}</div>
              {e.url && <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-[11.5px] text-[var(--accent)] hover:underline">{e.url}</a>}
            </div>
            <div className="flex shrink-0 gap-1">
              <button onClick={() => openEdit(i)} className="text-[12px] text-[var(--accent)] hover:underline">Edit</button>
              <span className="text-[var(--muted-foreground)]">·</span>
              <button onClick={() => remove(i)} className="text-[12px] text-[var(--bad)] hover:underline">Delete</button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ─── 10. Demographics (EEO) ──────────────────────────────────────────────────

function DemographicsCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [gender, setGender] = useState(p.gender ?? "");
  const [pronouns, setPronouns] = useState(p.pronouns ?? "");
  const [race, setRace] = useState(p.race_ethnicity ?? "");
  const [veteran, setVeteran] = useState(p.veteran_status ?? "");
  const [disability, setDisability] = useState(p.disability_status ?? "");

  const { savedMsg, setSaved } = useSaveState(() => setEditing(false));

  async function save() {
    setBusy(true);
    try {
      const patch = {
        gender: gender || null,
        pronouns: pronouns || null,
        race_ethnicity: race || null,
        veteran_status: veteran || null,
        disability_status: disability || null,
      };
      await savePatch(patch);
      onSaved(patch as Partial<ProfileRow>);
      setSaved();
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!editing) {
    return (
      <Card
        id="demographics"
        title="Demographics (optional)"
        subtitle="Only used for EEO sections (Greenhouse, Workday Self-Identify). Defaults to 'Prefer not to answer' when blank."
        action={<LinkBtn onClick={() => setEditing(true)}>Edit</LinkBtn>}
      >
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <ViewField label="Gender" value={p.gender?.replace(/_/g, " ")} />
          <ViewField label="Pronouns" value={p.pronouns?.replace(/_/g, "/")} />
          <ViewField label="Race / ethnicity" value={p.race_ethnicity} />
          <ViewField label="Veteran status" value={p.veteran_status?.replace(/_/g, " ")} />
          <ViewField label="Disability status" value={p.disability_status?.replace(/_/g, " ")} />
        </div>
      </Card>
    );
  }
  return (
    <Card id="demographics" title="Demographics (optional)" subtitle="🔒 Used only for EEO autofill. Leave blank to default to 'Prefer not to answer'.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Gender">
          <select className={selectCls} value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Prefer not to answer</option>
            <option value="male">Male</option><option value="female">Female</option>
            <option value="non_binary">Non-binary</option>
            <option value="prefer_not_to_say">Prefer not to say (explicit)</option>
          </select>
        </Field>
        <Field label="Pronouns">
          <select className={selectCls} value={pronouns} onChange={(e) => setPronouns(e.target.value)}>
            <option value="">—</option>
            <option value="he_him">He / Him</option><option value="she_her">She / Her</option>
            <option value="they_them">They / Them</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </Field>
        <Field label="Race / ethnicity" hint="Free text; matched against options at fill time">
          <input className={inputCls} value={race} onChange={(e) => setRace(e.target.value)} placeholder="e.g. Asian" />
        </Field>
        <Field label="Veteran status">
          <select className={selectCls} value={veteran} onChange={(e) => setVeteran(e.target.value)}>
            <option value="">—</option>
            <option value="not_veteran">Not a protected veteran</option>
            <option value="protected_veteran">Protected veteran</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </Field>
        <Field label="Disability status">
          <select className={selectCls} value={disability} onChange={(e) => setDisability(e.target.value)}>
            <option value="">—</option>
            <option value="no">No, I don&apos;t have a disability</option>
            <option value="yes">Yes, I have a disability</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
        <SaveStatus msg={savedMsg} />
      </div>
    </Card>
  );
}

// ============================================================================
// MAIN PAGE
// ============================================================================

export function ProfilePageContent({ profile: initial }: { profile: ProfileRow }) {
  const [profile, setProfile] = useState<ProfileRow>(initial);
  const completion = useMemo(() => computeCompletion(profile), [profile]);

  const handleSaved = useCallback((patch: Partial<ProfileRow>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-[22px] font-semibold">Application Profile</h1>
        <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
          One profile. Every job site. Fill any application in one click.
        </p>
      </header>

      <div className="flex gap-8">
        <ProfileSidebar profile={profile} completion={completion} />
        <main className="flex-1 min-w-0 flex flex-col gap-5">
          <CVCard             p={profile} onSaved={handleSaved} onImport={handleSaved} />
          <ContactCard        p={profile} onSaved={handleSaved} />
          <PreferencesCard    p={profile} onSaved={handleSaved} />
          <JobTargetsCard     p={profile} onSaved={handleSaved} />
          <CompensationCard   p={profile} onSaved={handleSaved} />
          <ExperienceCard     p={profile} onSaved={handleSaved} />
          <EducationCard      p={profile} onSaved={handleSaved} />
          <SkillsCard         p={profile} onSaved={handleSaved} />
          <ProjectsCard       p={profile} onSaved={handleSaved} />
          <CertificationsCard p={profile} onSaved={handleSaved} />
          <AddressCard        p={profile} onSaved={handleSaved} />
          <DemographicsCard   p={profile} onSaved={handleSaved} />
        </main>
      </div>

    </div>
  );
}
