/**
 * GET /api/extension/profile
 * Auth: Bearer <supabase_jwt>
 *
 * Returns the user's profile data for auto-filling job application forms,
 * plus tier and today's usage counts for gate checking in the extension.
 *
 * All fields are now served directly from the profiles table (migration
 * 20260511000001). The previous fallback that regex-extracted phone /
 * LinkedIn / GitHub from base_cv is kept as a SECONDARY fallback only —
 * primary source is the explicit DB columns.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { FREE_DAILY_LIMITS } from "@/lib/ai/gates";

function extractContact(cv: string) {
  const phoneMatch = cv.match(
    /(?:phone|tel|mobile|cell|contact)[^\n]{0,10}?(\+?1?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/i,
  ) ?? cv.match(/(\+\d{1,3}[\s.-]?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{4})/);
  const phone = phoneMatch?.[1]?.trim() ?? null;

  const linkedinMatch = cv.match(/(?:linkedin\.com\/in\/)([\w%-]+)/i);
  const linkedin = linkedinMatch ? `https://www.linkedin.com/in/${linkedinMatch[1]}` : null;

  const githubMatch = cv.match(/(?:github\.com\/)([\w-]+)/i);
  const github = githubMatch ? `https://github.com/${githubMatch[1]}` : null;

  const websiteMatch = cv.match(
    /https?:\/\/(?!(?:www\.)?(?:linkedin|github|twitter|x\.com|facebook|instagram|youtube))([\w-]+\.(?:com|io|dev|co|me|net|org)[\w/?=#%-]*)/i,
  );
  const website = websiteMatch?.[0]?.trim() ?? null;

  return { phone, linkedin, github, website };
}

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`ext-profile:${ip}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: profile } = await admin
    .from("profiles")
    .select([
      "full_name", "email", "base_cv",
      "target_roles", "target_locations", "years_experience", "seniority",
      "comp_min", "comp_max", "work_mode",
      "tier", "credits_remaining",
      // autofill columns (migration 20260511000001)
      "phone", "linkedin_url", "github_url", "portfolio_url",
      "country", "city", "state_province", "zip_postal", "street_address",
      "notice_period", "willing_to_relocate", "sponsorship_needed", "nationality",
      "gender", "pronouns", "race_ethnicity", "veteran_status", "disability_status",
      "work_experience", "education", "certifications", "skills",
    ].join(", "))
    .eq("id", userId)
    .single();

  const { data: usageRow } = await admin
    .from("daily_usage")
    .select("evaluations, resumes, autofills, autofill_credits_used")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  const p = (profile ?? {}) as Record<string, unknown>;

  // Fallback contact extraction if direct columns are empty AND base_cv exists.
  // This keeps existing users without filled profiles working until they
  // populate the new Profile page.
  const baseCv = (p.base_cv as string | null) ?? null;
  const fallback = baseCv && (!p.phone || !p.linkedin_url || !p.github_url || !p.portfolio_url)
    ? extractContact(baseCv)
    : { phone: null, linkedin: null, github: null, website: null };

  const phone     = (p.phone as string | null)         ?? fallback.phone    ?? null;
  const linkedin  = (p.linkedin_url as string | null)  ?? fallback.linkedin ?? null;
  const github    = (p.github_url as string | null)    ?? fallback.github   ?? null;
  const website   = (p.portfolio_url as string | null) ?? fallback.website  ?? null;

  // Location: prefer explicit `city`, fall back to target_locations[0]
  const locations = (p.target_locations as string[] | null) ?? [];
  const location  = (p.city as string | null) ?? locations[0] ?? null;

  const salary = p.comp_min ? String(p.comp_min) : null;

  const fullName = (p.full_name as string | null) ?? "";
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName  = nameParts.slice(1).join(" ") ?? "";

  const tier = (p.tier as string | null) ?? "free";
  const creditsRemaining = (p.credits_remaining as number | null) ?? 0;

  const row = usageRow as Record<string, number> | null;
  const usage = {
    evaluations_today:           row?.evaluations           ?? 0,
    resumes_today:               row?.resumes               ?? 0,
    autofills_today:             row?.autofills             ?? 0,
    autofill_credits_used_today: row?.autofill_credits_used ?? 0,
  };

  const limits = {
    evaluations_per_day: tier === "free" ? FREE_DAILY_LIMITS.evaluations : -1,
    resumes_per_day:     tier === "free" ? FREE_DAILY_LIMITS.resumes     : -1,
    autofills_per_day:   tier === "pro"  ? -1 : 0,
  };

  return NextResponse.json({
    // Core identity
    full_name:        fullName,
    first_name:       firstName,
    last_name:        lastName,
    email:            (p.email as string | null) ?? "",

    // Contact / links
    phone,
    linkedin,
    github,
    website,

    // Address
    country:          (p.country as string | null)        ?? null,
    location,
    city:             (p.city as string | null)           ?? null,
    state_province:   (p.state_province as string | null) ?? null,
    zip_postal:       (p.zip_postal as string | null)     ?? null,
    street_address:   (p.street_address as string | null) ?? null,
    nationality:      (p.nationality as string | null)    ?? null,

    // Work preferences
    salary,
    years_experience:    (p.years_experience as number | null) ?? null,
    seniority:           (p.seniority as string | null)        ?? null,
    work_mode:           (p.work_mode as string | null)        ?? null,
    notice_period:       (p.notice_period as string | null)    ?? null,
    willing_to_relocate: (p.willing_to_relocate as boolean | null) ?? null,
    sponsorship_needed:  (p.sponsorship_needed as boolean | null)  ?? null,
    target_roles:        (p.target_roles as string[] | null)  ?? [],

    // EEO / demographics
    gender:            (p.gender as string | null)            ?? null,
    pronouns:          (p.pronouns as string | null)          ?? null,
    race_ethnicity:    (p.race_ethnicity as string | null)    ?? null,
    veteran_status:    (p.veteran_status as string | null)    ?? null,
    disability_status: (p.disability_status as string | null) ?? null,

    // Structured CV data
    work_experience: (p.work_experience as unknown[] | null) ?? [],
    education:       (p.education as unknown[] | null)       ?? [],
    certifications:  (p.certifications as unknown[] | null)  ?? [],
    projects:        [],
    skills:          (p.skills as string[] | null)           ?? [],

    // Tier gating
    tier,
    credits_remaining: creditsRemaining,
    usage,
    limits,
  });
}
