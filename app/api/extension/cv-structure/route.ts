/**
 * GET /api/extension/cv-structure
 * Auth: Bearer <extension token>
 *
 * Parses the user's base_cv into structured arrays for Workday modal auto-fill.
 * No credit cost — this is a utility that extracts data the user already provided.
 * The extension caches the result in chrome.storage.local for 24 hours.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { callProvider } from "@/lib/ai/providers";
import { resolveRoute } from "@/lib/ai/router";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

const SYSTEM_PROMPT = `You are a CV parser. Extract structured data from the raw CV text.
Return ONLY valid JSON — no markdown, no prose, no code fences.

Use this exact structure:
{
  "work_experience": [
    {
      "role": "<exact job title>",
      "company": "<exact company name>",
      "start": "<MM/YYYY or YYYY>",
      "end": "<MM/YYYY or YYYY or 'Present'>",
      "current": <true if this is the current job>,
      "description": "<one concise sentence summarising key responsibilities and achievements>"
    }
  ],
  "education": [
    {
      "degree": "<full degree name e.g. B.Tech Computer Science>",
      "institution": "<exact institution name>",
      "field": "<field of study, omit if already in degree>",
      "start": "<YYYY>",
      "end": "<YYYY or 'Present'>"
    }
  ],
  "certifications": [
    {
      "title": "<certification name>",
      "issuer": "<issuing body>",
      "year": "<YYYY>"
    }
  ]
}

Rules:
- List work_experience in reverse chronological order (most recent first).
- For the current job set "end": "Present" and "current": true.
- If a date is missing entirely, omit that key.
- certifications may be an empty array if none found.
- Return empty arrays if a section is absent — never omit the keys.`;

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`ext-cv-structure:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("base_cv")
    .eq("id", resolved.userId)
    .single();

  const baseCv = (profile?.base_cv as string | null) ?? "";
  if (!baseCv.trim()) {
    return NextResponse.json({
      work_experience: [],
      education: [],
      certifications: [],
    });
  }

  try {
    const route = resolveRoute("autofill");
    const raw = await callProvider({
      provider:  route.provider,
      apiKey:    route.apiKey,
      model:     route.model,
      system:    SYSTEM_PROMPT,
      user:      `Parse this CV:\n\n${baseCv.slice(0, 6000)}`,
      maxTokens: 1200,
      json:      true,
      fallbackModels: route.fallbackModels,
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : {};
    }

    return NextResponse.json({
      work_experience:  Array.isArray(parsed.work_experience)  ? parsed.work_experience  : [],
      education:        Array.isArray(parsed.education)        ? parsed.education        : [],
      certifications:   Array.isArray(parsed.certifications)   ? parsed.certifications   : [],
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
