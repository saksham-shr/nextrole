/**
 * GET /api/cron/subscription-expiry
 * Runs nightly via Vercel Cron at 01:00 UTC (see vercel.json).
 *
 * Calls two RPCs in sequence:
 *   1. expire_cancelled_subscriptions() — downgrades users whose
 *      subscription_ends_at has passed and status is 'cancelled'.
 *   2. forfeit_topup_after_grace() — zeros topup_credits for users in
 *      'halted' status whose topup_forfeit_at grace window has expired,
 *      then downgrades them to free.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    console.error("[cron/subscription-expiry] CRON_SECRET is not configured — refusing all requests");
    return NextResponse.json({ error: "Cron not configured" }, { status: 503 });
  }
  const provided = req.headers.get("authorization");
  if (provided !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [{ data: expired, error: expiredErr }, { data: forfeited, error: forfeitErr }] = await Promise.all([
    (admin.rpc as any)("expire_cancelled_subscriptions"),
    (admin.rpc as any)("forfeit_topup_after_grace"),
  ]);

  if (expiredErr) console.error("[cron/subscription-expiry] expire_cancelled_subscriptions failed:", expiredErr.message);
  if (forfeitErr) console.error("[cron/subscription-expiry] forfeit_topup_after_grace failed:", forfeitErr.message);

  if (expiredErr && forfeitErr) {
    return NextResponse.json({ error: "Both RPCs failed" }, { status: 500 });
  }

  return NextResponse.json({
    expired:  expired  ?? 0,
    forfeited: forfeited ?? 0,
  });
}
