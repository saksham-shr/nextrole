/**
 * POST /api/razorpay/refund
 *
 * Admin-only. Issues a refund via the Razorpay REST API.
 * Razorpay will fire a refund.processed webhook once the funds clear,
 * which is where the user's tier/credits are actually updated.
 *
 * Body: { payment_id: string; amount_paise?: number }
 * Omit amount_paise for a full refund; include it for a partial refund.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isSameOrigin } from "@/lib/security/csrf";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

async function razorpayRefund(
  paymentId: string,
  amountPaise?: number,
): Promise<{ id: string; amount: number }> {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const body = amountPaise ? JSON.stringify({ amount: amountPaise }) : "{}";

  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
    method:  "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body,
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay refund failed (${res.status}): ${err}`);
  }

  return res.json() as Promise<{ id: string; amount: number }>;
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Admin only
  if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({})) as {
    payment_id?: string;
    amount_paise?: number;
  };

  if (!body.payment_id) {
    return NextResponse.json({ error: "payment_id is required" }, { status: 400 });
  }

  try {
    const refund = await razorpayRefund(body.payment_id, body.amount_paise);
    return NextResponse.json({ ok: true, refund_id: refund.id, amount_paise: refund.amount });
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error("[refund] Razorpay error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
