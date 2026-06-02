/**
 * POST /api/cv/parse
 *
 * Accepts a resume as a file upload (PDF/DOCX/TXT/MD) OR raw text paste.
 * Extracts plain text, calls AI to pull structured profile fields, then
 * saves base_cv + fills relevant profile columns for the authenticated user.
 *
 * Request (multipart/form-data):
 *   file    — File (optional if text provided)
 *   text    — string (optional if file provided)
 *   save    — "true" | "false"  (default true) — whether to persist to DB
 *
 * Response: { words, profile_updates }
 *   profile_updates — the fields that were written to the profile row
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/csrf";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { callProvider, parseJSON } from "@/lib/ai/providers";
import { resolveRoute } from "@/lib/ai/router";
import type { ProfileRow } from "@/lib/db/types";

const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_EXTS = new Set(["md", "txt", "pdf", "docx"]);

const CV_PARSE_SYSTEM = `You are a structured data extractor. Parse the given resume/CV text and return ONLY valid JSON — no markdown, no prose, no code fences.

Extract every field you can find. Omit fields that are not present in the text. Return this exact shape (omit keys entirely if not found):

{
  "full_name": "...",
  "first_name": "...",
  "last_name": "...",
  "email": "...",
  "phone": "...",
  "location": "...",
  "linkedin": "...",
  "github": "...",
  "portfolio": "...",
  "years_experience": <integer>,
  "seniority": "<junior|mid|senior|staff|principal>",
  "target_roles": ["<role title>"],
  "current_comp": <integer monthly in INR if determinable, else omit>,
  "skills": ["<skill>"],
  "naukri_url": "...",
  "available_from": "<ISO date YYYY-MM-DD if mentioned, else omit>"
}

Rules:
- years_experience: integer, total career years (calculate from dates if possible)
- seniority: infer from title and years
- target_roles: up to 3 most relevant role titles this person would apply for
- skills: technical skills only, max 20
- Do NOT invent information — only extract what is explicitly in the CV`;

async function extractText(file: Blob, ext: string): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  if (ext === "md" || ext === "txt") return buffer.toString("utf-8");
  if (ext === "pdf") {
    const pdfParse = await import("pdf-parse");
    const parse = (pdfParse as unknown as { default: (b: Buffer) => Promise<{ text: string }> }).default ?? pdfParse;
    const result = await (parse as (b: Buffer) => Promise<{ text: string }>)(buffer);
    return result.text;
  }
  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }
  throw new Error("Unsupported extension");
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userKey = `cv-parse-user:${user.id}`;
  if (!(await rateLimit(userKey, 5, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const ipKey = `cv-parse-ip:${getClientIp(req)}`;
  if (!(await rateLimit(ipKey, 10, 60_000)).ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const contentLength = parseInt(req.headers.get("content-length") ?? "0", 10);
  if (contentLength > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
  }

  let rawText = "";

  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = await req.json().catch(() => null) as { text?: string; save?: boolean } | null;
    if (!body?.text?.trim()) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }
    rawText = body.text.trim();
  } else {
    // multipart/form-data
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: "Invalid multipart body" }, { status: 400 });
    }

    const file = formData.get("file");
    const pastedText = formData.get("text");

    if (pastedText && typeof pastedText === "string" && pastedText.trim()) {
      rawText = pastedText.trim();
    } else if (file instanceof Blob) {
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: "File too large (max 5 MB)" }, { status: 413 });
      }
      const name = (file as File).name ?? "";
      const ext = name.split(".").pop()?.toLowerCase() ?? "";
      if (!ALLOWED_EXTS.has(ext)) {
        return NextResponse.json({ error: "Unsupported file type. Use PDF, DOCX, TXT, or MD." }, { status: 415 });
      }
      try {
        rawText = await extractText(file, ext);
      } catch (err) {
        console.error("[cv/parse] extraction error:", err);
        return NextResponse.json({ error: "Failed to extract text from file" }, { status: 500 });
      }
    } else {
      return NextResponse.json({ error: "Provide a file or paste CV text" }, { status: 400 });
    }
  }

  rawText = rawText.replace(/\n{3,}/g, "\n\n").trim();
  if (!rawText) {
    return NextResponse.json({ error: "No readable text found" }, { status: 422 });
  }

  // ── AI field extraction ──────────────────────────────────────────────────────
  let route;
  try {
    route = resolveRoute("evaluate"); // lightweight task — reuse evaluate route
  } catch {
    // If no AI provider, just save the raw text without structured extraction
    await supabase.from("profiles").update({ base_cv: rawText, updated_at: new Date().toISOString() }).eq("id", user.id);
    const words = rawText.split(/\s+/).filter(Boolean).length;
    return NextResponse.json({ words, profile_updates: {} });
  }

  type ParsedFields = {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    location?: string;
    linkedin?: string;
    github?: string;
    portfolio?: string;
    years_experience?: number;
    seniority?: string;
    target_roles?: string[];
    current_comp?: number;
    skills?: string[];
    naukri_url?: string;
    available_from?: string;
  };

  let parsed: ParsedFields = {};
  try {
    const aiOutput = await callProvider({
      provider: route.provider,
      apiKey: route.apiKey,
      model: route.model,
      system: CV_PARSE_SYSTEM,
      user: `Parse this CV:\n\n${rawText.slice(0, 12000)}`,
      maxTokens: 800,
      json: true,
      fallbackModels: route.fallbackModels,
    });
    parsed = parseJSON(aiOutput) as ParsedFields;
  } catch (err) {
    console.error("[cv/parse] AI extraction failed (non-fatal):", err instanceof Error ? err.message : err);
    // Non-fatal: continue without structured fields
  }

  // ── Build profile update ─────────────────────────────────────────────────────
  type ProfileUpdate = Partial<Omit<ProfileRow, "id" | "email" | "created_at">>;
  const profileUpdate: ProfileUpdate = {
    base_cv: rawText,
    updated_at: new Date().toISOString(),
  };

  if (parsed.full_name)        profileUpdate.full_name        = parsed.full_name;
  if (parsed.first_name)       profileUpdate.first_name       = parsed.first_name;
  if (parsed.last_name)        profileUpdate.last_name        = parsed.last_name;
  if (parsed.phone)            profileUpdate.phone            = parsed.phone;
  if (parsed.location)         profileUpdate.street_address   = parsed.location;
  if (parsed.linkedin)         profileUpdate.linkedin_url     = parsed.linkedin;
  if (parsed.github)           profileUpdate.github_url       = parsed.github;
  if (parsed.portfolio)        profileUpdate.portfolio_url    = parsed.portfolio;
  if (typeof parsed.years_experience === "number") profileUpdate.years_experience = parsed.years_experience;
  if (parsed.seniority)        profileUpdate.seniority        = parsed.seniority as ProfileRow["seniority"];
  if (Array.isArray(parsed.target_roles) && parsed.target_roles.length > 0)
    profileUpdate.target_roles = parsed.target_roles;
  if (typeof parsed.current_comp === "number") profileUpdate.current_comp = parsed.current_comp;
  if (parsed.naukri_url)       profileUpdate.naukri_url       = parsed.naukri_url;
  if (parsed.available_from)   profileUpdate.available_from   = parsed.available_from;

  const { error: dbError } = await supabase.from("profiles").update(profileUpdate).eq("id", user.id);
  if (dbError) {
    console.error("[cv/parse] DB write failed:", dbError.message);
    return NextResponse.json({ error: "Could not save profile" }, { status: 500 });
  }

  const words = rawText.split(/\s+/).filter(Boolean).length;

  // Return which fields were written (excluding base_cv/timestamp) for the UI to show
  const { base_cv: _cv, updated_at: _ts, ...fieldsWritten } = profileUpdate as Record<string, unknown>;
  return NextResponse.json({ words, profile_updates: fieldsWritten });
}
