/**
 * PATCH /api/extension/job/[id]
 * Auth: Bearer <extension_token>
 *
 * Updates a job's status (e.g. mark as "applied") from the browser extension.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { computeFollowupDueAt } from "@/lib/jobs";

const VALID_STATUSES = new Set(["applied", "interview", "offer", "rejected", "archived"]);

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ip = getClientIp(request);
  const rl = rateLimit(`ext-job:patch:${ip}`, 60, 60_000);
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
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({})) as { status?: string };
  if (!body.status || !VALID_STATUSES.has(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const now = new Date().toISOString();
  const nextFollowup = body.status === "applied" ? computeFollowupDueAt(now) : null;

  const { error } = await supabase
    .from("jobs")
    .update({
      status: body.status as "applied" | "interview" | "offer" | "rejected" | "archived",
      updated_at: now,
      ...(body.status === "applied"
        ? {
            applied_at: now,
            followup_due_at: nextFollowup,
            followup_state: "pending",
          }
        : {}),
    })
    .eq("id", id)
    .eq("user_id", resolved.userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from("job_events").insert({
    user_id: resolved.userId,
    job_id: id,
    event_type: "status_change",
    payload: {
      to: body.status,
      applied_at: body.status === "applied" ? now : null,
    },
  });

  return NextResponse.json({ ok: true });
}
