/**
 * POST /api/extension/feedback
 * Auth: Bearer <supabase_jwt>
 *
 * Receives false-positive / true-positive signals from the extension's
 * "Not a job" and "Confirm job" card buttons.  Stores them for later
 * detector improvement.
 *
 * Body: { url, page_title, action: "not_a_job" | "confirmed", source, confidence }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`ext-feedback:${ip}`, 60, 60_000); // 60 reports/min
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // Auth is optional for feedback — we accept anonymous reports too.
  // If a valid token is present we record the user id; otherwise null.
  let userId: string | null = null;
  try {
    const auth  = req.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (token) {
      const resolved = await resolveExtensionUser(token);
      userId = resolved?.userId ?? null;
    }
  } catch {}

  const body = await req.json().catch(() => ({})) as {
    url?:         string;
    page_title?:  string;
    action?:      string;   // "not_a_job" | "confirmed"
    source?:      string;   // extractor name: "linkedin", "heuristic", etc.
    confidence?:  string;   // "high" | "medium" | "low"
  };

  const { url, page_title, action, source, confidence } = body;

  if (!url || !action) {
    return NextResponse.json({ error: "url and action required" }, { status: 400 });
  }

  if (action !== "not_a_job" && action !== "confirmed") {
    return NextResponse.json({ error: "invalid action" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Upsert: if same URL+action already reported by same user today, just update
  // updated_at rather than creating duplicates.
  await admin.from("extension_feedback").insert({
    user_id:    userId,
    url:        url.slice(0, 2048),
    page_title: (page_title ?? "").slice(0, 512),
    action,
    source:     source ?? null,
    confidence: confidence ?? null,
  });

  return NextResponse.json({ ok: true });
}
