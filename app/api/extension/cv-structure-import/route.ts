/**
 * POST /api/extension/cv-structure-import
 *
 * Webapp-only endpoint (uses Supabase session cookie, not extension token).
 *
 * Parses the logged-in user's base_cv with AI, then writes the result into the
 * structured columns (work_experience, education, certifications, skills) on
 * their profile. Returns the updated arrays so the client can re-render.
 *
 * This is the "Import from CV" button on the Profile page. One-time bootstrap.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider } from "@/lib/ai/providers";
import { resolveRoute } from "@/lib/ai/router";
import type {
  WorkExperienceEntry,
  EducationEntry,
  CertificationEntry,
  ProjectEntry,
  Database,
} from "@/lib/db/types";

type ProfileUpdate = Database["public"]["Tables"]["profiles"]["Update"];

const SYSTEM_PROMPT = `You are a CV parser. Extract structured data from the raw CV text.
Return ONLY valid JSON — no markdown, no prose, no code fences.

Use this exact structure:
{
  "work_experience": [
    { "role": "...", "company": "...", "start": "MM/YYYY or YYYY", "end": "MM/YYYY or YYYY or Present",
      "current": true|false, "location": "...", "description": "one-sentence summary",
      "employment_type": "full_time"|"part_time"|"contract"|"internship"|"freelance" }
  ],
  "education": [
    { "degree": "...", "institution": "...", "field": "...",
      "start": "YYYY", "end": "YYYY or Present", "grade": "8.5 CGPA or 89.5%" }
  ],
  "certifications": [
    { "title": "...", "issuer": "...", "year": "YYYY", "url": "..." }
  ],
  "projects": [
    { "title": "...", "description": "...", "tech": ["..."], "url": "..." }
  ],
  "skills": ["..."]
}

Rules:
- Reverse chronological order for work_experience and education.
- Current job → "end": "Present", "current": true.
- Omit any key with no data.
- Return empty arrays where a section is absent — never omit the top-level keys.
- skills: 10–30 concrete technologies / tools, no soft skills.`;

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("base_cv")
    .eq("id", user.id)
    .single();

  const baseCv = (profile?.base_cv as string | null)?.trim() ?? "";
  if (!baseCv) return NextResponse.json({ error: "No CV text found in profile" }, { status: 400 });

  try {
    const route = resolveRoute("autofill");
    const raw = await callProvider({
      provider:  route.provider,
      apiKey:    route.apiKey,
      model:     route.model,
      system:    SYSTEM_PROMPT,
      user:      `Parse this CV:\n\n${baseCv.slice(0, 8000)}`,
      maxTokens: 2000,
      json:      true,
      fallbackModels: route.fallbackModels,
    });

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(raw); }
    catch {
      const m = raw.match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : {};
    }

    const work_experience = (Array.isArray(parsed.work_experience) ? parsed.work_experience : []) as WorkExperienceEntry[];
    const education       = (Array.isArray(parsed.education)       ? parsed.education       : []) as EducationEntry[];
    const certifications  = (Array.isArray(parsed.certifications)  ? parsed.certifications  : []) as CertificationEntry[];
    const projects        = (Array.isArray(parsed.projects)        ? parsed.projects        : []) as ProjectEntry[];
    const skills          = (Array.isArray(parsed.skills) ? parsed.skills.filter((s: unknown) => typeof s === "string") : []) as string[];

    const patch: ProfileUpdate = {
      work_experience,
      education,
      certifications,
      projects,
      skills,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from("profiles")
      .update(patch)
      .eq("id", user.id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({
      work_experience, education, certifications, projects, skills,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
