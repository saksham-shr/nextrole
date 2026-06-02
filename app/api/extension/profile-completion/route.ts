/**
 * GET /api/extension/profile-completion
 * Auth: Bearer nrt_<hex>
 *
 * Returns a profile-completeness score for the side-panel settings screen.
 * Two buckets:
 *   - required: fields the extension genuinely needs to autofill an
 *     application end-to-end (name, email, phone, basic CV).
 *   - optional: fields that improve autofill quality but aren't blockers
 *     (GitHub, portfolio, demographics, CTC breakdown, free-text notes).
 *
 * `percent` is required-bucket only. Optional fields are tracked
 * separately so the UI can nudge users to fill them without dragging
 * the headline number down for things that don't really matter.
 *
 * No database writes. No credit cost.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

type FieldCategory = "identity" | "compensation" | "experience" | "education" | "preferences";

type FieldSpec = {
  field: string;
  label: string;
  category: FieldCategory;
  // Predicate: does this field count as "filled" for the given profile row?
  filled: (p: Record<string, unknown>) => boolean;
};

const REQUIRED_FIELDS: FieldSpec[] = [
  { field: "full_name",     label: "Full name",        category: "identity",     filled: (p) => isNonEmptyString(p.full_name) },
  { field: "email",         label: "Email",            category: "identity",     filled: (p) => isNonEmptyString(p.email) },
  { field: "phone",         label: "Phone",            category: "identity",     filled: (p) => isNonEmptyString(p.phone) },
  { field: "city",          label: "Current city",     category: "identity",     filled: (p) => isNonEmptyString(p.city) },
  { field: "linkedin_url",  label: "LinkedIn profile", category: "identity",     filled: (p) => isNonEmptyString(p.linkedin_url) },
  { field: "skills",        label: "Skills (3+)",      category: "experience",   filled: (p) => isStringArray(p.skills) && (p.skills as string[]).length >= 3 },
  { field: "work_experience", label: "Work experience (1+)", category: "experience", filled: (p) => isNonEmptyArray(p.work_experience) },
  { field: "education",     label: "Education (1+)",   category: "education",    filled: (p) => isNonEmptyArray(p.education) },
  { field: "ctc_fixed",     label: "Current CTC (fixed)",  category: "compensation", filled: (p) => isPositiveNumber(p.ctc_fixed) || isPositiveNumber(p.comp_min) },
  { field: "expected_salary_min", label: "Expected CTC (min)", category: "compensation", filled: (p) => isPositiveNumber(p.expected_salary_min) || isPositiveNumber(p.expected_salary) },
  { field: "notice_period", label: "Notice period",    category: "preferences",  filled: (p) => isNonEmptyString(p.notice_period) },
];

const OPTIONAL_FIELDS: FieldSpec[] = [
  { field: "github_url",          label: "GitHub profile",        category: "identity",     filled: (p) => isNonEmptyString(p.github_url) },
  { field: "portfolio_url",       label: "Portfolio URL",         category: "identity",     filled: (p) => isNonEmptyString(p.portfolio_url) },
  { field: "state_province",      label: "State",                 category: "identity",     filled: (p) => isNonEmptyString(p.state_province) },
  { field: "zip_postal",          label: "PIN code",              category: "identity",     filled: (p) => isNonEmptyString(p.zip_postal) },
  { field: "street_address",      label: "Street address",        category: "identity",     filled: (p) => isNonEmptyString(p.street_address) },
  { field: "middle_name",          label: "Middle name",           category: "identity",     filled: (p) => isNonEmptyString(p.middle_name) },
  { field: "dob",                 label: "Date of birth",         category: "identity",     filled: (p) => isNonEmptyString(p.dob) },
  { field: "work_authorization",  label: "Work authorisation",    category: "preferences",  filled: (p) => isNonEmptyString(p.work_authorization) },
  { field: "phone_country_code",  label: "Phone country code",    category: "identity",     filled: (p) => isNonEmptyString(p.phone_country_code) },
  { field: "willing_to_relocate", label: "Willing to relocate",   category: "preferences",  filled: (p) => p.willing_to_relocate !== null && p.willing_to_relocate !== undefined },
  { field: "sponsorship_needed",  label: "Sponsorship needed",    category: "preferences",  filled: (p) => p.sponsorship_needed !== null && p.sponsorship_needed !== undefined },
  { field: "work_mode",           label: "Preferred work mode",   category: "preferences",  filled: (p) => isNonEmptyString(p.work_mode) },
  { field: "target_roles",        label: "Target roles",          category: "preferences",  filled: (p) => isStringArray(p.target_roles) && (p.target_roles as string[]).length > 0 },
  { field: "target_locations",    label: "Target locations",      category: "preferences",  filled: (p) => isStringArray(p.target_locations) && (p.target_locations as string[]).length > 0 },
  { field: "seniority",           label: "Seniority level",       category: "experience",   filled: (p) => isNonEmptyString(p.seniority) },
  { field: "years_experience",    label: "Years of experience",   category: "experience",   filled: (p) => isPositiveNumber(p.years_experience) },
  { field: "certifications",      label: "Certifications",        category: "experience",   filled: (p) => isNonEmptyArray(p.certifications) },
  { field: "projects",            label: "Projects",              category: "experience",   filled: (p) => isNonEmptyArray(p.projects) },
  { field: "expected_salary_max", label: "Expected CTC (max)",    category: "compensation", filled: (p) => isPositiveNumber(p.expected_salary_max) },
  { field: "ctc_variable",        label: "Current CTC (variable)", category: "compensation", filled: (p) => isPositiveNumber(p.ctc_variable) },
  { field: "ctc_note",            label: "CTC breakdown note",    category: "compensation", filled: (p) => isNonEmptyString(p.ctc_note) },
  { field: "notice_period_note",  label: "Notice period note",    category: "preferences",  filled: (p) => isNonEmptyString(p.notice_period_note) },
  { field: "gender",              label: "Gender",                category: "identity",     filled: (p) => isNonEmptyString(p.gender) },
  { field: "pronouns",            label: "Pronouns",              category: "identity",     filled: (p) => isNonEmptyString(p.pronouns) },
];

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`ext-profile-completion:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile, error } = await admin
    .from("profiles")
    .select([
      "full_name", "middle_name", "email", "phone", "phone_country_code",
      "linkedin_url", "github_url", "portfolio_url",
      "city", "state_province", "zip_postal", "street_address",
      "dob", "work_authorization",
      "willing_to_relocate", "sponsorship_needed",
      "work_mode", "target_roles", "target_locations",
      "seniority", "years_experience",
      "comp_min", "comp_max", "expected_salary",
      "expected_salary_min", "expected_salary_max",
      "ctc_fixed", "ctc_variable", "ctc_note", "notice_period_note",
      "notice_period",
      "gender", "pronouns",
      "skills", "work_experience", "education", "certifications", "projects",
    ].join(", "))
    .eq("id", resolved.userId)
    .single();

  if (error || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const p = profile as unknown as Record<string, unknown>;

  const requiredResults  = REQUIRED_FIELDS.map((spec) => ({ ...spec, ok: spec.filled(p) }));
  const optionalResults  = OPTIONAL_FIELDS.map((spec) => ({ ...spec, ok: spec.filled(p) }));

  const requiredFilled = requiredResults.filter((r) => r.ok).length;
  const optionalFilled = optionalResults.filter((r) => r.ok).length;

  const percent = REQUIRED_FIELDS.length === 0
    ? 100
    : Math.round((requiredFilled / REQUIRED_FIELDS.length) * 100);

  return NextResponse.json({
    percent,
    required: { filled: requiredFilled, total: REQUIRED_FIELDS.length },
    optional: { filled: optionalFilled, total: OPTIONAL_FIELDS.length },
    missing_required: requiredResults
      .filter((r) => !r.ok)
      .map(({ field, label, category }) => ({ field, label, category })),
    missing_optional: optionalResults
      .filter((r) => !r.ok)
      .map(({ field, label, category }) => ({ field, label, category })),
  });
}

// ─── Type predicates ─────────────────────────────────────────────────────────

function isNonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v: unknown): boolean {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}

function isNonEmptyArray(v: unknown): boolean {
  return Array.isArray(v) && v.length > 0;
}

function isPositiveNumber(v: unknown): boolean {
  return typeof v === "number" && Number.isFinite(v) && v > 0;
}
