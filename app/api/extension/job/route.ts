/**
 * POST /api/extension/job
 * Auth: Bearer <extension_token>
 *
 * Creates a job in the pipeline from the browser extension.
 * Respects job slot limits and trial/tier gating.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { canonicalizeJobUrl, deriveAtsFamilyFromUrl } from "@/lib/jobs";

// Job slot limits per tier (-1 = unlimited)
const JOB_SLOT_LIMITS: Record<string, number> = { free: 5, starter: 25, pro: -1 };

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`ext-job:get:${ip}`, 120, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = request.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });
  const canonicalUrl = canonicalizeJobUrl(url);

  const supabase = createAdminClient();
  let query = supabase
    .from("jobs")
    .select("id, title, company, status, url, canonical_url, ats_family")
    .eq("user_id", resolved.userId);

  query = canonicalUrl
    ? query.eq("canonical_url", canonicalUrl)
    : query.eq("url", url);

  const { data: job } = await query.maybeSingle();

  if (!job) return NextResponse.json({ exists: false });
  return NextResponse.json({
    exists: true,
    job_id: job.id,
    title: job.title,
    company: job.company,
    status: job.status,
    url: job.url,
    canonical_url: job.canonical_url,
    ats_family: job.ats_family,
  });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = rateLimit(`ext-job:post:${ip}`, 60, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const resolved = await resolveExtensionUser(token);

  if (!resolved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, tier } = resolved;

  const body = await request.json().catch(() => ({})) as {
    title?: string;
    company?: string;
    url?: string;
    description?: string;
    source?: string;
    ats_family?: string;
  };

  const title   = body.title?.trim();
  const company = body.company?.trim();
  const rawUrl = body.url?.trim() || null;
  const canonicalUrl = canonicalizeJobUrl(rawUrl);
  const atsFamily = body.ats_family?.trim() || deriveAtsFamilyFromUrl(rawUrl);

  if (!title || !company) {
    return NextResponse.json({ error: "title and company are required" }, { status: 400 });
  }

  const description = body.description?.trim() || null;
  const source = body.source ?? "extension";
  const now = new Date().toISOString();

  let existingJobId: string | null = null;
  if (canonicalUrl) {
    const { data: existing } = await supabase
      .from("jobs")
      .select("id")
      .eq("user_id", userId)
      .eq("canonical_url", canonicalUrl)
      .maybeSingle();
    existingJobId = existing?.id ?? null;
  }

  if (existingJobId) {
    const { data: updated, error } = await supabase
      .from("jobs")
      .update({
        title,
        company,
        url: rawUrl,
        canonical_url: canonicalUrl,
        description: description ?? undefined,
        source,
        ats_family: atsFamily,
        updated_at: now,
      })
      .eq("id", existingJobId)
      .eq("user_id", userId)
      .select("id")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, job_id: updated.id, created: false, existing: true, canonical_url: canonicalUrl, ats_family: atsFamily });
  }

  // Check job slot limit only for genuinely new jobs. Existing pipeline rows
  // must remain usable for Save & Apply, evaluation, and resume actions.
  const limit = JOB_SLOT_LIMITS[tier as string] ?? 5;
  if (limit !== -1) {
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        { error: "JOB_LIMIT_REACHED", limit, currentTier: tier },
        { status: 403 },
      );
    }
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      user_id:       userId,
      title,
      company,
      url:           rawUrl,
      canonical_url: canonicalUrl,
      description,
      source,
      ats_family:    atsFamily,
      status:        "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, job_id: job.id, title, company, created: true, existing: false, canonical_url: canonicalUrl, ats_family: atsFamily });
}
