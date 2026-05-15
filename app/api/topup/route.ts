/**
 * POST /api/topup
 * Pro-only. Creates a Razorpay order for a credit top-up pack.
 * Returns { order_id, amount, currency, key_id } — frontend opens the Razorpay modal.
 * Actual credit allocation happens via /api/razorpay/verify-payment after checkout.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TOPUP_PACKS, type TopupPackId } from "@/lib/ai/gates";
import { isSameOrigin } from "@/lib/security/csrf";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const isAdmin = (user.email ?? "").toLowerCase() === ADMIN_EMAIL;

  if (!isAdmin) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("tier, subscription_status")
      .eq("id", user.id)
      .single();

    if (profile?.tier !== "pro") {
      return NextResponse.json({ error: "Top-ups require an active Pro subscription" }, { status: 403 });
    }

    if (profile?.subscription_status !== "active") {
      return NextResponse.json({ error: "Your Pro subscription is not active" }, { status: 403 });
    }
  }

  const body = await req.json().catch(() => ({})) as { pack_id?: string };
  const pack = TOPUP_PACKS.find((p) => p.id === (body.pack_id as TopupPackId));
  if (!pack) return NextResponse.json({ error: "Invalid top-up pack" }, { status: 400 });

  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) {
    return NextResponse.json({ error: "Payment not configured" }, { status: 503 });
  }

  try {
    const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method:  "POST",
      headers: { "Authorization": `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount:   pack.inr * 100,
        currency: "INR",
        receipt:  `topup-${pack.id}-${user.id.slice(0, 8)}-${Date.now()}`,
        notes:    { type: "topup", pack_id: pack.id, credits: String(pack.credits), user_id: user.id },
      }),
    });
    if (!res.ok) throw new Error(`Razorpay ${res.status}`);
    const order = await res.json() as { id: string; amount: number; currency: string };

    return NextResponse.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId, pack });
  } catch (err) {
    console.error("[topup] razorpay order error", err);
    return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 });
  }
}
