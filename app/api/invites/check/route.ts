/**
 * GET /api/invites/check?code=<uuid>
 * Public — no auth required (the code is an opaque UUID).
 * Returns { valid, tier } for a valid+unexpired+unused invite.
 * Never exposes the raw email to unauthenticated callers.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code") ?? "";
  if (!code) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    // Admin client not configured — only allow in explicit dev mode, never silently in production.
    if (process.env.NODE_ENV !== "production") {
      return NextResponse.json({ valid: true, tier: "pro" });
    }
    return NextResponse.json({ valid: false }, { status: 503 });
  }

  const { data: invite } = await admin
    .from("invites")
    .select("tier, expires_at, used_at")
    .eq("invite_code", code)
    .maybeSingle();

  if (!invite) {
    return NextResponse.json({ valid: false });
  }

  const expired = invite.expires_at && new Date(invite.expires_at) <= new Date();
  const used = !!invite.used_at;

  if (expired || used) {
    return NextResponse.json({ valid: false, expired: !!expired, used });
  }

  return NextResponse.json({ valid: true, tier: invite.tier ?? "pro" });
}
