/**
 * POST /api/razorpay/switch-plan
 *
 * Handles plan upgrade (Starter→Pro) and downgrade (Pro→Starter).
 * Razorpay doesn't support in-place plan changes, so:
 *   1. Cancel existing subscription immediately on Razorpay
 *   2. Create new subscription at the new plan
 *   3. Return subscription_id for client-side Razorpay checkout
 *
 * On successful payment (via verify-payment), apply_subscription_payment
 * handles the tier switch and credit adjustment.
 *
 * Body: { plan: "starter" | "pro", period: "monthly" | "yearly" }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/security/csrf";

function rzpAuth() {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
  return { auth: Buffer.from(`${keyId}:${keySecret}`).toString("base64"), keyId };
}

async function cancelRazorpaySubscriptionImmediate(subId: string): Promise<void> {
  const { auth } = rzpAuth();
  const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subId}/cancel`, {
    method:  "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cancel_at_cycle_end: 0 }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay cancel failed (${res.status}): ${text}`);
  }
}

async function createRazorpaySubscription(payload: {
  plan_id: string; total_count: number; notes: Record<string, string>;
}) {
  const { auth } = rzpAuth();
  const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method:  "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id: payload.plan_id, total_count: payload.total_count,
      quantity: 1, customer_notify: 1, notes: payload.notes,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay subscription create failed ${res.status}: ${err}`);
  }
  return res.json() as Promise<{ id: string; status: string }>;
}

const DAILY_CREDITS: Record<string, number> = { starter: 100, pro: 300 };

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    plan?:   "starter" | "pro";
    period?: "monthly" | "yearly";
  };

  if (!body.plan || !body.period) {
    return NextResponse.json({ error: "plan and period required" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("tier, subscription_status, razorpay_subscription_id, credits_remaining")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  // Must be on an active paid plan to switch
  if (profile.subscription_status !== "active" || profile.tier === "free") {
    return NextResponse.json({ error: "You must have an active subscription to switch plans" }, { status: 400 });
  }

  // Can't switch to the same plan
  if (profile.tier === body.plan) {
    return NextResponse.json({ error: "You are already on this plan" }, { status: 409 });
  }

  const isUpgrade = profile.tier === "starter" && body.plan === "pro";

  // Get the new plan ID
  const planEnvKey = `RAZORPAY_PLAN_${body.plan.toUpperCase()}_${body.period.toUpperCase()}`;
  const planId = process.env[planEnvKey];
  if (!planId) {
    return NextResponse.json({ error: "Plan not configured — contact support" }, { status: 503 });
  }

  // Step 1: Cancel old subscription immediately on Razorpay
  const oldSubId = profile.razorpay_subscription_id as string | null;
  if (oldSubId) {
    try {
      await cancelRazorpaySubscriptionImmediate(oldSubId);
    } catch (err) {
      console.error("[switch-plan] cancel old sub failed:", (err as Error).message);
      return NextResponse.json({ error: "Could not cancel current subscription — try again" }, { status: 502 });
    }
  }

  // Step 2: Immediately adjust credits for upgrade (Starter→Pro: add difference)
  // For downgrade (Pro→Starter: cap daily_credits at 100)
  if (isUpgrade) {
    const current = (profile.credits_remaining as number) ?? 0;
    const proDailyMax = DAILY_CREDITS.pro;
    const starterDailyMax = DAILY_CREDITS.starter;
    const bonus = Math.min(proDailyMax - starterDailyMax, proDailyMax - current);
    if (bonus > 0) {
      await admin.from("profiles")
        .update({ credits_remaining: current + bonus })
        .eq("id", user.id);
    }
  } else {
    // Downgrade: cap credits_remaining at starter max
    const current = (profile.credits_remaining as number) ?? 0;
    const starterMax = DAILY_CREDITS.starter;
    if (current > starterMax) {
      await admin.from("profiles")
        .update({ credits_remaining: starterMax })
        .eq("id", user.id);
    }
  }

  // Step 3: Create new subscription
  const totalCount = body.period === "yearly" ? 20 : 240;
  const { keyId } = rzpAuth();

  try {
    const sub = await createRazorpaySubscription({
      plan_id:     planId,
      total_count: totalCount,
      notes: {
        type:    "subscription",
        plan:    body.plan,
        period:  body.period,
        user_id: user.id,
        switch_from: profile.tier as string,
      },
    });
    return NextResponse.json({ subscription_id: sub.id, key_id: keyId, is_upgrade: isUpgrade });
  } catch (err) {
    console.error("[switch-plan] create new sub failed:", (err as Error).message);
    return NextResponse.json({ error: "Could not create new subscription — contact support" }, { status: 500 });
  }
}
