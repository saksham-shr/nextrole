/**
 * POST /api/razorpay/cancel-subscription
 *
 * Marks the user's subscription as cancelled in the DB.
 * Access continues until subscription_ends_at — the nightly cron
 * (reset_paid_credits_batch) will downgrade them to free once that date passes.
 *
 * We do NOT call the Razorpay Subscriptions API here because the app uses
 * the Orders API (one-time payments per cycle), not recurring mandates.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/csrf";
import { sendCancellationEmail } from "@/lib/email/send";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Fetch current state — only allow cancellation if on a paid active plan.
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("tier, subscription_status, subscription_ends_at")
    .eq("id", user.id)
    .single();

  if (profileErr || !profile) {
    return NextResponse.json({ error: "Could not load profile" }, { status: 500 });
  }

  if (profile.tier === "free") {
    return NextResponse.json({ error: "You are on the Free plan — nothing to cancel" }, { status: 400 });
  }

  if (profile.subscription_status === "cancelled") {
    return NextResponse.json({ error: "Subscription is already cancelled" }, { status: 400 });
  }

  // Mark as cancelled — cron handles the actual downgrade when period ends.
  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ subscription_status: "cancelled" })
    .eq("id", user.id);

  if (updateErr) {
    console.error("[cancel-subscription] update failed:", updateErr.message);
    return NextResponse.json({ error: "Failed to cancel subscription" }, { status: 500 });
  }

  // Send confirmation email (fire-and-forget — don't block response).
  const accessUntil = profile.subscription_ends_at
    ? new Date(profile.subscription_ends_at as string)
    : new Date();

  sendCancellationEmail(user.email ?? "", profile.tier as string, accessUntil).catch((err) => {
    console.error("[cancel-subscription] email failed:", err);
  });

  return NextResponse.json({
    ok: true,
    access_until: profile.subscription_ends_at,
  });
}
