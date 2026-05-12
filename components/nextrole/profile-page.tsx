"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type {
  ProfileRow,
  WorkExperienceEntry,
  EducationEntry,
  CertificationEntry,
  ProjectEntry,
} from "@/lib/db/types";

// ─── Style tokens (match settings-page.tsx) ───────────────────────────────────

const inputCls    = "w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[13px] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)]";
const selectCls   = "w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--accent)]";
const textareaCls = "w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[13px] leading-[1.6] outline-none placeholder:text-[var(--muted-foreground)] focus:border-[var(--accent)] min-h-[80px]";

// ─── Section registry — drives the sidebar nav and the cards ──────────────────

type SectionId =
  | "preferences" | "contact" | "address" | "experience" | "education"
  | "skills" | "languages" | "projects" | "certifications" | "demographics"
  | "resume" | "cover_letter" | "summary";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "preferences",     label: "Career preferences" },
  { id: "contact",         label: "Contact & links" },
  { id: "address",         label: "Address" },
  { id: "experience",      label: "Work experience" },
  { id: "education",       label: "Education" },
  { id: "skills",          label: "Key skills" },
  { id: "languages",       label: "Languages" },
  { id: "projects",        label: "Projects" },
  { id: "certifications",  label: "Certifications" },
  { id: "demographics",    label: "Demographics" },
  { id: "summary",         label: "Profile summary" },
  { id: "resume",          label: "Resume files" },
  { id: "cover_letter",    label: "Cover letters" },
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
  id: SectionId; title: string; subtitle?: string;
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
    <aside className="sticky top-20 hidden h-fit w-[220px] shrink-0 lg:block">
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

// ─── 1. Career Preferences ────────────────────────────────────────────────────

function PreferencesCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy]       = useState(false);
  const [workMode, setWorkMode] = useState(p.work_mode ?? "");
  const [seniority, setSeniority] = useState(p.seniority ?? "");
  const [yearsExp, setYearsExp] = useState(p.years_experience?.toString() ?? "");
  const [compMin, setCompMin] = useState(p.comp_min?.toString() ?? "");
  const [compMax, setCompMax] = useState(p.comp_max?.toString() ?? "");
  const [notice, setNotice] = useState(p.notice_period ?? "");
  const [relocate, setRelocate] = useState(p.willing_to_relocate ?? true);
  const [sponsor, setSponsor] = useState(p.sponsorship_needed ?? false);
  const [roles, setRoles] = useState<string[]>(p.target_roles ?? []);
  const [locations, setLocations] = useState<string[]>(p.target_locations ?? []);

  async function save() {
    setBusy(true);
    try {
      const patch = {
        work_mode: workMode || null,
        seniority: seniority || null,
        years_experience: yearsExp ? Number(yearsExp) : null,
        comp_min: compMin ? Number(compMin) : null,
        comp_max: compMax ? Number(compMax) : null,
        notice_period: notice || null,
        willing_to_relocate: relocate,
        sponsorship_needed: sponsor,
        target_roles: roles,
        target_locations: locations,
      };
      await savePatch(patch);
      onSaved(patch as Partial<ProfileRow>);
      setEditing(false);
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!editing) {
    return (
      <Card id="preferences" title="Career preferences" action={<LinkBtn onClick={() => setEditing(true)}>Edit</LinkBtn>}>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <ViewField label="Work mode" value={p.work_mode} />
          <ViewField label="Seniority" value={p.seniority} />
          <ViewField label="Years of experience" value={p.years_experience?.toString()} />
          <ViewField label="Expected salary" value={p.comp_min ? `${p.comp_min}${p.comp_max ? ` – ${p.comp_max}` : ""}` : null} />
          <ViewField label="Notice period" value={p.notice_period?.replace(/_/g, " ")} />
          <ViewField label="Willing to relocate" value={p.willing_to_relocate === true ? "Yes" : p.willing_to_relocate === false ? "No" : null} />
          <ViewField label="Visa sponsorship needed" value={p.sponsorship_needed === true ? "Yes" : p.sponsorship_needed === false ? "No" : null} />
          <ViewField label="Target roles" value={(p.target_roles ?? []).join(", ") || null} />
          <ViewField label="Preferred locations" value={(p.target_locations ?? []).join(", ") || null} className="sm:col-span-2" />
        </div>
      </Card>
    );
  }

  return (
    <Card id="preferences" title="Career preferences" subtitle="Used for fill suggestions on every application">
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
        <Field label="Expected salary (min)" hint="Currency-free number, e.g. 1500000 for 15 LPA">
          <input className={inputCls} type="number" min={0} value={compMin} onChange={(e) => setCompMin(e.target.value)} />
        </Field>
        <Field label="Expected salary (max)">
          <input className={inputCls} type="number" min={0} value={compMax} onChange={(e) => setCompMax(e.target.value)} />
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
        <div className="sm:col-span-2">
          <Field label="Target roles">
            <TagInput tags={roles} onChange={setRoles} placeholder="Add target role…" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Preferred locations">
            <TagInput tags={locations} onChange={setLocations} placeholder="Add city or 'Remote'…" />
          </Field>
        </div>
      </div>
      <div className="mt-5 flex gap-2">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
      </div>
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
  const [phone, setPhone] = useState(p.phone ?? "");
  const [li, setLi] = useState(p.linkedin_url ?? "");
  const [gh, setGh] = useState(p.github_url ?? "");
  const [pf, setPf] = useState(p.portfolio_url ?? "");

  async function save() {
    setBusy(true);
    try {
      const patch = {
        full_name: full || null,
        phone: phone || null,
        linkedin_url: li || null,
        github_url: gh || null,
        portfolio_url: pf || null,
      };
      await savePatch(patch);
      onSaved(patch as Partial<ProfileRow>);
      setEditing(false);
    } catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!editing) {
    return (
      <Card id="contact" title="Contact & links" action={<LinkBtn onClick={() => setEditing(true)}>Edit</LinkBtn>}>
        <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <ViewField label="Full name" value={p.full_name} />
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
        <Field label="Email" hint="Change in account settings"><input className={inputCls} value={p.email} disabled /></Field>
        <Field label="Phone" hint="Include country code, e.g. +91 9876543210">
          <input className={inputCls} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91 …" />
        </Field>
        <Field label="LinkedIn URL"><input className={inputCls} value={li} onChange={(e) => setLi(e.target.value)} placeholder="https://linkedin.com/in/…" /></Field>
        <Field label="GitHub URL"><input className={inputCls} value={gh} onChange={(e) => setGh(e.target.value)} placeholder="https://github.com/…" /></Field>
        <Field label="Portfolio / website"><input className={inputCls} value={pf} onChange={(e) => setPf(e.target.value)} placeholder="https://…" /></Field>
      </div>
      <div className="mt-5 flex gap-2">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
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

function AddressCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [country, setCountry] = useState(p.country ?? "India");
  const [city, setCity] = useState(p.city ?? "");
  const [state, setState] = useState(p.state_province ?? "");
  const [zip, setZip] = useState(p.zip_postal ?? "");
  const [street, setStreet] = useState(p.street_address ?? "");
  const [nationality, setNationality] = useState(p.nationality ?? "Indian");

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
      };
      await savePatch(patch);
      onSaved(patch as Partial<ProfileRow>);
      setEditing(false);
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
      </div>
      <div className="mt-5 flex gap-2">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
      </div>
    </Card>
  );
}

// ─── 4. Work experience (list with add/edit/delete) ───────────────────────────

function ExperienceCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [entries, setEntries] = useState<WorkExperienceEntry[]>(p.work_experience ?? []);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<WorkExperienceEntry | null>(null);

  function openNew() {
    setDraft({ role: "", company: "", start: "", end: "", current: false, description: "" });
    setEditIdx(-1);
  }
  function openEdit(i: number) { setDraft({ ...entries[i] }); setEditIdx(i); }
  function cancel() { setDraft(null); setEditIdx(null); }

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
      cancel();
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
          <div className="mt-4 flex gap-2">
            <PrimaryBtn onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save entry"}</PrimaryBtn>
            <GhostBtn onClick={cancel} disabled={busy}>Cancel</GhostBtn>
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
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<EducationEntry | null>(null);

  function openNew() { setDraft({ degree: "", institution: "", field: "", start: "", end: "", grade: "" }); setEditIdx(-1); }
  function openEdit(i: number) { setDraft({ ...entries[i] }); setEditIdx(i); }
  function cancel() { setDraft(null); setEditIdx(null); }

  async function saveDraft() {
    if (!draft?.degree || !draft?.institution) { alert("Degree and institution are required"); return; }
    const next = editIdx === -1 ? [draft, ...entries] : entries.map((e, i) => (i === editIdx ? draft : e));
    setBusy(true);
    try {
      await savePatch({ education: next });
      setEntries(next); onSaved({ education: next }); cancel();
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
          <div className="mt-4 flex gap-2">
            <PrimaryBtn onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save entry"}</PrimaryBtn>
            <GhostBtn onClick={cancel} disabled={busy}>Cancel</GhostBtn>
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

  async function save() {
    setBusy(true);
    try { await savePatch({ skills }); onSaved({ skills }); setEditing(false); }
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
      <div className="mt-4 flex gap-2">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
      </div>
    </Card>
  );
}

// ─── 7. Languages ─────────────────────────────────────────────────────────────

function LanguagesCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [langs, setLangs] = useState<string[]>(p.languages ?? []);

  async function save() {
    setBusy(true);
    try { await savePatch({ languages: langs }); onSaved({ languages: langs }); setEditing(false); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  if (!editing) {
    return (
      <Card id="languages" title="Languages" action={<LinkBtn onClick={() => setEditing(true)}>Edit</LinkBtn>}>
        {(p.languages ?? []).length === 0 ? (
          <div className="text-[13px] text-[var(--muted-foreground)]">No languages added.</div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {(p.languages ?? []).map((s, i) => (
              <span key={i} className="rounded-full border border-[var(--line-soft)] bg-[var(--background)] px-3 py-1 text-[12px]">{s}</span>
            ))}
          </div>
        )}
      </Card>
    );
  }
  return (
    <Card id="languages" title="Languages">
      <TagInput tags={langs} onChange={setLangs} placeholder="English, Hindi, …" />
      <div className="mt-4 flex gap-2">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
      </div>
    </Card>
  );
}

// ─── 8. Projects ──────────────────────────────────────────────────────────────

function ProjectsCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [entries, setEntries] = useState<ProjectEntry[]>(p.projects ?? []);
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<ProjectEntry | null>(null);

  function openNew() { setDraft({ title: "", description: "", tech: [], url: "" }); setEditIdx(-1); }
  function openEdit(i: number) { setDraft({ ...entries[i], tech: entries[i].tech ?? [] }); setEditIdx(i); }
  function cancel() { setDraft(null); setEditIdx(null); }

  async function saveDraft() {
    if (!draft?.title) { alert("Title is required"); return; }
    const next = editIdx === -1 ? [draft, ...entries] : entries.map((e, i) => (i === editIdx ? draft : e));
    setBusy(true);
    try {
      await savePatch({ projects: next });
      setEntries(next); onSaved({ projects: next }); cancel();
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
          <div className="mt-4 flex gap-2">
            <PrimaryBtn onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
            <GhostBtn onClick={cancel} disabled={busy}>Cancel</GhostBtn>
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
  const [editIdx, setEditIdx] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState<CertificationEntry | null>(null);

  function openNew() { setDraft({ title: "", issuer: "", year: "", url: "" }); setEditIdx(-1); }
  function openEdit(i: number) { setDraft({ ...entries[i] }); setEditIdx(i); }
  function cancel() { setDraft(null); setEditIdx(null); }

  async function saveDraft() {
    if (!draft?.title) { alert("Title is required"); return; }
    const next = editIdx === -1 ? [draft, ...entries] : entries.map((e, i) => (i === editIdx ? draft : e));
    setBusy(true);
    try {
      await savePatch({ certifications: next });
      setEntries(next); onSaved({ certifications: next }); cancel();
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
          <div className="mt-4 flex gap-2">
            <PrimaryBtn onClick={saveDraft} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
            <GhostBtn onClick={cancel} disabled={busy}>Cancel</GhostBtn>
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
      setEditing(false);
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
      <div className="mt-5 flex gap-2">
        <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
        <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
      </div>
    </Card>
  );
}

// ─── 11. Profile summary (long-form CV) ──────────────────────────────────────

function SummaryCard({ p, onSaved }: { p: ProfileRow; onSaved: (next: Partial<ProfileRow>) => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [cv, setCv] = useState(p.base_cv ?? "");

  async function save() {
    setBusy(true);
    try { await savePatch({ base_cv: cv }); onSaved({ base_cv: cv }); setEditing(false); }
    catch (e) { alert((e as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <Card
      id="summary"
      title="Profile summary"
      subtitle="Your full CV text. Used as the AI knowledge base for tailoring cover letters and freeform answers."
      action={!editing && <LinkBtn onClick={() => setEditing(true)}>Edit</LinkBtn>}
    >
      {editing ? (
        <>
          <textarea
            className={textareaCls}
            value={cv} onChange={(e) => setCv(e.target.value)}
            rows={14}
            placeholder="Paste your full CV here…"
          />
          <div className="mt-4 flex gap-2">
            <PrimaryBtn onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</PrimaryBtn>
            <GhostBtn onClick={() => setEditing(false)} disabled={busy}>Cancel</GhostBtn>
          </div>
        </>
      ) : (
        <div className="text-[13px] leading-[1.6] whitespace-pre-wrap text-[var(--foreground)]">
          {p.base_cv?.trim() ? p.base_cv : <span className="text-[var(--muted-foreground)] italic">No CV text yet — paste your full resume to power AI tailoring.</span>}
        </div>
      )}
    </Card>
  );
}

// ─── 12. Resume / Cover-letter file uploads ──────────────────────────────────

type ProfileFile = {
  id: string;
  kind: "resume" | "cover_letter";
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  is_default: boolean;
  created_at: string;
};

function fmtBytes(n: number | null): string {
  if (!n) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}

function FileUploadCard({
  id, title, subtitle, kind, accept,
}: {
  id: SectionId;
  title: string;
  subtitle: string;
  kind: "resume" | "cover_letter";
  accept: string;
}) {
  const [files, setFiles] = useState<ProfileFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const visible = useMemo(() => files.filter((f) => f.kind === kind), [files, kind]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/profile/files");
      if (!res.ok) throw new Error("Failed to load files");
      const j = (await res.json()) as { files: ProfileFile[] };
      setFiles(j.files ?? []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

  async function uploadFiles(fileList: FileList | File[]) {
    const arr = Array.from(fileList);
    if (arr.length === 0) return;

    setUploading(true);
    try {
      for (const file of arr) {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", kind);
        // First upload of a kind → mark as default automatically
        if (visible.length === 0) form.append("is_default", "true");
        const res = await fetch("/api/profile/files", { method: "POST", body: form });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error ?? `Upload failed (${res.status})`);
        }
      }
      await refresh();
    } catch (e) { alert((e as Error).message); }
    finally { setUploading(false); }
  }

  async function setDefault(fileId: string) {
    try {
      const res = await fetch(`/api/profile/files/${fileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_default: true }),
      });
      if (!res.ok) throw new Error("Failed to set default");
      // Optimistic: update local state immediately
      setFiles((prev) => prev.map((f) => ({
        ...f,
        is_default: f.kind === kind ? f.id === fileId : f.is_default,
      })));
    } catch (e) { alert((e as Error).message); }
  }

  async function remove(fileId: string) {
    if (!confirm("Delete this file?")) return;
    try {
      const res = await fetch(`/api/profile/files/${fileId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (e) { alert((e as Error).message); }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files?.length) void uploadFiles(e.dataTransfer.files);
  }

  return (
    <Card id={id} title={title} subtitle={subtitle}>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${
          dragging
            ? "border-[var(--accent)] bg-[var(--surface-soft)]"
            : "border-[var(--line-soft)] hover:bg-[var(--surface-soft)]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          multiple={false}
          onChange={(e) => {
            if (e.target.files?.length) void uploadFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <div className="text-[14px] font-medium">
          {uploading ? "Uploading…" : `Drop a ${kind === "resume" ? "resume" : "cover letter"} here`}
        </div>
        <div className="mt-1 text-[12px] text-[var(--muted-foreground)]">
          or click to browse · PDF, DOC, DOCX up to 5 MB
        </div>
      </div>

      {loading ? (
        <div className="mt-4 text-center text-[12.5px] text-[var(--muted-foreground)]">
          Loading…
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-4 text-center text-[12.5px] text-[var(--muted-foreground)]">
          No {kind === "resume" ? "resumes" : "cover letters"} uploaded yet.
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {visible.map((f) => (
            <li
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-[var(--line-soft)] bg-[var(--background)] px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-[13px] font-medium">{f.file_name}</span>
                  {f.is_default && (
                    <span className="shrink-0 rounded-[4px] bg-[var(--accent)] px-1.5 py-0.5 text-[9.5px] font-semibold uppercase tracking-wider text-white">
                      Default
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[var(--muted-foreground)]">
                  {fmtBytes(f.file_size)} · {new Date(f.created_at).toLocaleDateString()}
                </div>
              </div>
              <div className="flex shrink-0 gap-3">
                {!f.is_default && (
                  <button onClick={() => setDefault(f.id)} className="text-[12px] text-[var(--accent)] hover:underline">
                    Set as default
                  </button>
                )}
                <button onClick={() => remove(f.id)} className="text-[12px] text-[var(--bad)] hover:underline">
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const FILE_ACCEPT = ".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";

function ResumeCard() {
  return (
    <FileUploadCard
      id="resume"
      title="Resume / CV files"
      subtitle="The extension auto-uploads your default resume to job application file inputs."
      kind="resume"
      accept={FILE_ACCEPT}
    />
  );
}

function CoverLetterCard() {
  return (
    <FileUploadCard
      id="cover_letter"
      title="Cover letter files"
      subtitle="Used when a job form has a cover-letter file input. AI-generated tailoring coming next."
      kind="cover_letter"
      accept={FILE_ACCEPT}
    />
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

  const [importing, setImporting] = useState(false);
  async function importFromCv() {
    if (!profile.base_cv?.trim()) {
      alert("Paste your CV in the 'Profile summary' section first.");
      return;
    }
    if (!confirm("Import work experience, education and certifications from your CV?\n\nThis will REPLACE current entries.")) return;
    setImporting(true);
    try {
      const res = await fetch("/api/extension/cv-structure-import", { method: "POST" });
      if (!res.ok) throw new Error((await res.json()).error ?? "Import failed");
      const data = await res.json() as Partial<ProfileRow>;
      setProfile((prev) => ({ ...prev, ...data }));
      alert("Imported! Review and adjust the new entries.");
    } catch (e) { alert((e as Error).message); }
    finally { setImporting(false); }
  }

  const hasCvText  = !!profile.base_cv?.trim();
  const importCardVisible = completion.percent < 60;

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[22px] font-semibold">Application Profile</h1>
          <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
            One profile. Every job site. Fill any application in one click.
          </p>
        </div>
        <GhostBtn onClick={importFromCv} disabled={importing || !hasCvText}>
          {importing ? "Importing…" : "📥 Re-import from CV"}
        </GhostBtn>
      </header>

      {importCardVisible && (
        <div className="mb-6 rounded-xl border border-[var(--accent)] bg-[var(--accent)]/[0.06] p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-[15px] font-semibold">
                📄 Quick start: import from your CV
              </div>
              <p className="mt-1 text-[13px] text-[var(--muted-foreground)]">
                {hasCvText
                  ? "We'll parse the CV you pasted during onboarding and pre-fill every section below. You can edit anything afterward."
                  : "Paste your CV text into the 'Profile summary' section below, then come back here to auto-fill the rest."}
              </p>
            </div>
            <PrimaryBtn onClick={importFromCv} disabled={importing || !hasCvText}>
              {importing ? "Parsing…" : "Parse & fill profile"}
            </PrimaryBtn>
          </div>
        </div>
      )}

      <div className="flex gap-8">
        <ProfileSidebar profile={profile} completion={completion} />
        <main className="flex-1 min-w-0 flex flex-col gap-5">
          <PreferencesCard    p={profile} onSaved={handleSaved} />
          <ContactCard        p={profile} onSaved={handleSaved} />
          <AddressCard        p={profile} onSaved={handleSaved} />
          <ExperienceCard     p={profile} onSaved={handleSaved} />
          <EducationCard      p={profile} onSaved={handleSaved} />
          <SkillsCard         p={profile} onSaved={handleSaved} />
          <LanguagesCard      p={profile} onSaved={handleSaved} />
          <ProjectsCard       p={profile} onSaved={handleSaved} />
          <CertificationsCard p={profile} onSaved={handleSaved} />
          <DemographicsCard   p={profile} onSaved={handleSaved} />
          <SummaryCard        p={profile} onSaved={handleSaved} />
          <ResumeCard />
          <CoverLetterCard />
        </main>
      </div>
    </div>
  );
}
