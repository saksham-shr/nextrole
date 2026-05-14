import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`ext-app-session:post:${ip}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    session_id?: string | null;
    job_id?: string | null;
    source_tab_id?: number | null;
    source_url?: string | null;
    target_url?: string | null;
    ats_family?: string | null;
    status?: string | null;
    fill_started_at?: string | null;
    submitted_at?: string | null;
    failure_reason?: string | null;
  };

  const admin = createAdminClient();
  const now = new Date().toISOString();

  let sessionId = body.session_id ?? null;
  if (!sessionId && body.job_id && body.source_tab_id != null) {
    const { data: existing } = await admin
      .from("application_sessions")
      .select("id")
      .eq("user_id", resolved.userId)
      .eq("job_id", body.job_id)
      .eq("source_tab_id", body.source_tab_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    sessionId = existing?.id ?? null;
  }

  if (sessionId) {
    const { data, error } = await admin
      .from("application_sessions")
      .update({
        job_id: body.job_id ?? undefined,
        source_tab_id: body.source_tab_id ?? undefined,
        source_url: body.source_url ?? undefined,
        target_url: body.target_url ?? undefined,
        ats_family: body.ats_family ?? undefined,
        status: body.status ?? undefined,
        fill_started_at: body.fill_started_at ?? undefined,
        submitted_at: body.submitted_at ?? undefined,
        failure_reason: body.failure_reason ?? undefined,
        last_seen_at: now,
        updated_at: now,
      })
      .eq("id", sessionId)
      .eq("user_id", resolved.userId)
      .select("id, job_id, status, source_tab_id, target_url, ats_family, fill_started_at, submitted_at, failure_reason, last_seen_at")
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, session: data });
  }

  const { data, error } = await admin
    .from("application_sessions")
    .insert({
      user_id: resolved.userId,
      job_id: body.job_id ?? null,
      source_tab_id: body.source_tab_id ?? null,
      source_url: body.source_url ?? null,
      target_url: body.target_url ?? null,
      ats_family: body.ats_family ?? null,
      status: body.status ?? "intent",
      fill_started_at: body.fill_started_at ?? null,
      submitted_at: body.submitted_at ?? null,
      failure_reason: body.failure_reason ?? null,
      last_seen_at: now,
    })
    .select("id, job_id, status, source_tab_id, target_url, ats_family, fill_started_at, submitted_at, failure_reason, last_seen_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, session: data });
}
