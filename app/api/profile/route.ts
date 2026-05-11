/**
 * PATCH /api/profile
 *
 * Updates the authenticated user's profile from the new Naukri-style Profile page.
 * Accepts a partial JSON payload — only provided fields are updated.
 *
 * Auth: Supabase session cookie (this is called from the webapp, not the extension).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type {
  WorkExperienceEntry,
  EducationEntry,
  CertificationEntry,
  ProjectEntry,
  Database,
} from "@/lib/db/types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

// ── Enum allow-lists ──────────────────────────────────────────────────────────

const WORK_MODES   = ["remote", "hybrid", "onsite"] as const;
const SENIORITIES  = ["junior", "mid", "senior", "staff", "principal"] as const;
const NOTICE       = ["immediately", "2_weeks", "1_month", "2_months", "3_months"] as const;
const GENDERS      = ["male", "female", "non_binary", "prefer_not_to_say"] as const;
const PRONOUNS     = ["he_him", "she_her", "they_them", "prefer_not_to_say"] as const;
const VETERAN      = ["not_veteran", "protected_veteran", "prefer_not_to_say"] as const;
const DISABILITY   = ["no", "yes", "prefer_not_to_say"] as const;
const EMP_TYPES    = ["full_time", "part_time", "contract", "internship", "freelance"] as const;

function inEnum<T extends readonly string[]>(list: T, v: unknown): v is T[number] {
  return typeof v === "string" && (list as readonly string[]).includes(v);
}

// ── Validators for JSONB array entries ────────────────────────────────────────

function clampStr(v: unknown, max = 500): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

function validateWorkExperience(arr: unknown): WorkExperienceEntry[] | null {
  if (!Array.isArray(arr)) return null;
  return arr.slice(0, 30).map((e): WorkExperienceEntry => {
    const o = (e ?? {}) as Record<string, unknown>;
    const empType = clampStr(o.employment_type, 30);
    return {
      role:        clampStr(o.role, 200) ?? "",
      company:     clampStr(o.company, 200) ?? "",
      start:       clampStr(o.start, 20),
      end:         clampStr(o.end, 20),
      current:     o.current === true,
      location:    clampStr(o.location, 200),
      description: clampStr(o.description, 2000),
      employment_type: empType && inEnum(EMP_TYPES, empType) ? empType : undefined,
    };
  }).filter((e) => e.role && e.company);
}

function validateEducation(arr: unknown): EducationEntry[] | null {
  if (!Array.isArray(arr)) return null;
  return arr.slice(0, 15).map((e): EducationEntry => {
    const o = (e ?? {}) as Record<string, unknown>;
    return {
      degree:      clampStr(o.degree, 200) ?? "",
      institution: clampStr(o.institution, 300) ?? "",
      field:       clampStr(o.field, 200),
      start:       clampStr(o.start, 20),
      end:         clampStr(o.end, 20),
      grade:       clampStr(o.grade, 50),
    };
  }).filter((e) => e.degree && e.institution);
}

function validateCertifications(arr: unknown): CertificationEntry[] | null {
  if (!Array.isArray(arr)) return null;
  return arr.slice(0, 30).map((e): CertificationEntry => {
    const o = (e ?? {}) as Record<string, unknown>;
    return {
      title:  clampStr(o.title, 200) ?? "",
      issuer: clampStr(o.issuer, 200),
      year:   clampStr(o.year, 20),
      url:    clampStr(o.url, 500),
    };
  }).filter((e) => e.title);
}

function validateProjects(arr: unknown): ProjectEntry[] | null {
  if (!Array.isArray(arr)) return null;
  return arr.slice(0, 20).map((e): ProjectEntry => {
    const o = (e ?? {}) as Record<string, unknown>;
    const tech = Array.isArray(o.tech)
      ? (o.tech as unknown[]).map((t) => clampStr(t, 60)).filter(Boolean) as string[]
      : undefined;
    return {
      title:       clampStr(o.title, 200) ?? "",
      description: clampStr(o.description, 2000),
      tech:        tech?.slice(0, 20),
      url:         clampStr(o.url, 500),
    };
  }).filter((e) => e.title);
}

function validateSkills(arr: unknown): string[] | null {
  if (!Array.isArray(arr)) return null;
  return arr
    .map((s) => clampStr(s, 60))
    .filter(Boolean)
    .slice(0, 80) as string[];
}

// ── Build update payload from raw body ────────────────────────────────────────

function buildPatch(body: Record<string, unknown>): ProfileUpdate {
  const patch: Record<string, unknown> = {};
  const set = (key: string, value: unknown) => {
    if (value !== undefined) patch[key] = value;
  };

  // Identity
  set("full_name", clampStr(body.full_name, 200));

  // Contact
  set("phone",         clampStr(body.phone, 40));
  set("linkedin_url",  clampStr(body.linkedin_url, 500));
  set("github_url",    clampStr(body.github_url, 500));
  set("portfolio_url", clampStr(body.portfolio_url, 500));

  // Location
  set("country",        clampStr(body.country, 100));
  set("city",           clampStr(body.city, 100));
  set("state_province", clampStr(body.state_province, 100));
  set("zip_postal",     clampStr(body.zip_postal, 30));
  set("street_address", clampStr(body.street_address, 300));

  // Work preferences
  if (body.work_mode === null || inEnum(WORK_MODES, body.work_mode)) {
    set("work_mode", body.work_mode);
  }
  if (body.seniority === null || inEnum(SENIORITIES, body.seniority)) {
    set("seniority", body.seniority);
  }
  if (body.notice_period === null || inEnum(NOTICE, body.notice_period)) {
    set("notice_period", body.notice_period);
  }
  if (typeof body.years_experience === "number") {
    set("years_experience", Math.max(0, Math.min(50, body.years_experience)));
  }
  if (typeof body.comp_min === "number") set("comp_min", Math.max(0, body.comp_min));
  if (typeof body.comp_max === "number") set("comp_max", Math.max(0, body.comp_max));
  if (typeof body.willing_to_relocate === "boolean") {
    set("willing_to_relocate", body.willing_to_relocate);
  }
  if (typeof body.sponsorship_needed === "boolean") {
    set("sponsorship_needed", body.sponsorship_needed);
  }
  set("nationality", clampStr(body.nationality, 100));

  if (Array.isArray(body.target_roles)) {
    set("target_roles", validateSkills(body.target_roles));
  }
  if (Array.isArray(body.target_locations)) {
    set("target_locations", validateSkills(body.target_locations));
  }

  // EEO (each is independent — user may fill some, leave others blank)
  if (body.gender === null || inEnum(GENDERS, body.gender)) set("gender", body.gender);
  if (body.pronouns === null || inEnum(PRONOUNS, body.pronouns)) set("pronouns", body.pronouns);
  set("race_ethnicity", clampStr(body.race_ethnicity, 100));
  if (body.veteran_status === null || inEnum(VETERAN, body.veteran_status)) {
    set("veteran_status", body.veteran_status);
  }
  if (body.disability_status === null || inEnum(DISABILITY, body.disability_status)) {
    set("disability_status", body.disability_status);
  }

  // Structured CV data
  const we = validateWorkExperience(body.work_experience);
  if (we !== null) set("work_experience", we);
  const ed = validateEducation(body.education);
  if (ed !== null) set("education", ed);
  const ce = validateCertifications(body.certifications);
  if (ce !== null) set("certifications", ce);
  const pr = validateProjects(body.projects);
  if (pr !== null) set("projects", pr);
  const sk = validateSkills(body.skills);
  if (sk !== null) set("skills", sk);
  const ln = validateSkills(body.languages);
  if (ln !== null) set("languages", ln);

  // Long-form base CV (rarely edited from this page but allowed)
  if (typeof body.base_cv === "string") {
    set("base_cv", body.base_cv.slice(0, 20000));
  }

  return patch as ProfileUpdate;
}

// ── Route ─────────────────────────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const patch = buildPatch(body);
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
  }

  const finalPatch: ProfileUpdate = { ...patch, updated_at: new Date().toISOString() };

  const { error } = await supabase
    .from("profiles")
    .update(finalPatch)
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, updated: Object.keys(patch).length });
}

// GET — return full profile for the page to hydrate on mount
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
