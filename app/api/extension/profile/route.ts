/**
 * GET /api/extension/profile
 * Auth: Bearer <extension_token>
 *
 * Returns the full user profile for autofill + tier/credit data for gate checks.
 * All fields come directly from the profiles table — no regex fallback on base_cv.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

const NOTICE_PERIOD_DAYS: Record<string, number> = {
  immediately: 0,
  "2_weeks":   14,
  "1_month":   30,
  "2_months":  60,
  "3_months":  90,
};

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`ext-profile:${ip}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: usageRow }] = await Promise.all([
    admin.from("profiles").select([
      // identity
      "full_name", "first_name", "last_name", "middle_name",
      "preferred_name", "name_prefix", "fathers_name",
      // contact
      "email", "phone", "phone_country_code", "alternate_phone",
      // address
      "street_address", "address_line2", "city", "state_province",
      "zip_postal", "country", "nationality",
      "permanent_address_same", "permanent_address",
      // online presence
      "linkedin_url", "github_url", "portfolio_url", "naukri_url",
      // compensation
      "salary_currency", "current_ctc",
      "expected_salary_min", "expected_salary_max",
      // work preferences
      "years_experience", "seniority", "work_mode",
      "notice_period", "notice_period_note", "available_from",
      "willing_to_relocate", "open_to_hybrid",
      "sponsorship_needed", "work_authorization",
      "authorized_countries", "target_roles",
      // demographics
      "dob", "gender", "pronouns", "marital_status", "category",
      "race_ethnicity", "veteran_status", "disability_status",
      "hispanic_or_latino", "lgbtq_member",
      "accommodation_needed", "indian_army_veteran",
      "government_ids",
      // cv
      "skills", "languages", "work_experience", "education",
      "certifications", "projects",
      // autofill helpers
      "referral_source", "qa_library",
      // credits + tier
      "tier", "daily_credits", "topup_credits", "bonus_credits",
      "daily_credits_reset_at",
    ].join(", ")).eq("id", userId).single(),

    admin.from("daily_usage")
      .select("evaluations, resumes, autofills, autofill_tailor_sessions, suggest_credits_used")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle(),
  ]);

  const p = (profile ?? {}) as Record<string, unknown>;

  // ── Identity ────────────────────────────────────────────────────────────────
  const fullName   = (p.full_name as string | null) ?? "";
  const nameParts  = fullName.trim().split(/\s+/);
  const firstName  = (p.first_name as string | null) ?? nameParts[0] ?? "";
  const lastName   = (p.last_name  as string | null) ?? nameParts.slice(1).join(" ") ?? "";

  // ── Compensation ─────────────────────────────────────────────────────────────
  // current_ctc is the live unified column. expected_salary_min/max are the range.

  // ── Work preferences ─────────────────────────────────────────────────────────
  const noticePeriod     = (p.notice_period as string | null) ?? null;
  const noticePeriodDays = noticePeriod !== null ? (NOTICE_PERIOD_DAYS[noticePeriod] ?? null) : null;

  // ── Credits ──────────────────────────────────────────────────────────────────
  const tier         = (p.tier as string | null) ?? "free";
  const dailyCredits = (p.daily_credits  as number | null) ?? 0;
  const topupCredits = (p.topup_credits  as number | null) ?? 0;
  const bonusCredits = (p.bonus_credits  as number | null) ?? 0;

  // ── Usage ────────────────────────────────────────────────────────────────────
  const u = (usageRow ?? {}) as Record<string, number>;
  const usage = {
    evaluations_today:           u.evaluations             ?? 0,
    resumes_today:               u.resumes                 ?? 0,
    autofills_today:             u.autofills               ?? 0,
    autofill_tailor_today:       u.autofill_tailor_sessions ?? 0,
    suggest_credits_used_today:  u.suggest_credits_used    ?? 0,
  };

  return NextResponse.json({
    // ── Identity ──────────────────────────────────────────────────────────────
    full_name:        fullName,
    first_name:       firstName,
    last_name:        lastName,
    middle_name:      (p.middle_name     as string | null) ?? null,
    preferred_name:   (p.preferred_name  as string | null) ?? null,
    name_prefix:      (p.name_prefix     as string | null) ?? null,
    fathers_name:     (p.fathers_name    as string | null) ?? null,

    // ── Contact ───────────────────────────────────────────────────────────────
    email:              (p.email              as string | null) ?? "",
    phone:              (p.phone              as string | null) ?? null,
    phone_country_code: (p.phone_country_code as string | null) ?? null,
    alternate_phone:    (p.alternate_phone    as string | null) ?? null,

    // ── Address ───────────────────────────────────────────────────────────────
    street_address:         (p.street_address         as string | null)  ?? null,
    address_line2:          (p.address_line2          as string | null)  ?? null,
    city:                   (p.city                   as string | null)  ?? null,
    state_province:         (p.state_province         as string | null)  ?? null,
    zip_postal:             (p.zip_postal             as string | null)  ?? null,
    country:                (p.country                as string | null)  ?? null,
    nationality:            (p.nationality            as string | null)  ?? null,
    permanent_address_same: (p.permanent_address_same as boolean | null) ?? true,
    permanent_address:      (p.permanent_address      as string | null)  ?? null,

    // ── Online presence ───────────────────────────────────────────────────────
    linkedin:   (p.linkedin_url   as string | null) ?? null,
    github:     (p.github_url     as string | null) ?? null,
    website:    (p.portfolio_url  as string | null) ?? null,
    naukri_url: (p.naukri_url     as string | null) ?? null,

    // ── Compensation ──────────────────────────────────────────────────────────
    salary_currency:      (p.salary_currency      as string | null) ?? "INR",
    current_ctc:          (p.current_ctc          as number | null) ?? null,
    expected_salary_min:  (p.expected_salary_min  as number | null) ?? null,
    expected_salary_max:  (p.expected_salary_max  as number | null) ?? null,

    // ── Work preferences ──────────────────────────────────────────────────────
    years_experience:    (p.years_experience    as number | null)  ?? null,
    seniority:           (p.seniority           as string | null)  ?? null,
    work_mode:           (p.work_mode           as string | null)  ?? null,
    notice_period:       noticePeriod,
    notice_period_days:  noticePeriodDays,
    notice_period_note:  (p.notice_period_note  as string | null)  ?? null,
    available_from:      (p.available_from      as string | null)  ?? null,
    willing_to_relocate: (p.willing_to_relocate as boolean | null) ?? null,
    open_to_hybrid:      (p.open_to_hybrid      as boolean)        ?? false,
    sponsorship_needed:  (p.sponsorship_needed  as boolean | null) ?? null,
    work_authorization:  (p.work_authorization  as string | null)  ?? null,
    authorized_countries:(p.authorized_countries as string[])      ?? [],
    target_roles:        (p.target_roles        as string[])       ?? [],

    // ── Demographics ──────────────────────────────────────────────────────────
    dob:                  (p.dob                  as string | null)  ?? null,
    gender:               (p.gender               as string | null)  ?? null,
    pronouns:             (p.pronouns             as string | null)  ?? null,
    marital_status:       (p.marital_status       as string | null)  ?? null,
    category:             (p.category             as string | null)  ?? null,
    race_ethnicity:       (p.race_ethnicity       as string | null)  ?? null,
    veteran_status:       (p.veteran_status       as string | null)  ?? null,
    disability_status:    (p.disability_status    as string | null)  ?? null,
    hispanic_or_latino:   (p.hispanic_or_latino   as boolean | null) ?? null,
    lgbtq_member:         (p.lgbtq_member         as boolean | null) ?? null,
    accommodation_needed: (p.accommodation_needed as string | null)  ?? null,
    indian_army_veteran:  (p.indian_army_veteran  as boolean | null) ?? null,
    government_ids:       (p.government_ids       as Record<string, unknown>) ?? {},

    // ── CV ────────────────────────────────────────────────────────────────────
    skills:         (p.skills         as string[])      ?? [],
    languages:      (p.languages      as string[])      ?? [],
    work_experience:(p.work_experience as unknown[])    ?? [],
    education:      (p.education      as unknown[])     ?? [],
    certifications: (p.certifications as unknown[])     ?? [],
    projects:       (p.projects       as unknown[])     ?? [],

    // ── Autofill helpers ──────────────────────────────────────────────────────
    referral_source: (p.referral_source as string | null)    ?? null,
    qa_library:      (p.qa_library      as unknown[])        ?? [],

    // ── Tier + credits ────────────────────────────────────────────────────────
    tier,
    daily_credits:          dailyCredits,
    topup_credits:          topupCredits,
    bonus_credits:          bonusCredits,
    daily_credits_reset_at: (p.daily_credits_reset_at as string | null) ?? null,
    usage,
  });
}
