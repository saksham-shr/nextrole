/**
 * POST /api/razorpay/verify-payment
 *
 * Verifies the Razorpay payment signature and activates the plan or credits.
 * Called by the frontend immediately after a successful Razorpay Checkout.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_CREDITS } from "@/lib/ai/gates";
import { isSameOrigin } from "@/lib/security/csrf";
import { getCommerceConfig, CommerceConfigUnavailableError } from "@/lib/commerce/config";

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  // Constant-time compare — prevents timing-based signature recovery.
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface RazorpayOrder {
  id: string;
  amount?: number;   // in paise
  notes?: {
    type?: string;
    plan?: string;
    period?: string;
    pack_id?: string;
    user_id?: string;
  };
}

async function fetchRazorpayOrder(orderId: string): Promise<RazorpayOrder> {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
  const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Razorpay order fetch failed: ${res.status}`);
  return res.json() as Promise<RazorpayOrder>;
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    razorpay_order_id?:   string;
    razorpay_payment_id?: string;
    razorpay_signature?:  string;
  };

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  // Fetch entitlement parameters from Razorpay — never trust client body for these.
  let order: RazorpayOrder;
  try {
    order = await fetchRazorpayOrder(razorpay_order_id);
  } catch (err) {
    console.error("[verify-payment] order fetch failed:", (err as Error).message);
    return NextResponse.json({ error: "Could not verify order" }, { status: 502 });
  }

  const notes = order.notes ?? {};

  // Ensure this order belongs to the authenticated user.
  if (notes.user_id !== user.id) {
    return NextResponse.json({ error: "Order does not belong to this account" }, { status: 403 });
  }

  const admin = createAdminClient();

  if (notes.type === "topup") {
    let commerce;
    try {
      commerce = await getCommerceConfig();
    } catch (err) {
      if (err instanceof CommerceConfigUnavailableError) {
        console.error("[verify-payment] commerce config unavailable:", err.message);
        return NextResponse.json({ error: "Billing temporarily unavailable" }, { status: 503 });
      }
      throw err;
    }
    const pack = commerce.topupPacks.find((p) => p.id === notes.pack_id);
    if (!pack) return NextResponse.json({ error: "Invalid pack" }, { status: 400 });

    // Transactional apply: the dedup sentinel insert AND the credit
    // increment commit together inside apply_topup_payment. If the
    // entitlement write fails the sentinel rolls back, so a retry isn't
    // tricked into skipping the grant. Returns 'applied' or
    // 'already_processed'; any other failure raises and we surface 500.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: status, error: applyErr } = await (admin.rpc as any)("apply_topup_payment", {
      p_user_id:      user.id,
      p_payment_id:   razorpay_payment_id,
      p_credits:      pack.credits,
      p_amount_paise: order.amount ?? 0,
      p_pack_id:      pack.id,
      p_order_id:     razorpay_order_id,
    });
    if (applyErr) {
      console.error("[verify-payment] apply_topup_payment failed:", applyErr.message);
      return NextResponse.json({ error: "Failed to credit account" }, { status: 500 });
    }
    if (status === "already_processed") {
      return NextResponse.json({ ok: true, credits_added: pack.credits, already_processed: true });
    }
    return NextResponse.json({ ok: true, credits_added: pack.credits });
  }

  if (notes.type === "subscription") {
    const plan   = notes.plan as "starter" | "pro" | undefined;
    const period = notes.period as "monthly" | "yearly" | undefined;
    if (!plan || !period) {
      return NextResponse.json({ error: "Order missing plan or period" }, { status: 400 });
    }

    // Transactional apply: dedup sentinel + profile update commit
    // together. apply_subscription_payment reads the current
    // subscription_ends_at / billing_period_start inside the same
    // transaction and computes the extended end + preserved anchor.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: status, error: applyErr } = await (admin.rpc as any)("apply_subscription_payment", {
      p_user_id:       user.id,
      p_payment_id:    razorpay_payment_id,
      p_plan:          plan,
      p_period:        period,
      p_daily_credits: DAILY_CREDITS[plan],
      p_amount_paise:  order.amount ?? 0,
      p_order_id:      razorpay_order_id,
    });
    if (applyErr) {
      console.error("[verify-payment] apply_subscription_payment failed:", applyErr.message);
      return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
    }
    if (status === "already_processed") {
      return NextResponse.json({ ok: true, tier: plan, already_processed: true });
    }
    return NextResponse.json({ ok: true, tier: plan });
  }

  return NextResponse.json({ error: "Unknown payment type" }, { status: 400 });
}
