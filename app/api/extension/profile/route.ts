/**
 * GET /api/extension/profile
 * Auth: Bearer <supabase_jwt>
 *
 * Returns the user's profile data for auto-filling job application forms.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserFromJWT } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

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

  const resolved = await resolveUserFromJWT(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;
  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email, base_cv, target_roles, target_locations, years_experience, seniority, comp_min, comp_max, work_mode")
    .eq("id", userId)
    .single();

  const contact = profile?.base_cv
    ? extractContact(profile.base_cv as string)
    : { phone: null, linkedin: null, github: null, website: null };

  const locations = (profile?.target_locations as string[] | null) ?? [];
  const location = locations[0] ?? null;
  const salary = profile?.comp_min ? String(profile.comp_min) : null;

  const fullName = (profile?.full_name as string | null) ?? "";
  const nameParts = fullName.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ") ?? "";

  return NextResponse.json({
    full_name:        fullName,
    first_name:       firstName,
    last_name:        lastName,
    email:            (profile?.email as string | null) ?? "",
    phone:            contact.phone,
    linkedin:         contact.linkedin,
    github:           contact.github,
    website:          contact.website,
    location,
    salary,
    years_experience: (profile?.years_experience as number | null) ?? null,
    seniority:        (profile?.seniority as string | null) ?? null,
    work_mode:        (profile?.work_mode as string | null) ?? null,
    target_roles:     (profile?.target_roles as string[] | null) ?? [],
  });
}
