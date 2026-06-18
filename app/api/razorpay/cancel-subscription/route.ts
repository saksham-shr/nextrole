/**
 * POST /api/razorpay/cancel-subscription
 *
 * Cancels the user's Razorpay subscription (stops future charges) and marks
 * the DB row as cancelled. Access continues until subscription_ends_at.
 * The nightly cron (expire_cancelled_subscriptions) downgrades them to free
 * once that date passes.
 *
 * Razorpay will also fire subscription.cancelled webhook which is idempotent.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/csrf";
import { sendCancellationEmail } from "@/lib/email/send";

async function cancelRazorpaySubscription(subId: string): Promise<void> {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  // cancel_at_cycle_end=1 lets the current paid period finish before cancelling
  const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subId}/cancel`, {
    method:  "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cancel_at_cycle_end: 1 }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay cancel failed (${res.status}): ${text}`);
  }
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("tier, subscription_status, subscription_ends_at, razorpay_subscription_id")
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

  // Cancel on Razorpay side first (at cycle end so current period is honoured).
  // If there's no stored sub ID (edge case), skip the API call — DB update still proceeds.
  const subId = profile.razorpay_subscription_id as string | null;
  if (subId) {
    try {
      await cancelRazorpaySubscription(subId);
    } catch (err) {
      console.error("[cancel-subscription] Razorpay cancel failed:", (err as Error).message);
      return NextResponse.json({ error: "Could not cancel with payment provider — please try again" }, { status: 502 });
    }
  } else {
    console.warn("[cancel-subscription] no razorpay_subscription_id on profile — skipping Razorpay API call");
  }

  const { error: updateErr } = await supabase
    .from("profiles")
    .update({ subscription_status: "cancelled" })
    .eq("id", user.id);

  if (updateErr) {
    console.error("[cancel-subscription] DB update failed:", updateErr.message);
    return NextResponse.json({ error: "Failed to update subscription status" }, { status: 500 });
  }

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
