"use client";

import type React from "react";
import { useState, useTransition, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { batchDeleteResumes, updateResume } from "@/app/actions/resumes";
import { Badge } from "@/components/nextrole/ui";
import type { ResumeRow, JobRow, UserTier } from "@/lib/db/types";
import type { ResumeData, ResumeExperience, ResumeEducation, ResumeCertification, ResumeProject } from "@/lib/resume/template";

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

// ── Resume panel (preview + edit) ────────────────────────────────────────────

const inputCls = "w-full rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2 text-[12px] text-[var(--foreground)] outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)] transition-colors";
const labelCls = "block text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)] mb-1.5";

function Lbl({ children }: { children: React.ReactNode }) {
  return <label className={labelCls}>{children}</label>;
}

function ResumeEditor({
  resume,
  onSaved,
}: {
  resume: ResumeWithJob;
  onSaved: (content: string, html: string) => void;
}) {
  const parsed = parseResumeData(resume.content);
  const [draft, setDraft] = useState<ResumeData>(parsed ?? {
    name: "", contact: {}, summary: "", competencies: [], experience: [],
    skills: [], education: [], certifications: [], projects: [], coverage: 0,
  } as unknown as ResumeData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function setField<K extends keyof ResumeData>(key: K, val: ResumeData[K]) {
    setDraft((d) => ({ ...d, [key]: val }));
  }

  function setContact(key: keyof ResumeData["contact"], val: string) {
    setDraft((d) => ({ ...d, contact: { ...d.contact, [key]: val } }));
  }

  function setExp(idx: number, key: keyof ResumeExperience, val: string | string[]) {
    setDraft((d) => {
      const exp = [...(d.experience ?? [])];
      exp[idx] = { ...exp[idx], [key]: val };
      return { ...d, experience: exp };
    });
  }

  function setBullet(expIdx: number, bulletIdx: number, val: string) {
    setDraft((d) => {
      const exp = [...(d.experience ?? [])];
      const bullets = [...(exp[expIdx].bullets ?? [])];
      bullets[bulletIdx] = val;
      exp[expIdx] = { ...exp[expIdx], bullets };
      return { ...d, experience: exp };
    });
  }

  function removeBullet(expIdx: number, bulletIdx: number) {
    setDraft((d) => {
      const exp = [...(d.experience ?? [])];
      exp[expIdx] = { ...exp[expIdx], bullets: exp[expIdx].bullets.filter((_, i) => i !== bulletIdx) };
      return { ...d, experience: exp };
    });
  }

  function addBullet(expIdx: number) {
    setDraft((d) => {
      const exp = [...(d.experience ?? [])];
      exp[expIdx] = { ...exp[expIdx], bullets: [...(exp[expIdx].bullets ?? []), ""] };
      return { ...d, experience: exp };
    });
  }

  function addExp() {
    setDraft((d) => ({
      ...d,
      experience: [...(d.experience ?? []), { role: "", company: "", period: "", bullets: [""] }],
    }));
  }

  function removeExp(idx: number) {
    setDraft((d) => ({ ...d, experience: (d.experience ?? []).filter((_, i) => i !== idx) }));
  }

  function setEdu(idx: number, key: keyof ResumeEducation, val: string) {
    setDraft((d) => {
      const edu = [...(d.education ?? [])];
      edu[idx] = { ...edu[idx], [key]: val };
      return { ...d, education: edu };
    });
  }

  function removeEdu(idx: number) {
    setDraft((d) => ({ ...d, education: (d.education ?? []).filter((_, i) => i !== idx) }));
  }

  function setCert(idx: number, key: keyof ResumeCertification, val: string) {
    setDraft((d) => {
      const certs = [...(d.certifications ?? [])];
      certs[idx] = { ...certs[idx], [key]: val };
      return { ...d, certifications: certs };
    });
  }

  function removeCert(idx: number) {
    setDraft((d) => ({ ...d, certifications: (d.certifications ?? []).filter((_, i) => i !== idx) }));
  }

  function setProject(idx: number, key: keyof ResumeProject, val: string | string[]) {
    setDraft((d) => {
      const projects = [...(d.projects ?? [])];
      projects[idx] = { ...projects[idx], [key]: val };
      return { ...d, projects };
    });
  }

  function removeProject(idx: number) {
    setDraft((d) => ({ ...d, projects: (d.projects ?? []).filter((_, i) => i !== idx) }));
  }

  function setSkillItems(cat: string, val: string) {
    setDraft((d) => ({
      ...d,
      skills: { ...(d.skills ?? {}), [cat]: val.split(",").map((s) => s.trim()).filter(Boolean) },
    }));
  }

  function addSkillCat() {
    const cat = prompt("Skill category name (e.g. Languages, Frameworks):");
    if (!cat?.trim()) return;
    setDraft((d) => ({ ...d, skills: { ...(d.skills ?? {}), [cat.trim()]: [] } }));
  }

  function removeSkillCat(cat: string) {
    setDraft((d) => {
      const skills = { ...(d.skills ?? {}) };
      delete skills[cat];
      return { ...d, skills };
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const result = await updateResume(resume.id, draft);
      if ("error" in result) { setError(result.error); return; }
      onSaved(result.content, result.html);
    } catch {
      setError("Failed to save — please try again");
    } finally {
      setSaving(false);
    }
  }

  const sectionHdr = "mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--accent)]";
  const removeBtn = "ml-2 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--bad)] transition";
  const addBtn = "mt-2 text-[11px] text-[var(--accent)] hover:underline";

  return (
    <div className="flex-1 overflow-auto px-5 py-4 space-y-6" style={{ minHeight: 0 }}>
      {/* Contact */}
      <div>
        <p className={sectionHdr}>Contact</p>
        <div className="grid grid-cols-2 gap-3">
          {(["name", "email", "phone", "location", "linkedin", "github", "portfolio"] as const).map((f) => (
            <div key={f} className={f === "name" ? "col-span-2" : ""}>
              <Lbl>{f}</Lbl>
              <input
                className={inputCls}
                value={f === "name" ? (draft.name ?? "") : ((draft.contact?.[f as keyof typeof draft.contact] as string) ?? "")}
                onChange={(e) => f === "name" ? setField("name", e.target.value) : setContact(f as keyof ResumeData["contact"], e.target.value)}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Summary */}
      <div>
        <Lbl>Professional summary</Lbl>
        <textarea
          className={inputCls}
          rows={4}
          value={draft.summary ?? ""}
          onChange={(e) => setField("summary", e.target.value)}
          style={{ resize: "vertical" }}
        />
      </div>

      {/* Competencies */}
      <div>
        <Lbl>Core competencies (comma-separated)</Lbl>
        <input
          className={inputCls}
          value={(draft.competencies ?? []).join(", ")}
          onChange={(e) => setField("competencies", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      </div>

      {/* Experience */}
      <div>
        <p className={sectionHdr}>Experience</p>
        <div className="space-y-5">
          {(draft.experience ?? []).map((exp, ei) => (
            <div key={ei} className="rounded-xl border border-[var(--line-soft)] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[var(--muted-foreground)]">Job {ei + 1}</span>
                <button type="button" onClick={() => removeExp(ei)} className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--bad)] transition">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Lbl>Role</Lbl><input className={inputCls} value={exp.role} onChange={(e) => setExp(ei, "role", e.target.value)} /></div>
                <div><Lbl>Company</Lbl><input className={inputCls} value={exp.company} onChange={(e) => setExp(ei, "company", e.target.value)} /></div>
                <div><Lbl>Period</Lbl><input className={inputCls} value={exp.period} onChange={(e) => setExp(ei, "period", e.target.value)} /></div>
                <div><Lbl>Location</Lbl><input className={inputCls} value={exp.location ?? ""} onChange={(e) => setExp(ei, "location", e.target.value)} /></div>
              </div>
              <div>
                <Lbl>Bullets</Lbl>
                <div className="space-y-2">
                  {(exp.bullets ?? []).map((b, bi) => (
                    <div key={bi} className="flex gap-2 items-start">
                      <textarea
                        className={`${inputCls} flex-1`}
                        rows={2}
                        value={b}
                        onChange={(e) => setBullet(ei, bi, e.target.value)}
                        style={{ resize: "vertical" }}
                      />
                      <button type="button" onClick={() => removeBullet(ei, bi)} className="mt-1 text-[var(--muted-foreground)] hover:text-[var(--bad)] transition">
                        <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => addBullet(ei)} className={addBtn}>+ Add bullet</button>
              </div>
            </div>
          ))}
          <button type="button" onClick={addExp} className={addBtn}>+ Add experience</button>
        </div>
      </div>

      {/* Skills */}
      {draft.skills && Object.keys(draft.skills).length > 0 && (
        <div>
          <p className={sectionHdr}>Skills</p>
          <div className="space-y-3">
            {Object.entries(draft.skills).map(([cat, items]) => (
              <div key={cat}>
                <div className="flex items-center gap-2 mb-1">
                  <Lbl>{cat}</Lbl>
                  <button type="button" onClick={() => removeSkillCat(cat)} className={`${removeBtn} mb-1.5`}>Remove</button>
                </div>
                <input
                  className={inputCls}
                  value={items.join(", ")}
                  onChange={(e) => setSkillItems(cat, e.target.value)}
                  placeholder="Comma-separated items"
                />
              </div>
            ))}
          </div>
          <button type="button" onClick={addSkillCat} className={addBtn}>+ Add skill category</button>
        </div>
      )}
      {(!draft.skills || Object.keys(draft.skills).length === 0) && (
        <div>
          <p className={sectionHdr}>Skills</p>
          <button type="button" onClick={addSkillCat} className={addBtn}>+ Add skill category</button>
        </div>
      )}

      {/* Education */}
      <div>
        <p className={sectionHdr}>Education</p>
        <div className="space-y-3">
          {(draft.education ?? []).map((edu, i) => (
            <div key={i} className="rounded-xl border border-[var(--line-soft)] p-4">
              <div className="flex justify-end mb-2">
                <button type="button" onClick={() => removeEdu(i)} className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--bad)] transition">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Lbl>Degree</Lbl><input className={inputCls} value={edu.degree} onChange={(e) => setEdu(i, "degree", e.target.value)} /></div>
                <div><Lbl>Institution</Lbl><input className={inputCls} value={edu.institution} onChange={(e) => setEdu(i, "institution", e.target.value)} /></div>
                <div><Lbl>Year</Lbl><input className={inputCls} value={edu.year ?? ""} onChange={(e) => setEdu(i, "year", e.target.value)} /></div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setDraft((d) => ({ ...d, education: [...(d.education ?? []), { degree: "", institution: "" }] }))} className={addBtn}>+ Add education</button>
        </div>
      </div>

      {/* Certifications */}
      <div>
        <p className={sectionHdr}>Certifications</p>
        <div className="space-y-3">
          {(draft.certifications ?? []).map((cert, i) => (
            <div key={i} className="rounded-xl border border-[var(--line-soft)] p-4">
              <div className="flex justify-end mb-2">
                <button type="button" onClick={() => removeCert(i)} className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--bad)] transition">Remove</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Lbl>Title</Lbl><input className={inputCls} value={cert.title} onChange={(e) => setCert(i, "title", e.target.value)} /></div>
                <div><Lbl>Issuer</Lbl><input className={inputCls} value={cert.issuer ?? ""} onChange={(e) => setCert(i, "issuer", e.target.value)} /></div>
                <div><Lbl>Year</Lbl><input className={inputCls} value={cert.year ?? ""} onChange={(e) => setCert(i, "year", e.target.value)} /></div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setDraft((d) => ({ ...d, certifications: [...(d.certifications ?? []), { title: "" }] }))} className={addBtn}>+ Add certification</button>
        </div>
      </div>

      {/* Projects */}
      <div>
        <p className={sectionHdr}>Projects</p>
        <div className="space-y-3">
          {(draft.projects ?? []).map((proj, i) => (
            <div key={i} className="rounded-xl border border-[var(--line-soft)] p-4">
              <div className="flex justify-end mb-2">
                <button type="button" onClick={() => removeProject(i)} className="text-[11px] text-[var(--muted-foreground)] hover:text-[var(--bad)] transition">Remove</button>
              </div>
              <div className="space-y-3">
                <div><Lbl>Title</Lbl><input className={inputCls} value={proj.title} onChange={(e) => setProject(i, "title", e.target.value)} /></div>
                <div>
                  <Lbl>Description</Lbl>
                  <textarea className={inputCls} rows={2} value={proj.description} onChange={(e) => setProject(i, "description", e.target.value)} style={{ resize: "vertical" }} />
                </div>
                <div>
                  <Lbl>Tech (comma-separated)</Lbl>
                  <input className={inputCls} value={(proj.tech ?? []).join(", ")} onChange={(e) => setProject(i, "tech", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" onClick={() => setDraft((d) => ({ ...d, projects: [...(d.projects ?? []), { title: "", description: "" }] }))} className={addBtn}>+ Add project</button>
        </div>
      </div>

      {/* Error + Save */}
      {error && (
        <p className="rounded-lg border border-[var(--bad)] bg-[#faebeb] px-3 py-2 text-center font-mono text-[11px] text-[var(--bad)]">{error}</p>
      )}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="w-full rounded-xl bg-[var(--accent)] py-2.5 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
    </div>
  );
}

function ResumePanel({
  resume,
  onResumeUpdated,
}: {
  resume: ResumeWithJob;
  onResumeUpdated: (id: string, content: string, html: string) => void;
}) {
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [downloading, setDownloading] = useState(false);
  const company = resume.jobs?.company ?? "";
  const title = resume.jobs?.title ?? resume.title;

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await fetch(`/api/resume/${resume.id}/pdf`);
      if (!res.ok) { setDownloading(false); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${resume.title ?? "resume"}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  }

  function handleSaved(content: string, html: string) {
    onResumeUpdated(resume.id, content, html);
    setMode("preview");
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-[var(--line-soft)] bg-[var(--surface)]" style={{ minHeight: 0, height: "100%" }}>
      {/* Header */}
      <div className="flex shrink-0 items-center gap-3 border-b border-[var(--line-soft)] px-4 py-3">
        {company && <CompanyLogo name={company} size={26} />}
        <div className="flex-1 min-w-0">
          <div className="truncate text-[12px] font-medium">{company ? `${company} — ${title}` : resume.title}</div>
          <div className="text-[11.5px] text-[var(--muted-foreground)]">
            {formatRelative(resume.created_at)}
            {resume.coverage !== null ? ` · ${resume.coverage}% match` : ""}
            {" · "}<span>{resume.source === "custom" ? "Generic" : "Job-tied"}</span>
          </div>
        </div>
        {/* Mode tabs */}
        <div className="flex rounded-lg border border-[var(--line-soft)] bg-[var(--surface-soft)] p-0.5">
          {(["preview", "edit"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className="rounded-md px-3 py-1 text-[11.5px] font-medium capitalize transition"
              style={{
                background: mode === m ? "var(--surface)" : "transparent",
                color: mode === m ? "var(--foreground)" : "var(--muted-foreground)",
                boxShadow: mode === m ? "var(--shadow)" : "none",
              }}
            >
              {m}
            </button>
          ))}
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--line-soft)] px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] disabled:opacity-40"
        >
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {downloading ? "Downloading…" : "Download PDF"}
        </button>
      </div>

      {mode === "preview" ? (
        <div className="flex-1 overflow-auto bg-[#f0ede8]" style={{ minHeight: 0 }}>
          {resume.html ? (
            <iframe
              key={resume.id}
              srcDoc={resume.html}
              title={resume.title}
              className="w-full border-none"
              style={{ minHeight: "900px", display: "block" }}
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex h-48 items-center justify-center text-[12px] text-[var(--muted-foreground)]">
              No preview available — try regenerating this resume
            </div>
          )}
        </div>
      ) : (
        <ResumeEditor resume={resume} onSaved={handleSaved} />
      )}
    </div>
  );
}

// ── Generate panel ────────────────────────────────────────────────────────────

type ResumeMode = "standard" | "premium";
type ResumeSource = "job" | "role";

const ROLE_CATEGORIES: { label: string; roles: string[] }[] = [
  {
    label: "Engineering",
    roles: [
      "Software Engineer",
      "Frontend Engineer",
      "Backend Engineer",
      "Full Stack Engineer",
      "iOS Engineer",
      "Android Engineer",
      "DevOps Engineer",
      "Site Reliability Engineer",
      "Platform Engineer",
      "Embedded Systems Engineer",
    ],
  },
  {
    label: "Data & AI",
    roles: [
      "Data Scientist",
      "Data Analyst",
      "Machine Learning Engineer",
      "AI Research Scientist",
      "Business Intelligence Analyst",
      "Data Engineer",
    ],
  },
  {
    label: "Product & Design",
    roles: [
      "Product Manager",
      "Senior Product Manager",
      "Product Designer",
      "UX Designer",
      "UX Researcher",
      "UI Designer",
    ],
  },
  {
    label: "Leadership",
    roles: [
      "Engineering Manager",
      "Tech Lead",
      "VP of Engineering",
      "Chief Technology Officer",
      "Director of Product",
    ],
  },
  {
    label: "Business & Operations",
    roles: [
      "Business Analyst",
      "Project Manager",
      "Program Manager",
      "Scrum Master",
      "Operations Manager",
    ],
  },
  {
    label: "Marketing",
    roles: [
      "Growth Marketer",
      "Content Marketer",
      "SEO Specialist",
      "Performance Marketer",
      "Brand Manager",
    ],
  },
  {
    label: "Sales & Customer Success",
    roles: [
      "Account Executive",
      "Sales Development Representative",
      "Customer Success Manager",
      "Solutions Engineer",
    ],
  },
  {
    label: "Finance",
    roles: [
      "Financial Analyst",
      "Investment Analyst",
      "Finance Manager",
    ],
  },
];

const ALL_ROLES = ROLE_CATEGORIES.flatMap((c) => c.roles);

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
  const [source, setSource]               = useState<ResumeSource>("job");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [roleInput, setRoleInput]         = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIdx, setHighlightedIdx]   = useState(-1);
  const [targetCompany, setTargetCompany] = useState("");
  const [mode, setMode]                   = useState<ResumeMode>("standard");
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState<string | null>(null);

  const roleInputRef    = useRef<HTMLInputElement>(null);
  const suggestionsRef  = useRef<HTMLDivElement>(null);

  const jobsWithDesc  = jobs.filter((j) => !!j.description);
  const canUsePremium = MODE_META.premium.tiers.includes(tier);

  const suggestions = (() => {
    const q = roleInput.trim().toLowerCase();
    const filtered = q
      ? ALL_ROLES.filter((r) => r.toLowerCase().includes(q))
      : ALL_ROLES.slice(0, 8);
    return filtered.slice(0, 8);
  })();

  const canGenerate = source === "job" ? !!selectedJobId : !!roleInput.trim();

  // Close suggestions when clicking outside
  useEffect(() => {
    function handlePointerDown(e: PointerEvent) {
      if (
        roleInputRef.current && !roleInputRef.current.contains(e.target as Node) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
        setHighlightedIdx(-1);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  async function generate() {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    try {
      const body = source === "job"
        ? { job_id: selectedJobId, premium: mode === "premium" }
        : { target_role: roleInput.trim(), target_company: targetCompany.trim() || undefined, premium: mode === "premium" };

      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await res.json()) as { resume_id?: string; coverage?: number; error?: string };
      if (!res.ok || data.error) {
        setError(
          data.error === "NO_CREDITS" ? "Not enough credits — top up in billing" :
          data.error === "PREMIUM_RESUME_CAP_REACHED" ? "Premium resume cap reached for your plan" :
          (data.error ?? "Generation failed"),
        );
      } else if (data.resume_id) {
        onGenerated(data.resume_id);
      } else {
        setError("Generation failed — no resume ID returned");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col rounded-xl border border-dashed border-[var(--line-soft)] bg-[var(--surface)] p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-soft)] bg-[var(--surface-soft)]">
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground)" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
        </div>
        <div>
          <h2 className="text-[16px] font-semibold">Generate a resume</h2>
          <p className="text-[12.5px] text-[var(--muted-foreground)]">Tailored to a specific job or a role type — your choice.</p>
        </div>
      </div>

      {/* Source toggle */}
      <div className="mb-5 flex rounded-lg border border-[var(--line-soft)] bg-[var(--surface-soft)] p-1 gap-1">
        {([
          { key: "job",  label: "For a job" },
          { key: "role", label: "For a role" },
        ] as { key: ResumeSource; label: string }[]).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => { setSource(key); setError(null); }}
            className="flex-1 rounded-md py-1.5 text-[12px] font-medium transition"
            style={{
              background: source === key ? "var(--surface)" : "transparent",
              color: source === key ? "var(--foreground)" : "var(--muted-foreground)",
              boxShadow: source === key ? "var(--shadow)" : "none",
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Mode selector */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        {(["standard", "premium"] as ResumeMode[]).map((m) => {
          const meta   = MODE_META[m];
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
                background:  active ? "var(--accent-soft)" : locked ? "var(--surface-soft)" : "var(--surface)",
                opacity:     locked ? 0.6 : 1,
                cursor:      locked ? "not-allowed" : "pointer",
                boxShadow:   active ? "0 0 0 1px var(--accent)" : "none",
              }}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[13.5px] font-semibold">{meta.label}</span>
                {meta.badge && (
                  <span className="rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-white">
                    {meta.badge}
                  </span>
                )}
                {locked && (
                  <span className="rounded-full border border-[var(--line-soft)] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">
                    Starter+
                  </span>
                )}
              </div>
              <p className="text-[12px] text-[var(--muted-foreground)] leading-[1.5] mb-2">{meta.description}</p>
              <span className="font-mono text-[11px] text-[var(--accent)]">{meta.detail}</span>
              {active && <div className="absolute right-3 top-3 h-2 w-2 rounded-full bg-[var(--accent)]" />}
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

      {/* Source-specific inputs */}
      <div className="flex flex-col gap-3">
        {source === "job" ? (
          jobsWithDesc.length === 0 ? (
            <p className="text-center text-[12px] text-[var(--muted-foreground)]">
              Add a job with a description first —{" "}
              <Link href="/dashboard/pipeline" className="text-[var(--accent)] hover:underline">go to pipeline</Link>.
            </p>
          ) : (
            <select
              value={selectedJobId}
              onChange={(e) => setSelectedJobId(e.target.value)}
              className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[12px] outline-none focus:border-[var(--accent)]"
            >
              <option value="">— choose a job —</option>
              {jobsWithDesc.map((j) => (
                <option key={j.id} value={j.id}>{j.title} at {j.company}</option>
              ))}
            </select>
          )
        ) : (
          <>
            {/* Role combobox */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)] mb-1.5">
                Target role
              </label>
              <div className="relative">
                <input
                  ref={roleInputRef}
                  type="text"
                  value={roleInput}
                  onChange={(e) => {
                    setRoleInput(e.target.value);
                    setHighlightedIdx(-1);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onKeyDown={(e) => {
                    if (!showSuggestions) return;
                    if (e.key === "ArrowDown") {
                      e.preventDefault();
                      setHighlightedIdx((i) => Math.min(i + 1, suggestions.length - 1));
                    } else if (e.key === "ArrowUp") {
                      e.preventDefault();
                      setHighlightedIdx((i) => Math.max(i - 1, -1));
                    } else if (e.key === "Enter") {
                      e.preventDefault();
                      if (highlightedIdx >= 0 && suggestions[highlightedIdx]) {
                        setRoleInput(suggestions[highlightedIdx]);
                        setShowSuggestions(false);
                        setHighlightedIdx(-1);
                      }
                    } else if (e.key === "Escape") {
                      setShowSuggestions(false);
                      setHighlightedIdx(-1);
                    }
                  }}
                  placeholder="e.g. Software Engineer, Product Manager…"
                  autoComplete="off"
                  className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[12px] outline-none focus:border-[var(--accent)] transition-colors"
                />

                {showSuggestions && suggestions.length > 0 && (
                  <div
                    ref={suggestionsRef}
                    className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded-lg border border-[var(--line-soft)] bg-[var(--surface)]"
                    style={{ boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                  >
                    {suggestions.map((role, idx) => {
                      const q = roleInput.trim().toLowerCase();
                      const matchStart = q ? role.toLowerCase().indexOf(q) : -1;

                      return (
                        <button
                          key={role}
                          type="button"
                          onPointerDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setRoleInput(role);
                            setShowSuggestions(false);
                            setHighlightedIdx(-1);
                            roleInputRef.current?.focus();
                          }}
                          className="flex w-full items-center px-3 py-2 text-left text-[12px] transition-colors"
                          style={{
                            background: idx === highlightedIdx ? "var(--surface-soft)" : "transparent",
                            color: "var(--foreground)",
                          }}
                        >
                          {matchStart >= 0 ? (
                            <>
                              {role.slice(0, matchStart)}
                              <span style={{ fontWeight: 600, color: "var(--accent)" }}>
                                {role.slice(matchStart, matchStart + q.length)}
                              </span>
                              {role.slice(matchStart + q.length)}
                            </>
                          ) : role}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="mt-1.5 font-mono text-[10px] text-[var(--muted-foreground-2)]">
                Type any role — pick a suggestion or use your own
              </p>
            </div>

            {/* Company (optional) */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)] mb-1.5">
                Target company <span className="normal-case tracking-normal font-sans text-[11px]">(optional)</span>
              </label>
              <input
                type="text"
                value={targetCompany}
                onChange={(e) => setTargetCompany(e.target.value)}
                placeholder="e.g. Google, Stripe, any company name"
                className="w-full rounded-lg border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-[12px] outline-none focus:border-[var(--accent)] transition-colors"
              />
              <p className="mt-1.5 font-mono text-[10px] text-[var(--muted-foreground-2)]">
                Including a company name adds a targeted angle to the summary
              </p>
            </div>
          </>
        )}

        {error && (
          <p className="rounded-lg border border-[var(--bad)] bg-[#faebeb] px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--bad)]">
            {error}
          </p>
        )}

        {loading ? (
          <div className="flex items-center justify-center gap-2 rounded-xl border border-[var(--line-soft)] py-3 text-[12px] text-[var(--muted-foreground)]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            {mode === "premium" ? "Premium AI tailoring…" : "Generating resume…"}
          </div>
        ) : (
          <button
            onClick={generate}
            disabled={!canGenerate}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[var(--accent)] py-2.5 text-[12px] font-medium text-white transition hover:opacity-90 disabled:opacity-40"
          >
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3c.3 3.5 3.5 6.5 7 7-3.5.3-6.7 3.5-7 7-.3-3.5-3.5-6.7-7-7 3.5-.3 6.7-3.5 7-7Z" />
            </svg>
            Generate {mode} resume · {MODE_META[mode].credits} cr
          </button>
        )}
      </div>
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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showGenerate, setShowGenerate] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(25);
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());
  const [batchPending, startBatch] = useTransition();
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "coverage">("newest");
  const [filterBy, setFilterBy] = useState<"all" | "ai" | "custom">("all");
  // Local overrides so edits show immediately without a full page reload
  const [resumeOverrides, setResumeOverrides] = useState<Map<string, Pick<ResumeWithJob, "content" | "html">>>(new Map());

  const handleResumeUpdated = useCallback((id: string, content: string, html: string) => {
    setResumeOverrides((prev) => new Map(prev).set(id, { content, html }));
  }, []);

  const filtered = resumes
    .filter((r) => filterBy === "all" || r.source === filterBy)
    .sort((a, b) => {
      if (sortBy === "oldest") return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (sortBy === "coverage") return (b.coverage ?? -1) - (a.coverage ?? -1);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

  function resolveResume(r: ResumeWithJob): ResumeWithJob {
    const override = resumeOverrides.get(r.id);
    return override ? { ...r, ...override } : r;
  }

  const selected = resumes.find((r) => r.id === selectedId) ?? null;
  const resolvedSelected = selected ? resolveResume(selected) : null;
  const visible = filtered.slice(0, displayCount);
  const remaining = filtered.length - displayCount;

  function toggleCheck(id: string) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleBatchDelete() {
    const ids = [...checkedIds];
    startBatch(async () => {
      await batchDeleteResumes(ids);
      setCheckedIds(new Set());
      if (ids.includes(selectedId ?? "")) setSelectedId(null);
      router.refresh();
    });
  }

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
          <h1 className="nr-display" style={{ fontSize: 24, marginBottom: 4 }}>
            Resumes
            {resumes.length > 0 && <span style={{ color: "var(--muted-foreground)", fontWeight: 400, fontSize: 18 }}> · {resumes.length}</span>}
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>AI-tailored resumes for every role you apply to.</p>
        </div>
        <button
          onClick={() => { setShowGenerate(true); setSelectedId(null); }}
          className="flex items-center gap-2 rounded-[8px] bg-[var(--accent)] px-4 py-2 text-[12px] font-medium text-white transition hover:opacity-90"
          style={{ fontFamily: "var(--font-body)" }}
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
        <div className="shrink-0 flex flex-col rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] md:w-[300px]" style={{ maxHeight: "calc(100vh - 200px)" }}>
          {/* Filter + sort toolbar */}
          <div className="shrink-0 border-b border-[var(--line-soft)] px-3 py-2 flex items-center gap-2">
            <select
              value={filterBy}
              onChange={(e) => { setFilterBy(e.target.value as typeof filterBy); setDisplayCount(25); }}
              className="flex-1 rounded-[6px] border border-[var(--line-soft)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <option value="all">All resumes</option>
              <option value="ai">Job-tied</option>
              <option value="custom">Generic</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="rounded-[6px] border border-[var(--line-soft)] bg-[var(--surface)] px-2.5 py-1.5 text-[12px] text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
              style={{ fontFamily: "var(--font-body)" }}
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="coverage">Coverage</option>
            </select>
          </div>
          {/* Batch toolbar */}
          {checkedIds.size > 0 && (
            <div className="flex items-center gap-2 border-b border-[var(--line-soft)] px-3 py-2">
              <span className="flex-1 font-mono text-[10px] text-[var(--muted-foreground)]">{checkedIds.size} selected</span>
              <button
                type="button"
                onClick={handleBatchDelete}
                disabled={batchPending}
                className="text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--bad)] hover:underline disabled:opacity-40"
              >
                Delete
              </button>
              <button type="button" onClick={() => setCheckedIds(new Set())} className="font-mono text-[10px] text-[var(--muted-foreground)] hover:underline">
                Clear
              </button>
            </div>
          )}
          <div className="flex-1 overflow-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 text-center text-[12px] text-[var(--muted-foreground)]">
              {resumes.length === 0 ? (
                <>
                  <p>No resumes yet</p>
                  <button onClick={() => setShowGenerate(true)} className="text-[var(--accent)] hover:underline">Generate one</button>
                </>
              ) : (
                <p>No resumes match the current filter</p>
              )}
            </div>
          ) : (
            <>
            {visible.map((r) => {
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
                  <input
                    type="checkbox"
                    checked={checkedIds.has(r.id)}
                    onChange={() => toggleCheck(r.id)}
                    onClick={(e) => e.stopPropagation()}
                    className="absolute left-2 top-3 h-3.5 w-3.5 cursor-pointer accent-[var(--accent)]"
                  />
                  <button
                    onClick={() => { setSelectedId(r.id); setShowGenerate(false); setConfirmDeleteId(null); }}
                    className="w-full p-3 pl-7 text-left"
                  >
                    <div className="mb-1 flex items-center gap-2">
                      {company && <CompanyLogo name={company} size={20} />}
                      <span className="text-[12px] font-medium">{company || r.title}</span>
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
            })}
            {remaining > 0 && (
              <button
                type="button"
                onClick={() => setDisplayCount((c) => c + 25)}
                className="mt-2 w-full rounded-[6px] border border-[var(--line-soft)] py-2 text-center text-[12px] text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:border-[var(--line)] transition"
                style={{ fontFamily: "var(--font-body)" }}
              >
                Load {Math.min(remaining, 25)} more
                <span style={{ fontSize: 12, color: "var(--muted-foreground-2)" }}> · {remaining} remaining</span>
              </button>
            )}
            </>
          )}
          </div>
        </div>

        {/* Main panel */}
        <div className="min-w-0 min-h-[300px] flex-1">
          {showGenerate ? (
            <GeneratePanel jobs={jobs} tier={tier} onGenerated={handleGenerated} />
          ) : resolvedSelected ? (
            <ResumePanel resume={resolvedSelected} onResumeUpdated={handleResumeUpdated} />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 rounded-[10px] border border-dashed border-[var(--line-soft)]" style={{ minHeight: 300 }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--muted-foreground-2)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
              </svg>
              <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>Select a resume to preview it</p>
              <button
                onClick={() => setShowGenerate(true)}
                style={{ fontSize: 13, color: "var(--accent)", background: "none", border: "none", cursor: "pointer" }}
              >
                or generate a new one →
              </button>
            </div>
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
              <span className={`rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-[0.05em] ${resume.status === "final" ? "bg-[var(--ok)] text-white" : "border border-[var(--line-soft)] text-[var(--muted-foreground)]"}`}>
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
              className="rounded-lg border border-[var(--line-soft)] px-3 py-1.5 text-[12px] text-[var(--muted-foreground)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
            >
              {diffMode ? "Resume view" : "Compare with CV"}
            </button>
          )}
          <a
            href={`/api/resume/${resume.id}/html`}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg bg-[var(--accent)] px-4 py-1.5 text-[12px] font-medium text-white transition hover:opacity-90"
          >
            Download PDF
          </a>
        </div>
      </div>

      {diffMode && baseCv && (
        <div className="mb-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Base CV</p>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--foreground)]">{baseCv}</pre>
          </div>
          <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Tailored resume</p>
            <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-[var(--foreground)]">{resume.content ?? "No content saved"}</pre>
          </div>
        </div>
      )}

      {!data && (
        <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
          <p className="text-[12px] text-[var(--muted-foreground)]">Resume content not available.</p>
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
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Summary</p>
              <p className="text-[13.5px] leading-[1.65]">{data.summary}</p>
            </div>
          )}

          {data.competencies && data.competencies.length > 0 && (
            <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Core Competencies</p>
              <div className="flex flex-wrap gap-2">
                {data.competencies.map((c, i) => (
                  <Badge key={i} tone="accent">{c}</Badge>
                ))}
              </div>
            </div>
          )}

          {data.experience && data.experience.length > 0 && (
            <div className="rounded-xl border border-[var(--line-soft)] bg-[var(--surface)] p-5">
              <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Experience</p>
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
                    <ul className="ml-4 mt-2 space-y-1 text-[12px]">
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
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Education</p>
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
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground)]">Skills</p>
              <div className="space-y-2">
                {Object.entries(data.skills).map(([cat, items]) => (
                  <div key={cat} className="flex gap-3 text-[12px]">
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
