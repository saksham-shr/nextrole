/**
 * POST /api/webhooks/razorpay
 *
 * Authoritative handler for all Razorpay lifecycle events.
 * Always returns 200 — non-2xx causes Razorpay to retry for 24h.
 *
 * Razorpay Dashboard → Settings → Webhooks → enable:
 *   payment.captured, payment.failed,
 *   subscription.activated, subscription.charged, subscription.pending,
 *   subscription.halted, subscription.cancelled, subscription.completed,
 *   refund.processed
 */

import { NextRequest, NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCommerceConfig, CommerceConfigUnavailableError } from "@/lib/commerce/config";
import {
  sendPaymentFailedEmail,
  sendHaltedEmail,
  sendRefundEmail,
} from "@/lib/email/send";

// ── Signature verification ───────────────────────────────────────────────────

function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) throw new Error("RAZORPAY_WEBHOOK_SECRET not configured");
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(signature, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// ── Payload types ────────────────────────────────────────────────────────────

interface RzpPaymentEntity {
  id: string;
  order_id?: string;
  subscription_id?: string;
  amount?: number;
  notes?: Record<string, string>;
}

interface RzpSubscriptionEntity {
  id: string;
  status: string;
  notes?: Record<string, string>;
}

interface RzpRefundEntity {
  id: string;
  payment_id: string;
  amount: number;
}

interface RzpEvent {
  event: string;
  payload: {
    payment?:      { entity: RzpPaymentEntity };
    subscription?: { entity: RzpSubscriptionEntity };
    refund?:       { entity: RzpRefundEntity };
  };
}

// ── User ID resolution ───────────────────────────────────────────────────────
// Notes are attached to subscriptions; if they're missing (Razorpay occasionally
// strips them), fall back to a DB lookup by razorpay_subscription_id.

async function resolveUserId(
  admin: ReturnType<typeof createAdminClient>,
  notes: Record<string, string> | undefined,
  subId?: string,
): Promise<string | null> {
  if (notes?.user_id) return notes.user_id;
  if (subId) {
    const { data } = await admin
      .from("profiles")
      .select("id")
      .eq("razorpay_subscription_id", subId)
      .maybeSingle();
    return (data as { id?: string } | null)?.id ?? null;
  }
  return null;
}

async function getUserEmail(
  admin: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<string | null> {
  const { data } = await admin.from("profiles").select("email").eq("id", userId).single();
  return (data as { email?: string } | null)?.email ?? null;
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const rawBody   = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";

  try {
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  } catch (err) {
    console.error("[razorpay webhook]", (err as Error).message);
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: RzpEvent;
  try { event = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const admin = createAdminClient();

  switch (event.event) {

    // ── payment.captured ─────────────────────────────────────────────────────
    // Only handles topups. Subscription first payments are handled by
    // subscription.activated; renewals by subscription.charged.
    case "payment.captured": {
      const payment = event.payload.payment?.entity;
      if (!payment) break;

      const notes   = payment.notes ?? {};
      const userId  = notes.user_id;

      if (notes.type === "topup" && notes.pack_id && userId) {
        let commerce;
        try {
          commerce = await getCommerceConfig();
        } catch (err) {
          if (err instanceof CommerceConfigUnavailableError) {
            console.error("[webhook] commerce config unavailable:", err.message);
            // Return 500 so Razorpay retries — billing config may recover
            return NextResponse.json({ error: "Billing config unavailable; retry" }, { status: 500 });
          }
          throw err;
        }

        const pack = commerce.topupPacks.find((p) => p.id === notes.pack_id);
        if (pack) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: status, error: applyErr } = await (admin.rpc as any)("apply_topup_payment", {
            p_user_id:             userId,
            p_pack_id:             pack.id,
            p_credits:             pack.credits,
            p_amount_paise:        payment.amount ?? 0,
            p_razorpay_payment_id: payment.id,
            p_razorpay_order_id:   payment.order_id ?? null,
          });
          if (applyErr) {
            console.error("[webhook] apply_topup_payment failed:", applyErr.message);
            return NextResponse.json({ error: "Failed to apply topup; retry" }, { status: 500 });
          }
          if (status === "already_processed") {
            console.log(`[webhook] topup ${payment.id} already processed`);
          }
        }
      }
      break;
    }

    // ── payment.failed ───────────────────────────────────────────────────────
    case "payment.failed": {
      const payment = event.payload.payment?.entity;
      if (!payment) break;
      const notes  = payment.notes ?? {};
      const userId = notes.user_id;
      if (!userId || notes.type !== "subscription") break;

      await admin.from("profiles")
        .update({ subscription_status: "past_due" })
        .eq("id", userId);

      const email = await getUserEmail(admin, userId);
      if (email) {
        sendPaymentFailedEmail(email, notes.plan ?? "plan").catch((err) =>
          console.error("[webhook] payment.failed email error:", err),
        );
      }
      break;
    }

    // ── subscription.activated ───────────────────────────────────────────────
    // First payment succeeded. The verify-payment fast-path may have already
    // called apply_subscription_payment — that's fine, idempotency handles it.
    case "subscription.activated": {
      const sub     = event.payload.subscription?.entity;
      const payment = event.payload.payment?.entity;
      if (!sub) break;

      const userId = await resolveUserId(admin, sub.notes, sub.id);
      if (!userId) {
        console.warn(`[webhook] subscription.activated: no user_id for sub ${sub.id}`);
        break;
      }

      const notes  = sub.notes ?? {};
      const plan   = notes.plan as "starter" | "pro" | undefined;
      const period = notes.period as "monthly" | "yearly" | undefined;

      if (payment?.id && plan && period) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: applyErr } = await (admin.rpc as any)("apply_subscription_payment", {
          p_user_id:             userId,
          p_razorpay_payment_id: payment.id,
          p_razorpay_sub_id:     sub.id,
          p_razorpay_order_id:   null,
          p_plan:                plan,
          p_period:              period,
          p_amount_paise:        payment.amount ?? 0,
        });
        if (applyErr) {
          console.error("[webhook] apply_subscription_payment (activated) failed:", applyErr.message);
          return NextResponse.json({ error: "Failed to activate subscription; retry" }, { status: 500 });
        }
      } else {
        // No payment entity — just confirm active status and clear grace
        await admin.from("profiles").update({
          subscription_status:      "active",
          razorpay_subscription_id: sub.id,
          topup_forfeit_at:         null,
        }).eq("id", userId);
      }
      break;
    }

    // ── subscription.charged ─────────────────────────────────────────────────
    // Recurring renewal payment succeeded — extend subscription_ends_at.
    case "subscription.charged": {
      const sub     = event.payload.subscription?.entity;
      const payment = event.payload.payment?.entity;
      if (!sub || !payment) break;

      const userId = await resolveUserId(admin, sub.notes, sub.id);
      if (!userId) {
        console.warn(`[webhook] subscription.charged: no user_id for sub ${sub.id}`);
        break;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: status, error: applyErr } = await (admin.rpc as any)("apply_subscription_renewal", {
        p_user_id:             userId,
        p_razorpay_payment_id: payment.id,
        p_razorpay_sub_id:     sub.id,
        p_amount_paise:        payment.amount ?? 0,
      });
      if (applyErr) {
        console.error("[webhook] apply_subscription_renewal failed:", applyErr.message);
        return NextResponse.json({ error: "Failed to process renewal; retry" }, { status: 500 });
      }
      if (status === "already_processed") {
        console.log(`[webhook] renewal ${payment.id} already processed`);
      }
      break;
    }

    // ── subscription.pending ─────────────────────────────────────────────────
    // Razorpay is retrying a failed charge (D+1, D+2, D+3).
    // Keep tier/credits intact — user still has access during retry window.
    case "subscription.pending": {
      const sub = event.payload.subscription?.entity;
      if (!sub) break;

      const userId = await resolveUserId(admin, sub.notes, sub.id);
      if (!userId) break;

      await admin.from("profiles")
        .update({ subscription_status: "pending" })
        .eq("id", userId);

      // Inform user that Razorpay is retrying (non-blocking)
      const email = await getUserEmail(admin, userId);
      if (email) {
        sendPaymentFailedEmail(email, (sub.notes?.plan ?? "plan")).catch((err) =>
          console.error("[webhook] subscription.pending email error:", err),
        );
      }
      break;
    }

    // ── subscription.halted ──────────────────────────────────────────────────
    // All retry attempts exhausted. Start 2-day grace period:
    //   - Zero daily_credits immediately (service pauses)
    //   - topup_credits zeroed by cron after grace window
    //   - tier stays until forfeit_topup_after_grace() runs
    case "subscription.halted": {
      const sub = event.payload.subscription?.entity;
      if (!sub) break;

      const userId = await resolveUserId(admin, sub.notes, sub.id);
      if (!userId) break;

      const { data: profile } = await admin
        .from("profiles")
        .select("email, tier")
        .eq("id", userId)
        .single();

      const forfeitAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();

      await admin.from("profiles").update({
        subscription_status: "halted",
        credits_remaining:   0,
        topup_forfeit_at:    forfeitAt,
      }).eq("id", userId);

      if ((profile as { email?: string; tier?: string } | null)?.email) {
        sendHaltedEmail(
          (profile as { email: string; tier: string }).email,
          (profile as { email: string; tier: string }).tier,
        ).catch((err) => console.error("[webhook] halted email error:", err));
      }
      break;
    }

    // ── subscription.cancelled ───────────────────────────────────────────────
    // User cancelled. Keep tier until subscription_ends_at (cron handles expiry).
    case "subscription.cancelled": {
      const sub = event.payload.subscription?.entity;
      if (!sub) break;

      const userId = await resolveUserId(admin, sub.notes, sub.id);
      if (!userId) break;

      await admin.from("profiles")
        .update({ subscription_status: "cancelled" })
        .eq("id", userId);
      break;
    }

    // ── subscription.completed ───────────────────────────────────────────────
    // Subscription reached its total_count (rare with our 240-cycle default).
    // Downgrade immediately — no grace period.
    case "subscription.completed": {
      const sub = event.payload.subscription?.entity;
      if (!sub) break;

      const userId = await resolveUserId(admin, sub.notes, sub.id);
      if (!userId) break;

      await admin.from("profiles").update({
        tier:                     "free",
        subscription_status:      "expired",
        credits_remaining:        0,
        topup_forfeit_at:         null,
        subscription_ends_at:     null,
        subscription_period:      null,
        razorpay_subscription_id: null,
      }).eq("id", userId);
      break;
    }

    // ── refund.processed ─────────────────────────────────────────────────────
    case "refund.processed": {
      const refund  = event.payload.refund?.entity;
      const payment = event.payload.payment?.entity;
      if (!refund) break;

      const notes  = payment?.notes ?? {};
      const userId = notes.user_id ?? null;

      // Look up the original payment record for user_id fallback and type info
      const { data: record } = await admin
        .from("payment_records")
        .select("user_id, type, plan")
        .eq("razorpay_payment_id", refund.payment_id)
        .maybeSingle();

      const resolvedUserId = userId ?? (record as { user_id?: string } | null)?.user_id ?? null;
      if (!resolvedUserId) {
        console.warn(`[webhook] refund.processed: no user_id for payment ${refund.payment_id}`);
        break;
      }

      // Mark payment as refunded
      await admin.from("payment_records")
        .update({ status: "refunded", refunded_at: new Date().toISOString(), refund_id: refund.id })
        .eq("razorpay_payment_id", refund.payment_id);

      const paymentType = notes.type ?? (record as { type?: string } | null)?.type;

      if (paymentType === "subscription" || paymentType === "renewal") {
        const planName = notes.plan ?? (record as { plan?: string } | null)?.plan ?? "plan";
        const { data: p } = await admin
          .from("profiles")
          .select("email, tier")
          .eq("id", resolvedUserId)
          .single();

        await admin.from("profiles").update({
          tier:                     "free",
          subscription_status:      "expired",
          credits_remaining:        0,
          topup_forfeit_at:         null,
          subscription_ends_at:     null,
          subscription_period:      null,
          razorpay_subscription_id: null,
        }).eq("id", resolvedUserId);

        if ((p as { email?: string } | null)?.email) {
          sendRefundEmail(
            (p as { email: string }).email,
            planName,
            refund.amount,
          ).catch((err) => console.error("[webhook] refund email error:", err));
        }
      } else if (paymentType === "topup" && notes.pack_id) {
        let commerce;
        try { commerce = await getCommerceConfig(); } catch { break; }
        const pack = commerce.topupPacks.find((p) => p.id === notes.pack_id);
        if (pack) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (admin.rpc as any)("decrement_credits", {
            p_user_id: resolvedUserId,
            p_amount:  pack.credits,
          });
        }
      }
      break;
    }
  }

  return NextResponse.json({ received: true, event: event.event });
}
