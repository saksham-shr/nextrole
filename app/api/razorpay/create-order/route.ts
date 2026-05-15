/**
 * POST /api/razorpay/create-order
 *
 * Creates a Razorpay order for plan purchase or credit top-up.
 * Uses direct REST API instead of the SDK to avoid Next.js compatibility issues.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { TOPUP_PACKS, type TopupPackId } from "@/lib/ai/gates";
import { INR_PRICES } from "@/lib/hooks/use-currency";
import { isSameOrigin } from "@/lib/security/csrf";

const PLAN_AMOUNTS: Record<string, number> = {
  starter_monthly: INR_PRICES.starter_monthly * 100,
  starter_yearly:  INR_PRICES.starter_yearly  * 100,
  pro_monthly:     INR_PRICES.pro_monthly     * 100,
  pro_yearly:      INR_PRICES.pro_yearly      * 100,
};

async function createRazorpayOrder(payload: {
  amount: number;
  currency: string;
  receipt: string;
  notes: Record<string, string>;
}) {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");

  const auth = Buffer.from(`${keyId}:${keySecret}`).toString("base64");

  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method:  "POST",
    headers: {
      "Authorization": `Basic ${auth}`,
      "Content-Type":  "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay API error ${res.status}: ${err}`);
  }

  return res.json() as Promise<{ id: string; amount: number; currency: string }>;
}

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({})) as {
    type?: string;
    plan?: "starter" | "pro";
    period?: "monthly" | "yearly";
    pack_id?: string;
  };

  let amountPaise: number;
  let receipt: string;
  let notes: Record<string, string>;

  if (body.type === "topup") {
    const pack = TOPUP_PACKS.find((p) => p.id === (body.pack_id as TopupPackId));
    if (!pack) return NextResponse.json({ error: "Invalid top-up pack" }, { status: 400 });

    const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
    if ((user.email ?? "").toLowerCase() !== ADMIN_EMAIL) {
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

    amountPaise = pack.inr * 100;
    receipt     = `topup-${pack.id}-${user.id.slice(0, 8)}-${Date.now()}`;
    notes       = { type: "topup", pack_id: pack.id, credits: String(pack.credits), user_id: user.id };

  } else if (body.type === "subscription") {
    if (!body.plan || !body.period) {
      return NextResponse.json({ error: "plan and period required" }, { status: 400 });
    }
    const key = `${body.plan}_${body.period}`;
    amountPaise = PLAN_AMOUNTS[key];
    if (!amountPaise) return NextResponse.json({ error: "Unknown plan" }, { status: 400 });

    receipt = `sub-${body.plan}-${body.period}-${user.id.slice(0, 8)}-${Date.now()}`;
    notes   = { type: "subscription", plan: body.plan, period: body.period, user_id: user.id };

  } else {
    return NextResponse.json({ error: "type must be 'subscription' or 'topup'" }, { status: 400 });
  }

  if (amountPaise < 100) {
    return NextResponse.json({ error: "Amount too small (min ₹1)" }, { status: 400 });
  }

  try {
    const order = await createRazorpayOrder({ amount: amountPaise, currency: "INR", receipt, notes });
    return NextResponse.json({
      order_id: order.id,
      amount:   order.amount,
      currency: order.currency,
      key_id:   process.env.RAZORPAY_KEY_ID,
    });
  } catch (err) {
    const msg = (err as Error).message ?? String(err);
    console.error("[razorpay] create-order error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
