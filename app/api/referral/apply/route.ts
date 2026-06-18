/**
 * POST /api/referral/apply
 *
 * Called during onboarding when a new user enters a referral code.
 * Sets referred_by on their profile and creates a pending referral_grants row.
 *
 * Body: { code: string }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/security/csrf";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as { code?: string };
  const code = body.code?.trim().toUpperCase();
  if (!code || code.length < 6) {
    return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Check user hasn't already applied a referral
  const { data: profile } = await admin
    .from("profiles")
    .select("referred_by, referral_code")
    .eq("id", user.id)
    .single();

  if (profile?.referred_by) {
    return NextResponse.json({ error: "You have already applied a referral code" }, { status: 409 });
  }

  // Can't refer yourself
  if (profile?.referral_code === code) {
    return NextResponse.json({ error: "You cannot use your own referral code" }, { status: 400 });
  }

  // Verify the referral code exists
  const { data: referrer } = await admin
    .from("profiles")
    .select("id")
    .eq("referral_code", code)
    .maybeSingle();

  if (!referrer) {
    return NextResponse.json({ error: "Referral code not found" }, { status: 404 });
  }

  // Set referred_by
  const { error: updateErr } = await admin
    .from("profiles")
    .update({ referred_by: code })
    .eq("id", user.id);

  if (updateErr) {
    console.error("[referral/apply] update failed:", updateErr.message);
    return NextResponse.json({ error: "Could not apply referral code" }, { status: 500 });
  }

  // Create a pending referral_grants row (threshold not yet met)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.from("referral_grants") as any).upsert({
    referrer_id: referrer.id,
    referee_id: user.id,
    referee_threshold_met: false,
    credits_awarded: 0,
  }, { onConflict: "referrer_id,referee_id" });

  return NextResponse.json({ ok: true });
}
