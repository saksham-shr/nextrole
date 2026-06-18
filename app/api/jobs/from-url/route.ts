/**
 * POST /api/jobs/from-url
 *
 * Accepts a job posting URL, fetches its content server-side, extracts
 * structured job details via AI, and creates a job record in the pipeline.
 *
 * Body: { url: string }
 *
 * Response: { job_id, title, company, status }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/security/csrf";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { callProvider, parseJSON } from "@/lib/ai/providers";
import { resolveRoute } from "@/lib/ai/router";
import { awardActionCredit } from "@/lib/credits/grant";

const FETCH_TIMEOUT_MS = 15_000;
const MAX_HTML_CHARS   = 80_000; // truncate before sending to AI

const JOB_EXTRACT_SYSTEM = `You are a job posting parser. Extract structured job details from the provided webpage text and return ONLY valid JSON — no markdown, no prose, no code fences.

Return this exact shape (omit keys that cannot be determined):

{
  "title": "<job title>",
  "company": "<company name>",
  "description": "<full job description text, max 4000 chars>",
  "location": "<city, state/country or 'Remote'>",
  "work_mode": "<remote|hybrid|onsite>",
  "comp_min": <integer annual in local currency, omit if unknown>,
  "comp_max": <integer annual in local currency, omit if unknown>
}

Rules:
- title and company are required. If you cannot find them, return { "error": "not_a_job_posting" }
- description: extract the full role description, responsibilities, and requirements. Strip HTML artefacts.
- work_mode: infer from location/description — default "onsite" if unclear
- comp_min/comp_max: extract only if explicitly stated; do not infer`;

function isAllowedUrl(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  // Block localhost, private ranges, and metadata endpoints
  if (
    host === "localhost" ||
    host === "127.0.0.1" ||
    host === "0.0.0.0" ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    host.startsWith("172.") ||
    host === "169.254.169.254" || // AWS metadata
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) return false;
  return url.protocol === "http:" || url.protocol === "https:";
}

function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const ip = getClientIp(req);
  const rl = await rateLimit(`jobs-from-url:${ip}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => null) as { url?: string } | null;
  if (!body?.url?.trim()) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(body.url.trim());
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!isAllowedUrl(parsed)) {
    return NextResponse.json({ error: "URL not allowed" }, { status: 400 });
  }

  // ── Fetch the page ───────────────────────────────────────────────────────────
  let pageText: string;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const res = await fetch(parsed.toString(), {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; NextRole/1.0; +https://nextrole.app)",
        "Accept": "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
    }).finally(() => clearTimeout(timer));

    if (!res.ok) {
      return NextResponse.json({ error: `Could not fetch URL (HTTP ${res.status})` }, { status: 422 });
    }
    const contentType = res.headers.get("content-type") ?? "";
    if (!contentType.includes("text/")) {
      return NextResponse.json({ error: "URL does not return an HTML page" }, { status: 422 });
    }
    const html = await res.text();
    pageText = htmlToText(html).slice(0, MAX_HTML_CHARS);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    if (msg.includes("abort") || msg.includes("timeout")) {
      return NextResponse.json({ error: "URL took too long to respond" }, { status: 422 });
    }
    return NextResponse.json({ error: `Could not fetch URL: ${msg}` }, { status: 422 });
  }

  if (!pageText.trim()) {
    return NextResponse.json({ error: "Page returned no readable content" }, { status: 422 });
  }

  // ── AI extraction ────────────────────────────────────────────────────────────
  let route;
  try {
    route = resolveRoute("evaluate");
  } catch {
    return NextResponse.json({ error: "AI provider not configured" }, { status: 503 });
  }

  type Extracted = {
    title?: string;
    company?: string;
    description?: string;
    location?: string;
    work_mode?: string;
    comp_min?: number;
    comp_max?: number;
    error?: string;
  };

  let extracted: Extracted;
  try {
    const aiOutput = await callProvider({
      provider: route.provider,
      apiKey: route.apiKey,
      model: route.model,
      system: JOB_EXTRACT_SYSTEM,
      user: `Extract job details from this page:\n\nURL: ${parsed.toString()}\n\n${pageText}`,
      maxTokens: 1200,
      json: true,
      fallbackModels: route.fallbackModels,
    });
    extracted = parseJSON(aiOutput) as Extracted;
  } catch (err) {
    console.error("[jobs/from-url] AI extraction failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Could not extract job details from this page" }, { status: 502 });
  }

  if (extracted.error === "not_a_job_posting" || !extracted.title || !extracted.company) {
    return NextResponse.json({ error: "This URL does not appear to contain a job posting" }, { status: 422 });
  }

  // ── Create job record ────────────────────────────────────────────────────────
  // Build description: prepend extracted metadata so evaluations have full context
  const metaLines: string[] = [];
  if (extracted.location) metaLines.push(`Location: ${extracted.location}`);
  if (extracted.work_mode) metaLines.push(`Work mode: ${extracted.work_mode}`);
  if (extracted.comp_min || extracted.comp_max) {
    const comp = [extracted.comp_min, extracted.comp_max].filter(Boolean).join("–");
    metaLines.push(`Compensation: ${comp}`);
  }
  const fullDescription = metaLines.length > 0
    ? `${metaLines.join("\n")}\n\n${extracted.description ?? ""}`
    : (extracted.description ?? "");

  const { data: job, error: insertErr } = await supabase.from("jobs").insert({
    user_id:       user.id,
    title:         extracted.title.slice(0, 200),
    company:       extracted.company.slice(0, 200),
    description:   fullDescription.slice(0, 12000) || null,
    url:           parsed.toString(),
    canonical_url: parsed.toString(),
    status:        "pending",
    source:        "url_paste",
  }).select("id, title, company, status").single();

  if (insertErr || !job) {
    console.error("[jobs/from-url] DB insert failed:", insertErr?.message);
    return NextResponse.json({ error: "Could not save job" }, { status: 500 });
  }

  // Award first_job grant for free-tier users (fire-and-forget)
  const admin = createAdminClient();
  awardActionCredit(admin, user.id, "first_job").catch(() => {});

  return NextResponse.json({ job_id: job.id, title: job.title, company: job.company, status: job.status });
}
