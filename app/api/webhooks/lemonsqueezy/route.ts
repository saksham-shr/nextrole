/**
 * POST /api/webhooks/lemonsqueezy
 *
 * LemonSqueezy is payment-only. Its only job here is telling us:
 *   - which tier the user subscribed to
 *   - when the subscription expires/cancels/pauses
 *
 * Credit management is 100% internal:
 *   - Daily credits (100 Starter / 300 Pro) are reset by the nightly cron
 *   - Per-task deductions happen in each API route
 *   - LemonSqueezy never receives credit data
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createHmac } from "crypto";
import { DAILY_CREDITS, TOPUP_PACKS } from "@/lib/ai/gates";

function buildTopupVariantMap(): Record<string, number> {
  const map: Record<string, number> = {};
  for (const pack of TOPUP_PACKS) {
    const key = `LEMONSQUEEZY_VARIANT_TOPUP_${pack.id.toUpperCase()}`;
    const variantId = process.env[key]?.trim();
    if (variantId) map[variantId] = pack.credits;
  }
  return map;
}
const VARIANT_TO_TOPUP = buildTopupVariantMap();

const LS_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";

function verifySignature(rawBody: string, signature: string): boolean {
  if (!LS_SECRET) return false;
  const hmac = createHmac("sha256", LS_SECRET);
  hmac.update(rawBody);
  return hmac.digest("hex") === signature;
}

type PaidTier = "starter" | "pro";

function buildVariantMap(): Record<string, PaidTier> {
  const map: Record<string, PaidTier> = {};
  const entries: Array<[string | undefined, PaidTier]> = [
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY, "starter"],
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY,  "starter"],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY,     "pro"],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY,      "pro"],
  ];
  for (const [id, tier] of entries) {
    if (id?.trim()) map[id.trim()] = tier;
  }
  return map;
}

const VARIANT_TO_TIER = buildVariantMap();

interface LSPayload {
  meta: { event_name: string };
  data: {
    id: string;
    attributes: {
      variant_id?: number;
      customer_id?: number;
      user_email: string;
      ends_at?: string | null;
      renews_at?: string | null;
      current_period_end?: string | null;
      first_subscription_item?: { variant_id?: number } | null;
    };
  };
}

export async function POST(request: NextRequest) {
  const rawBody   = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: LSPayload;
  try { payload = JSON.parse(rawBody); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { event_name } = payload.meta;
  const attrs          = payload.data.attributes;
  const subscriptionId = payload.data.id;
  const variantId      = String(attrs.variant_id ?? attrs.first_subscription_item?.variant_id ?? "");
  const customerId     = attrs.customer_id ? String(attrs.customer_id) : undefined;

  const admin = createAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, tier")
    .eq("email", attrs.user_email)
    .single();

  if (!profile) return NextResponse.json({ received: true, note: "user not found" });

  const userId = profile.id;

  switch (event_name) {

    // ── Subscribed / upgraded / plan changed ─────────────────────────────────
    // Grant today's daily credits immediately so the user can start right away.
    case "subscription_created":
    case "subscription_updated":
    case "subscription_plan_changed": {
      const newTier = VARIANT_TO_TIER[variantId];
      if (!newTier) return NextResponse.json({ received: true, note: "unknown variant" });

      await admin.from("profiles").update({
        tier: newTier,
        credits_remaining: DAILY_CREDITS[newTier],
        onboarding_completed: true,
        ...(customerId && { lemon_squeezy_customer_id: customerId }),
        lemon_squeezy_subscription_id: subscriptionId,
        subscription_status: "active",
        subscription_ends_at: attrs.renews_at ?? attrs.ends_at,
      }).eq("id", userId);
      break;
    }

    // ── Payment success (renewal) — nightly cron handles credit reset ─────────
    case "subscription_payment_success": {
      await admin.from("profiles").update({
        subscription_status: "active",
        subscription_ends_at: attrs.renews_at ?? attrs.current_period_end,
      }).eq("id", userId);
      break;
    }

    // ── Cancelled — keep access + daily credits until period ends ─────────────
    case "subscription_cancelled": {
      await admin.from("profiles").update({
        subscription_status: "cancelled",
        subscription_ends_at: attrs.ends_at,
      }).eq("id", userId);
      break;
    }

    // ── Expired — subscription over, downgrade to free, zero credits ──────────
    case "subscription_expired": {
      await admin.from("profiles").update({
        tier: "free",
        credits_remaining: 0,
        subscription_status: "expired",
        subscription_ends_at: null,
      }).eq("id", userId);
      break;
    }

    // ── Paused — block AI tasks, but preserve remaining credits ───────────────
    case "subscription_paused": {
      await admin.from("profiles").update({ subscription_status: "paused" }).eq("id", userId);
      break;
    }

    // ── Resumed — reactivate, grant today's credits fresh ────────────────────
    case "subscription_resumed":
    case "subscription_unpaused": {
      const tier = (profile.tier ?? "starter") as PaidTier;
      await admin.from("profiles").update({
        credits_remaining: DAILY_CREDITS[tier],
        subscription_status: "active",
        subscription_ends_at: attrs.renews_at ?? attrs.ends_at,
      }).eq("id", userId);
      break;
    }

    // ── Payment failed — grace period, LemonSqueezy retries automatically ─────
    case "subscription_payment_failed": {
      await admin.from("profiles").update({ subscription_status: "past_due" }).eq("id", userId);
      break;
    }

    // ── Subscription payment refunded — downgrade to free immediately ─────────
    case "subscription_payment_refunded": {
      await admin.from("profiles").update({
        tier: "free",
        credits_remaining: 0,
        subscription_status: "expired",
        subscription_ends_at: null,
      }).eq("id", userId);
      break;
    }

    // ── Order refunded — could be a top-up or a one-time order ───────────────
    // Top-up refunds subtract the credited credits; any other order refund
    // is treated as a subscription cancellation.
    case "order_refunded": {
      const topupCredits = VARIANT_TO_TOPUP[variantId];
      if (topupCredits) {
        const { data: p } = await admin
          .from("profiles")
          .select("credits_remaining")
          .eq("id", userId)
          .single();
        const current = (p as { credits_remaining: number } | null)?.credits_remaining ?? 0;
        await admin.from("profiles")
          .update({ credits_remaining: Math.max(0, current - topupCredits) })
          .eq("id", userId);
      } else {
        await admin.from("profiles").update({
          tier: "free",
          credits_remaining: 0,
          subscription_status: "expired",
          subscription_ends_at: null,
        }).eq("id", userId);
      }
      break;
    }

    // ── Top-up order — Pro only, valid until subscription ends ────────────────
    case "order_created": {
      const topupCredits = VARIANT_TO_TOPUP[variantId];
      if (!topupCredits) return NextResponse.json({ received: true, note: "unknown topup variant" });

      // Silently reject if user is not currently Pro
      if (profile.tier !== "pro") {
        return NextResponse.json({ received: true, note: "top-up requires Pro subscription" });
      }

      const { data: p } = await admin
        .from("profiles")
        .select("credits_remaining")
        .eq("id", userId)
        .single();

      const current = (p as { credits_remaining: number } | null)?.credits_remaining ?? 0;

      await Promise.all([
        admin.from("profiles")
          .update({ credits_remaining: current + topupCredits })
          .eq("id", userId),
        // Log as negative credits_used so the cron can compute topup_remaining
        admin.from("usage_log").insert({
          user_id: userId,
          task_type: "topup",
          model: "n/a",
          credits_used: -topupCredits,
          byok: false,
        }),
      ]);
      break;
    }
  }

  return NextResponse.json({ received: true, event: event_name });
}
