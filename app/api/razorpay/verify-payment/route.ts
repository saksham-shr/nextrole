/**
 * POST /api/razorpay/verify-payment
 *
 * Verifies the Razorpay payment signature and activates the plan or credits.
 * Called by the frontend immediately after a successful Razorpay Checkout.
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOPUP_PACKS, DAILY_CREDITS } from "@/lib/ai/gates";
import { isSameOrigin } from "@/lib/security/csrf";

function verifySignature(orderId: string, paymentId: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");
  return expected === signature;
}

function addPeriod(period: "monthly" | "yearly"): string {
  const d = new Date();
  if (period === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
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
    type?:    string;
    plan?:    "starter" | "pro";
    period?:  "monthly" | "yearly";
    pack_id?: string;
  };

  const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return NextResponse.json({ error: "Missing payment fields" }, { status: 400 });
  }

  if (!verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return NextResponse.json({ error: "Payment verification failed" }, { status: 400 });
  }

  const admin = createAdminClient();

  if (body.type === "topup") {
    const pack = TOPUP_PACKS.find((p) => p.id === body.pack_id);
    if (!pack) return NextResponse.json({ error: "Invalid pack" }, { status: 400 });

    const { data: profile } = await admin
      .from("profiles")
      .select("credits_remaining")
      .eq("id", user.id)
      .single();

    const current = (profile as { credits_remaining: number } | null)?.credits_remaining ?? 0;

    await Promise.all([
      admin.from("profiles")
        .update({ credits_remaining: current + pack.credits })
        .eq("id", user.id),
      admin.from("usage_log").insert({
        user_id:      user.id,
        task_type:    "topup",
        model:        "n/a",
        credits_used: -pack.credits,
        byok:         false,
      }),
    ]);

    return NextResponse.json({ ok: true, credits_added: pack.credits });
  }

  if (body.type === "subscription") {
    if (!body.plan || !body.period) {
      return NextResponse.json({ error: "plan and period required" }, { status: 400 });
    }

    await admin.from("profiles").update({
      tier:                 body.plan,
      credits_remaining:    DAILY_CREDITS[body.plan],
      subscription_status:  "active",
      subscription_ends_at: addPeriod(body.period),
      onboarding_completed: true,
    }).eq("id", user.id);

    return NextResponse.json({ ok: true, tier: body.plan });
  }

  return NextResponse.json({ error: "Unknown payment type" }, { status: 400 });
}
