/**
 * POST /api/razorpay/verify-payment
 *
 * Fast-path verification called by the frontend immediately after checkout.
 * The webhook is the authoritative ground truth; this gives instant UI feedback.
 *
 * Subscription payments: body has razorpay_subscription_id
 *   Signature = HMAC-SHA256(payment_id + "|" + subscription_id, KEY_SECRET)
 *
 * Topup payments: body has razorpay_order_id
 *   Signature = HMAC-SHA256(order_id + "|" + payment_id, KEY_SECRET)
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/security/csrf";
import { getCommerceConfig, CommerceConfigUnavailableError } from "@/lib/commerce/config";

function rzpAuth() {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
  return { auth: Buffer.from(`${keyId}:${keySecret}`).toString("base64"), keySecret };
}

function verifyOrderSignature(orderId: string, paymentId: string, signature: string): boolean {
  const { keySecret } = rzpAuth();
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function verifySubscriptionSignature(paymentId: string, subId: string, signature: string): boolean {
  const { keySecret } = rzpAuth();
  const expected = createHmac("sha256", keySecret).update(`${paymentId}|${subId}`).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

async function fetchRazorpayOrder(orderId: string) {
  const { auth } = rzpAuth();
  const res = await fetch(`https://api.razorpay.com/v1/orders/${orderId}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Razorpay order fetch failed: ${res.status}`);
  return res.json() as Promise<{
    id: string;
    amount?: number;
    notes?: { type?: string; plan?: string; period?: string; pack_id?: string; user_id?: string };
  }>;
}

async function fetchRazorpaySubscription(subId: string) {
  const { auth } = rzpAuth();
  const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subId}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Razorpay subscription fetch failed: ${res.status}`);
  return res.json() as Promise<{
    id: string;
    plan_id: string;
    notes?: Record<string, string>;
  }>;
}

async function fetchRazorpayPayment(paymentId: string) {
  const { auth } = rzpAuth();
  const res = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Razorpay payment fetch failed: ${res.status}`);
  return res.json() as Promise<{ id: string; amount: number; subscription_id?: string }>;
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    razorpay_payment_id?:      string;
    razorpay_order_id?:        string;
    razorpay_subscription_id?: string;
    razorpay_signature?:       string;
  };

  const { razorpay_payment_id, razorpay_signature } = body;
  if (!razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  const admin = createAdminClient();

  // ── Subscription payment ─────────────────────────────────────────────────
  if (body.razorpay_subscription_id) {
    const subId = body.razorpay_subscription_id;

    if (!verifySubscriptionSignature(razorpay_payment_id, subId, razorpay_signature)) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    let subscription: Awaited<ReturnType<typeof fetchRazorpaySubscription>>;
    let payment: Awaited<ReturnType<typeof fetchRazorpayPayment>>;
    try {
      [subscription, payment] = await Promise.all([
        fetchRazorpaySubscription(subId),
        fetchRazorpayPayment(razorpay_payment_id),
      ]);
    } catch (err) {
      console.error("[verify-payment] fetch failed:", (err as Error).message);
      return NextResponse.json({ error: "Could not verify payment with Razorpay" }, { status: 502 });
    }

    const notes = subscription.notes ?? {};

    // Ensure subscription belongs to authenticated user
    if (notes.user_id !== user.id) {
      return NextResponse.json({ error: "Subscription does not belong to this account" }, { status: 403 });
    }

    const plan   = notes.plan as "starter" | "pro" | undefined;
    const period = notes.period as "monthly" | "yearly" | undefined;
    if (!plan || !period) {
      return NextResponse.json({ error: "Subscription missing plan or period" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: status, error: applyErr } = await (admin.rpc as any)("apply_subscription_payment", {
      p_user_id:             user.id,
      p_razorpay_payment_id: razorpay_payment_id,
      p_razorpay_sub_id:     subId,
      p_razorpay_order_id:   null,
      p_plan:                plan,
      p_period:              period,
      p_amount_paise:        payment.amount,
    });
    if (applyErr) {
      console.error("[verify-payment] apply_subscription_payment failed:", applyErr.message);
      return NextResponse.json({ error: "Failed to activate subscription" }, { status: 500 });
    }
    return NextResponse.json({ ok: true, tier: plan, already_processed: status === "already_processed" });
  }

  // ── Topup payment (order) ────────────────────────────────────────────────
  if (body.razorpay_order_id) {
    const orderId = body.razorpay_order_id;

    if (!verifyOrderSignature(orderId, razorpay_payment_id, razorpay_signature)) {
      return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
    }

    let order: Awaited<ReturnType<typeof fetchRazorpayOrder>>;
    try {
      order = await fetchRazorpayOrder(orderId);
    } catch (err) {
      console.error("[verify-payment] order fetch failed:", (err as Error).message);
      return NextResponse.json({ error: "Could not verify order" }, { status: 502 });
    }

    const notes = order.notes ?? {};
    if (notes.user_id !== user.id) {
      return NextResponse.json({ error: "Order does not belong to this account" }, { status: 403 });
    }
    if (notes.type !== "topup" || !notes.pack_id) {
      return NextResponse.json({ error: "Invalid order type" }, { status: 400 });
    }

    let commerce;
    try {
      commerce = await getCommerceConfig();
    } catch (err) {
      if (err instanceof CommerceConfigUnavailableError) {
        return NextResponse.json({ error: "Billing temporarily unavailable" }, { status: 503 });
      }
      throw err;
    }

    const pack = commerce.topupPacks.find((p) => p.id === notes.pack_id);
    if (!pack) return NextResponse.json({ error: "Invalid pack" }, { status: 400 });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: status, error: applyErr } = await (admin.rpc as any)("apply_topup_payment", {
      p_user_id:             user.id,
      p_pack_id:             pack.id,
      p_credits:             pack.credits,
      p_amount_paise:        order.amount ?? 0,
      p_razorpay_payment_id: razorpay_payment_id,
      p_razorpay_order_id:   orderId,
    });
    if (applyErr) {
      console.error("[verify-payment] apply_topup_payment failed:", applyErr.message);
      return NextResponse.json({ error: "Failed to credit account" }, { status: 500 });
    }
    if (status === "cap_exceeded") {
      return NextResponse.json({ error: "Topup would exceed your plan credit cap" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, credits_added: pack.credits, already_processed: status === "already_processed" });
  }

  return NextResponse.json({ error: "Missing razorpay_order_id or razorpay_subscription_id" }, { status: 400 });
}
