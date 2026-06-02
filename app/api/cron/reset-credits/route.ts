/**
 * GET /api/cron/reset-credits
 * Runs nightly via Vercel Cron (see vercel.json for the schedule — the
 * schedule shown in vercel.json is the single source of truth).
 *
 * Calls the reset_paid_credits_batch() RPC, which in a single transactional
 * SQL pass:
 *   - Expires every paid user whose subscription_ends_at is in the past
 *     (downgrades them to free, zeroes credits, clears billing anchors).
 *   - Resets credits for surviving Starter users (flat 100).
 *   - Resets credits for surviving Pro users to 300 + topup carryover
 *     since billing_period_start (the carryover math respects each user's
 *     real billing period — not a hardcoded 30-day window).
 *
 * PERF-01: doing this server-side avoids per-user network round-trips and
 *   lets the job complete within the serverless function budget even with
 *   tens of thousands of paid users.
 *
 * BILL-01: the billing-period anchor for top-up math is the user's real
 *   billing_period_start (set at subscription create/renew time), not
 *   subscription_ends_at minus 30 days. Yearly subscribers now keep their
 *   purchased top-ups.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendExpiryWarningEmail } from "@/lib/email/send";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  // Fail closed: if the secret is unset, NO request is authorized.
  // Previously this route accepted the literal "Bearer undefined" credential
  // because the comparison was `Bearer ${process.env.CRON_SECRET}`.
  if (!expected) {
    console.error("[cron/reset-credits] CRON_SECRET is not configured — refusing all requests");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  const provided = req.headers.get("authorization");
  if (provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reset_paid_credits_batch");

  if (error) {
    console.error("[cron/reset-credits] RPC failed:", error.message);
    return NextResponse.json({ error: "reset failed" }, { status: 500 });
  }

  // RPC returns one row { reset_count, expired_count }.
  const row = Array.isArray(data) ? data[0] : data;

  // Send expiry warning emails to users whose subscription ends in 1–3 days
  // and who haven't been notified yet during this expiry window.
  try {
    const in3Days = new Date(Date.now() + 3 * 86_400_000).toISOString();
    const { data: expiring } = await admin
      .from("profiles")
      .select("id, email, tier, subscription_ends_at, subscription_expiry_notified_at")
      .eq("subscription_status", "active")
      .neq("tier", "free")
      .lte("subscription_ends_at", in3Days)
      .gt("subscription_ends_at", new Date().toISOString());

    if (expiring && expiring.length > 0) {
      for (const u of expiring) {
        // Skip if already notified during this expiry window
        if (u.subscription_expiry_notified_at &&
            new Date(u.subscription_expiry_notified_at) > new Date(u.subscription_ends_at as string)) {
          continue;
        }
        const accessUntil = new Date(u.subscription_ends_at as string);
        const daysLeft = Math.max(1, Math.ceil((accessUntil.getTime() - Date.now()) / 86_400_000));

        await sendExpiryWarningEmail(u.email as string, u.tier as string, daysLeft, accessUntil);
        await admin
          .from("profiles")
          .update({ subscription_expiry_notified_at: new Date().toISOString() })
          .eq("id", u.id);
      }
      console.log(`[cron/reset-credits] sent expiry warnings to ${expiring.length} user(s)`);
    }
  } catch (emailErr) {
    // Non-fatal — log and continue. The credit reset already succeeded.
    console.error("[cron/reset-credits] expiry warning emails failed:", emailErr);
  }

  return NextResponse.json({
    reset:   row?.reset_count   ?? 0,
    expired: row?.expired_count ?? 0,
  });
}
