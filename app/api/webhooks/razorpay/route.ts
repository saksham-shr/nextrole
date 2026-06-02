/**
 * POST /api/webhooks/razorpay
 *
 * Handles Razorpay webhook events as a reliability layer on top of
 * the client-side verify-payment call. Razorpay signs events with
 * HMAC-SHA256 using RAZORPAY_WEBHOOK_SECRET.
 *
 * Register this URL in Razorpay Dashboard → Settings → Webhooks:
 *   https://nextrole.live/api/webhooks/razorpay
 * Active events: payment.captured, payment.failed,
 *                subscription.cancelled, subscription.completed, subscription.halted,
 *                refund.processed
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { DAILY_CREDITS } from "@/lib/ai/gates";
import { getCommerceConfig, CommerceConfigUnavailableError } from "@/lib/commerce/config";
import {
  sendPaymentFailedEmail,
  sendHaltedEmail,
  sendRefundEmail,
} from "@/lib/email/send";

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("RAZORPAY_WEBHOOK_SECRET is not configured");
  }
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

interface RzpPaymentEntity {
  id: string;
  order_id: string;
  amount?: number;
  notes?: {
    type?: string;
    plan?: string;
    period?: string;
    pack_id?: string;
    credits?: string;
    user_id?: string;
  };
  email?: string;
}

interface RzpRefundEntity {
  id: string;
  payment_id: string;
  amount: number;
}

interface RzpWebhookEvent {
  event: string;
  payload: {
    payment?:      { entity: RzpPaymentEntity };
    subscription?: { entity: { id: string; status: string; notes?: Record<string, string> } };
    refund?:       { entity: RzpRefundEntity };
  };
}

/** Look up a user's email from the profiles table. */
async function getUserEmail(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await admin.from("profiles").select("email").eq("id", userId).single();
  return data?.email ?? null;
}

export async function POST(request: NextRequest) {
  const rawBody   = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  let signatureValid: boolean;
  try {
    signatureValid = verifyWebhookSignature(rawBody, signature);
  } catch (err) {
    console.error("[razorpay webhook]", (err as Error).message);
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }
  if (!signatureValid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: RzpWebhookEvent;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const admin = createAdminClient();

  switch (event.event) {

    // ── payment.captured ───────────────────────────────────────────────────
    // Reliability fallback — fires even when the browser tab closes before
    // the client-side verify-payment call completes.
    case "payment.captured": {
      const payment = event.payload.payment?.entity;
      if (!payment) break;

      const notes  = payment.notes ?? {};
      const userId = notes.user_id;
      if (!userId) {
        console.warn("[razorpay webhook] payment.captured: no user_id in notes");
        break;
      }

      if (notes.type === "subscription" && notes.plan && notes.period) {
        const plan   = notes.plan as "starter" | "pro";
        const period = notes.period as "monthly" | "yearly";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: status, error: applyErr } = await (admin.rpc as any)("apply_subscription_payment", {
          p_user_id:       userId,
          p_payment_id:    payment.id,
          p_plan:          plan,
          p_period:        period,
          p_daily_credits: DAILY_CREDITS[plan],
          p_amount_paise:  payment.amount ?? 0,
          p_order_id:      payment.order_id,
        });
        if (applyErr) {
          console.error("[razorpay webhook] apply_subscription_payment failed:", applyErr.message);
          return NextResponse.json({ error: "Failed to apply subscription; retry" }, { status: 500 });
        }
        if (status === "already_processed") {
          console.log(`[razorpay webhook] subscription payment ${payment.id} already processed`);
        }
      }

      if (notes.type === "topup" && notes.pack_id) {
        let commerce;
        try {
          commerce = await getCommerceConfig();
        } catch (err) {
          if (err instanceof CommerceConfigUnavailableError) {
            console.error("[razorpay webhook] commerce config unavailable:", err.message);
            return NextResponse.json({ error: "Billing config unavailable; retry" }, { status: 503 });
          }
          throw err;
        }
        const pack = commerce.topupPacks.find((p) => p.id === notes.pack_id);
        if (pack) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: status, error: applyErr } = await (admin.rpc as any)("apply_topup_payment", {
            p_user_id:      userId,
            p_payment_id:   payment.id,
            p_credits:      pack.credits,
            p_amount_paise: payment.amount ?? 0,
            p_pack_id:      pack.id,
            p_order_id:     payment.order_id,
          });
          if (applyErr) {
            console.error("[razorpay webhook] apply_topup_payment failed:", applyErr.message);
            return NextResponse.json({ error: "Failed to apply topup; retry" }, { status: 500 });
          }
          if (status === "already_processed") {
            console.log(`[razorpay webhook] topup payment ${payment.id} already processed`);
          }
        }
      }
      break;
    }

    // ── payment.failed ─────────────────────────────────────────────────────
    case "payment.failed": {
      const payment = event.payload.payment?.entity;
      if (!payment) break;

      const notes  = payment.notes ?? {};
      const userId = notes.user_id;
      if (!userId) break;

      if (notes.type === "subscription" && notes.plan) {
        await admin
          .from("profiles")
          .update({ subscription_status: "past_due" })
          .eq("id", userId);

        const email = await getUserEmail(admin, userId);
        if (email) {
          sendPaymentFailedEmail(email, notes.plan).catch((err) =>
            console.error("[razorpay webhook] payment.failed email error:", err),
          );
        }
        console.log(`[razorpay webhook] payment.failed for user ${userId}`);
      }
      break;
    }

    // ── subscription.cancelled ─────────────────────────────────────────────
    case "subscription.cancelled": {
      const sub = event.payload.subscription?.entity;
      if (!sub?.notes?.user_id) break;
      await admin
        .from("profiles")
        .update({ subscription_status: "cancelled" })
        .eq("id", sub.notes.user_id);
      break;
    }

    // ── subscription.completed ─────────────────────────────────────────────
    // Fires when a Razorpay Subscription reaches its total_count.
    // Downgrade to free immediately (period has ended).
    case "subscription.completed": {
      const sub = event.payload.subscription?.entity;
      if (!sub?.notes?.user_id) break;
      await admin.from("profiles").update({
        subscription_status:  "expired",
        tier:                 "free",
        credits_remaining:    0,
        subscription_ends_at: null,
        billing_period_start: null,
        subscription_period:  null,
      }).eq("id", sub.notes.user_id);
      break;
    }

    // ── subscription.halted ────────────────────────────────────────────────
    // 4 consecutive charge failures — downgrade immediately and notify.
    case "subscription.halted": {
      const sub = event.payload.subscription?.entity;
      if (!sub?.notes?.user_id) break;

      const userId = sub.notes.user_id;
      // Read plan before we downgrade so the email is accurate
      const { data: profile } = await admin
        .from("profiles")
        .select("email, tier")
        .eq("id", userId)
        .single();

      await admin.from("profiles").update({
        subscription_status:  "halted",
        tier:                 "free",
        credits_remaining:    0,
        subscription_ends_at: null,
        billing_period_start: null,
        subscription_period:  null,
      }).eq("id", userId);

      if (profile?.email) {
        sendHaltedEmail(profile.email, profile.tier as string).catch((err) =>
          console.error("[razorpay webhook] halted email error:", err),
        );
      }
      console.log(`[razorpay webhook] subscription.halted for user ${userId}`);
      break;
    }

    // ── refund.processed ──────────────────────────────────────────────────
    // Fires when Razorpay completes a refund. We look up the original payment
    // in payment_records, find the user, downgrade their tier, and notify.
    case "refund.processed": {
      const refund  = event.payload.refund?.entity;
      const payment = event.payload.payment?.entity;
      if (!refund || !payment) break;

      const notes  = payment.notes ?? {};
      const userId = notes.user_id;
      if (!userId) {
        // Fallback: look up user from payment_records by payment_id
        const { data: record } = await admin
          .from("payment_records")
          .select("user_id, type, plan")
          .eq("razorpay_payment_id", refund.payment_id)
          .maybeSingle();

        if (!record) {
          console.warn(`[razorpay webhook] refund.processed: no record for payment ${refund.payment_id}`);
          break;
        }

        // Mark the payment as refunded
        await admin
          .from("payment_records")
          .update({ status: "refunded", refunded_at: new Date().toISOString(), refund_id: refund.id })
          .eq("razorpay_payment_id", refund.payment_id);

        if (record.type === "subscription") {
          const { data: p } = await admin
            .from("profiles")
            .select("email, tier")
            .eq("id", record.user_id)
            .single();

          await admin.from("profiles").update({
            subscription_status:  "expired",
            tier:                 "free",
            credits_remaining:    0,
            subscription_ends_at: null,
            billing_period_start: null,
            subscription_period:  null,
          }).eq("id", record.user_id);

          if (p?.email) {
            sendRefundEmail(p.email, record.plan ?? "plan", refund.amount).catch((err) =>
              console.error("[razorpay webhook] refund email error:", err),
            );
          }
        }
        break;
      }

      // We have user_id in notes
      await admin
        .from("payment_records")
        .update({ status: "refunded", refunded_at: new Date().toISOString(), refund_id: refund.id })
        .eq("razorpay_payment_id", refund.payment_id);

      if (notes.type === "subscription") {
        const { data: p } = await admin
          .from("profiles")
          .select("email, tier")
          .eq("id", userId)
          .single();

        await admin.from("profiles").update({
          subscription_status:  "expired",
          tier:                 "free",
          credits_remaining:    0,
          subscription_ends_at: null,
          billing_period_start: null,
          subscription_period:  null,
        }).eq("id", userId);

        if (p?.email) {
          sendRefundEmail(p.email, notes.plan ?? "plan", refund.amount).catch((err) =>
            console.error("[razorpay webhook] refund email error:", err),
          );
        }
      } else if (notes.type === "topup" && notes.pack_id) {
        // Claw back the top-up credits
        let commerce;
        try { commerce = await getCommerceConfig(); } catch { break; }
        const pack = commerce.topupPacks.find((p) => p.id === notes.pack_id);
        if (pack) {
          const { error: rpcErr } = await admin.rpc("decrement_credits", {
            p_user_id: userId,
            p_credits: pack.credits,
          });
          if (rpcErr) {
            // Fallback: direct update clamped to 0
            const { data: profileData } = await admin
              .from("profiles")
              .select("credits_remaining")
              .eq("id", userId)
              .single();
            const cur = profileData?.credits_remaining ?? 0;
            await admin
              .from("profiles")
              .update({ credits_remaining: Math.max(0, cur - pack.credits) })
              .eq("id", userId);
          }
        }
      }

      console.log(`[razorpay webhook] refund.processed: ${refund.id} for payment ${refund.payment_id}`);
      break;
    }
  }

  return NextResponse.json({ received: true, event: event.event });
}
