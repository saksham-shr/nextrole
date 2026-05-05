/**
 * POST /api/extension/job
 * Auth: Bearer <extension_token>
 *
 * Creates a job in the pipeline from the browser extension.
 * Respects job slot limits and trial/tier gating.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserFromJWT } from "@/lib/extension-auth";
import { jobLimit } from "@/lib/ai/gates";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

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
  const resolved = await resolveUserFromJWT(token);

  if (!resolved) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { userId, tier } = resolved;

  // Check job slot limit
  const limit = jobLimit(tier as Parameters<typeof jobLimit>[0]);
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

  const body = await request.json().catch(() => ({})) as {
    title?: string;
    company?: string;
    url?: string;
    description?: string;
    source?: string;
  };

  const title   = body.title?.trim();
  const company = body.company?.trim();

  if (!title || !company) {
    return NextResponse.json({ error: "title and company are required" }, { status: 400 });
  }

  const { data: job, error } = await supabase
    .from("jobs")
    .insert({
      user_id:     userId,
      title,
      company,
      url:         body.url?.trim()         || null,
      description: body.description?.trim() || null,
      source:      body.source              ?? "extension",
      status:      "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, job_id: job.id, title, company });
}
