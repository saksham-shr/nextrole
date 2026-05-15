/**
 * POST /api/webhooks/razorpay
 *
 * Handles Razorpay webhook events as a reliability layer on top of
 * the client-side verify-payment call. Razorpay signs events with
 * HMAC-SHA256 using RAZORPAY_WEBHOOK_SECRET.
 *
 * Register this URL in Razorpay Dashboard → Settings → Webhooks:
 *   https://nextrole.live/api/webhooks/razorpay
 * Active events: payment.captured, subscription.cancelled, subscription.completed
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { TOPUP_PACKS, DAILY_CREDITS } from "@/lib/ai/gates";

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    console.warn("[razorpay webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping signature check");
    return true; // allow during development when secret not yet configured
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return expected === signature;
}

interface RzpPaymentEntity {
  id: string;
  order_id: string;
  notes?: {
    type?: string;
    plan?: string;
    period?: string;
    pack_id?: string;
    credits?: string;
    user_id?: string;
  };
  email?: string;
  contact?: string;
  amount?: number;
  status?: string;
}

interface RzpWebhookEvent {
  event: string;
  payload: {
    payment?: { entity: RzpPaymentEntity };
    subscription?: { entity: { id: string; status: string; notes?: Record<string, string> } };
  };
}

export async function POST(request: NextRequest) {
  const rawBody   = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: RzpWebhookEvent;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const admin = createAdminClient();

  switch (event.event) {

    case "payment.captured": {
      const payment = event.payload.payment?.entity;
      if (!payment) break;

      const notes    = payment.notes ?? {};
      const userId   = notes.user_id;
      if (!userId) {
        console.warn("[razorpay webhook] payment.captured: no user_id in notes");
        break;
      }

      if (notes.type === "subscription" && notes.plan && notes.period) {
        const plan   = notes.plan as "starter" | "pro";
        const period = notes.period as "monthly" | "yearly";
        const d = new Date();
        period === "yearly" ? d.setFullYear(d.getFullYear() + 1) : d.setMonth(d.getMonth() + 1);

        await admin.from("profiles").update({
          tier:                 plan,
          credits_remaining:    DAILY_CREDITS[plan],
          subscription_status:  "active",
          subscription_ends_at: d.toISOString(),
          onboarding_completed: true,
        }).eq("id", userId);
      }

      if (notes.type === "topup" && notes.pack_id) {
        const pack = TOPUP_PACKS.find((p) => p.id === notes.pack_id);
        if (pack) {
          const { data: profile } = await admin
            .from("profiles")
            .select("credits_remaining")
            .eq("id", userId)
            .single();
          const current = (profile as { credits_remaining: number } | null)?.credits_remaining ?? 0;
          await Promise.all([
            admin.from("profiles")
              .update({ credits_remaining: current + pack.credits })
              .eq("id", userId),
            admin.from("usage_log").insert({
              user_id: userId, task_type: "topup", model: "n/a",
              credits_used: -pack.credits, byok: false,
            }),
          ]);
        }
      }
      break;
    }

    case "subscription.cancelled":
    case "subscription.completed": {
      const sub = event.payload.subscription?.entity;
      if (!sub?.notes?.user_id) break;
      await admin.from("profiles").update({
        subscription_status: event.event === "subscription.completed" ? "expired" : "cancelled",
        ...(event.event === "subscription.completed" ? { tier: "free", credits_remaining: 0, subscription_ends_at: null } : {}),
      }).eq("id", sub.notes.user_id);
      break;
    }
  }

  return NextResponse.json({ received: true, event: event.event });
}
