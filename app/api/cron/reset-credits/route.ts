/**
 * GET /api/cron/reset-credits
 * Runs nightly at midnight UTC via Vercel Cron.
 *
 * Resets each active paid user's daily base credits:
 *   Starter → 100/day  (simple set — no top-ups on Starter)
 *   Pro     → 300/day  + any unused top-up credits from this billing month
 *
 * Top-up credit tracking (Pro only):
 *   - Purchases are logged in usage_log with task_type="topup", credits_used=-N (negative = added)
 *   - At reset, we compute how many top-up credits remain this billing period:
 *       base_granted    = 300 × days elapsed this billing period
 *       topup_purchased = sum of topup entries since billing period start
 *       topup_consumed  = max(0, total_spent - base_granted)   ← base consumed first
 *       topup_remaining = max(0, topup_purchased - topup_consumed)
 *   - Top-up balance expires at end of billing period (subscription_ends_at).
 *     When subscription_expired fires the webhook zeroes credits, so no extra work here.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const BASE_CREDITS = { starter: 100, pro: 300 } as const;

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: users, error } = await admin
    .from("profiles")
    .select("id, tier, subscription_ends_at")
    .in("tier", ["starter", "pro"])
    .in("subscription_status", ["active", "past_due", "cancelled"]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!users || users.length === 0) return NextResponse.json({ reset: 0 });

  let reset = 0;
  let expired = 0;

  for (const user of users) {
    const tier = user.tier as "starter" | "pro";

    // Expire subscriptions that have passed their end date
    const endsAt = user.subscription_ends_at as string | null;
    if (endsAt && new Date(endsAt) < new Date()) {
      await admin.from("profiles").update({
        tier:                 "free",
        credits_remaining:    0,
        subscription_status:  "expired",
        subscription_ends_at: null,
      }).eq("id", user.id);
      expired++;
      continue;
    }

    if (tier === "starter") {
      await admin
        .from("profiles")
        .update({ credits_remaining: BASE_CREDITS.starter })
        .eq("id", user.id);
      reset++;
      continue;
    }

    // Pro: 300 base + preserved top-up balance
    // Billing period start = subscription_ends_at - 30 days (approximation)
    const billingStart = endsAt
      ? new Date(new Date(endsAt).getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ data: topupLog }, { data: spendLog }] = await Promise.all([
      admin
        .from("usage_log")
        .select("credits_used")
        .eq("user_id", user.id)
        .eq("task_type", "topup")
        .gte("created_at", billingStart),
      admin
        .from("usage_log")
        .select("credits_used")
        .eq("user_id", user.id)
        .neq("task_type", "topup")
        .gte("created_at", billingStart),
    ]);

    const topupPurchased = (topupLog ?? []).reduce(
      (s, r) => s + Math.abs((r as { credits_used: number }).credits_used),
      0,
    );

    if (topupPurchased === 0) {
      // No top-up this billing period — simple reset
      await admin
        .from("profiles")
        .update({ credits_remaining: BASE_CREDITS.pro })
        .eq("id", user.id);
      reset++;
      continue;
    }

    const totalSpent = (spendLog ?? []).reduce(
      (s, r) => s + Math.max(0, (r as { credits_used: number }).credits_used),
      0,
    );

    const daysElapsed  = Math.max(1, Math.floor((Date.now() - new Date(billingStart).getTime()) / 86_400_000));
    const baseGranted  = BASE_CREDITS.pro * daysElapsed;
    const topupConsumed  = Math.max(0, totalSpent - baseGranted);
    const topupRemaining = Math.max(0, topupPurchased - topupConsumed);

    await admin
      .from("profiles")
      .update({ credits_remaining: BASE_CREDITS.pro + topupRemaining })
      .eq("id", user.id);
    reset++;
  }

  return NextResponse.json({ reset, expired });
}
