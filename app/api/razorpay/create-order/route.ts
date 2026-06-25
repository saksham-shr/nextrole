/**
 * POST /api/razorpay/create-order
 *
 * Subscriptions → creates a Razorpay Subscription (recurring billing).
 * Topups        → creates a Razorpay Order (one-time payment).
 *
 * Env vars required:
 *   RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET
 *   RAZORPAY_PLAN_STARTER_MONTHLY / _YEARLY
 *   RAZORPAY_PLAN_PRO_MONTHLY / _YEARLY
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOrigin } from "@/lib/security/csrf";
import { getCommerceConfig, CommerceConfigUnavailableError } from "@/lib/commerce/config";

function rzpAuth() {
  const keyId     = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret) throw new Error("Razorpay credentials not configured");
  return { auth: Buffer.from(`${keyId}:${keySecret}`).toString("base64"), keyId };
}

async function createRazorpaySubscription(payload: {
  plan_id:     string;
  total_count: number;
  notes:       Record<string, string>;
}) {
  const { auth } = rzpAuth();
  const res = await fetch("https://api.razorpay.com/v1/subscriptions", {
    method:  "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      plan_id:         payload.plan_id,
      total_count:     payload.total_count,
      quantity:        1,
      customer_notify: 1,
      notes:           payload.notes,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay subscription create failed ${res.status}: ${err}`);
  }
  return res.json() as Promise<{ id: string; status: string }>;
}

async function createRazorpayOrder(payload: {
  amount:   number;
  currency: string;
  receipt:  string;
  notes:    Record<string, string>;
}) {
  const { auth } = rzpAuth();
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method:  "POST",
    headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Razorpay order create failed ${res.status}: ${err}`);
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
    type?:    string;
    plan?:    "starter" | "pro";
    period?:  "monthly" | "yearly";
    pack_id?: string;
  };

  let commerce;
  try {
    commerce = await getCommerceConfig();
  } catch (err) {
    if (err instanceof CommerceConfigUnavailableError) {
      console.error("[create-order] commerce config unavailable:", err.message);
      return NextResponse.json({ error: "Billing temporarily unavailable" }, { status: 503 });
    }
    throw err;
  }

  const { keyId } = rzpAuth();
  const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
  const isAdmin = (user.email ?? "").toLowerCase() === ADMIN_EMAIL;

  // ── Subscription ────────────────────────────────────────────────────────────
  if (body.type === "subscription") {
    if (!body.plan || !body.period) {
      return NextResponse.json({ error: "plan and period required" }, { status: 400 });
    }

    const planEnabled =
      (body.plan === "starter" && commerce.flags.starter_enabled) ||
      (body.plan === "pro"     && commerce.flags.pro_enabled);
    if (!planEnabled) {
      return NextResponse.json({ error: `${body.plan} plan is temporarily disabled` }, { status: 503 });
    }

    // Double-subscription prevention
    if (!isAdmin) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("subscription_status, tier")
        .eq("id", user.id)
        .single();

      if (profile?.subscription_status === "active" && profile?.tier !== "free") {
        if (profile.tier === body.plan) {
          return NextResponse.json(
            { error: "You already have an active subscription to this plan" },
            { status: 409 },
          );
        }
        // Different plan — should use switch-plan route instead
        return NextResponse.json(
          { error: "Use the plan switch flow to change plans" },
          { status: 409 },
        );
      }
    }

    const planEnvKey = `RAZORPAY_PLAN_${body.plan.toUpperCase()}_${body.period.toUpperCase()}`;
    const planId = process.env[planEnvKey];
    const keyPrefix = process.env.RAZORPAY_KEY_ID?.slice(0, 12) ?? "NOT_SET";
    console.log(`[create-order] plan=${body.plan} period=${body.period} envKey=${planEnvKey} planId=${planId ?? "NOT_SET"} keyPrefix=${keyPrefix}`);
    if (!planId) {
      console.error(`[create-order] env var ${planEnvKey} not set`);
      return NextResponse.json({ error: "Plan not configured — contact support" }, { status: 503 });
    }

    // total_count: effectively perpetual (20 years)
    const totalCount = body.period === "yearly" ? 20 : 240;

    try {
      const sub = await createRazorpaySubscription({
        plan_id:     planId,
        total_count: totalCount,
        notes: {
          type:    "subscription",
          plan:    body.plan,
          period:  body.period,
          user_id: user.id,
        },
      });
      return NextResponse.json({ subscription_id: sub.id, key_id: keyId });
    } catch (err) {
      console.error("[create-order] subscription create error:", (err as Error).message);
      return NextResponse.json({ error: "Payment provider unavailable — try again shortly" }, { status: 500 });
    }
  }

  // ── Topup ───────────────────────────────────────────────────────────────────
  if (body.type === "topup") {
    if (!commerce.flags.topups_enabled) {
      return NextResponse.json({ error: "Top-ups are temporarily disabled" }, { status: 503 });
    }

    const pack = commerce.topupPacks.find((p) => p.id === body.pack_id);
    if (!pack) return NextResponse.json({ error: "Invalid top-up pack" }, { status: 400 });

    if (!isAdmin) {
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("profiles")
        .select("tier, subscription_status, credits_remaining")
        .eq("id", user.id)
        .single();

      if (!profile || (profile.tier !== "starter" && profile.tier !== "pro")) {
        return NextResponse.json({ error: "Top-ups require an active paid subscription" }, { status: 403 });
      }
      if (profile.subscription_status === "pending") {
        return NextResponse.json({ error: "Resolve your pending payment before buying top-ups" }, { status: 403 });
      }
      // Starter: only the mini (100cr) pack allowed
      if (profile.tier === "starter" && pack.id !== "mini") {
        return NextResponse.json({ error: "Starter plan only supports the 100 credit pack" }, { status: 403 });
      }
      // Starter: cap check (RPC also enforces, this is a fast preflight)
      if (profile.tier === "starter" && ((profile.credits_remaining as number) + pack.credits) > 500) {
        return NextResponse.json({ error: "Starter plan maximum topup balance is 500 credits" }, { status: 403 });
      }
    }

    try {
      const order = await createRazorpayOrder({
        amount:   pack.inr * 100,
        currency: "INR",
        receipt:  `topup-${pack.id}-${user.id.slice(0, 8)}-${Date.now()}`,
        notes:    { type: "topup", pack_id: pack.id, credits: String(pack.credits), user_id: user.id },
      });
      return NextResponse.json({ order_id: order.id, amount: order.amount, currency: order.currency, key_id: keyId });
    } catch (err) {
      console.error("[create-order] order create error:", (err as Error).message);
      return NextResponse.json({ error: "Payment provider unavailable — try again shortly" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "type must be 'subscription' or 'topup'" }, { status: 400 });
}
