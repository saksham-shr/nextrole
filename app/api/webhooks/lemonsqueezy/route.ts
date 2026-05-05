/**
 * Lemon Squeezy webhook handler
 * POST /api/webhooks/lemonsqueezy
 *
 * Events handled:
 *   subscription_created          → activate tier + reset credits
 *   subscription_updated          → update tier/status
 *   subscription_plan_changed     → change tier (upgrade/downgrade)
 *   subscription_cancelled        → keep access until period ends (status=cancelled)
 *   subscription_expired          → downgrade to free
 *   subscription_paused           → block AI access (status=paused)
 *   subscription_resumed          → reactivate (status=active)
 *   subscription_unpaused         → reactivate (status=active)
 *   subscription_payment_failed   → grace period (status=past_due)
 *   subscription_payment_success  → reset credits on renewal
 *   subscription_payment_refunded → downgrade to free
 *   order_refunded                → downgrade to free
 *
 * Variant ID mapping via env vars:
 *   LEMONSQUEEZY_VARIANT_STARTER
 *   LEMONSQUEEZY_VARIANT_PRO
 *   LEMONSQUEEZY_VARIANT_TEAM
 *   LEMONSQUEEZY_VARIANT_BYOK_MONTHLY
 *   LEMONSQUEEZY_VARIANT_BYOK_YEARLY
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHmac } from "crypto";

const LS_SECRET = process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "";

type PaidTier = "starter" | "pro" | "team" | "byok";
type AnyTier  = "free" | PaidTier;

function buildVariantMap(): Record<string, PaidTier> {
  const map: Record<string, PaidTier> = {};
  const entries: Array<[string | undefined, PaidTier]> = [
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_MONTHLY,  "starter"],
    [process.env.LEMONSQUEEZY_VARIANT_STARTER_YEARLY,   "starter"],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_MONTHLY,      "pro"],
    [process.env.LEMONSQUEEZY_VARIANT_PRO_YEARLY,       "pro"],
    [process.env.LEMONSQUEEZY_VARIANT_TEAM_MONTHLY,     "team"],
    [process.env.LEMONSQUEEZY_VARIANT_TEAM_YEARLY,      "team"],
    [process.env.LEMONSQUEEZY_VARIANT_BYOK_MONTHLY,     "byok"],
    [process.env.LEMONSQUEEZY_VARIANT_BYOK_YEARLY,      "byok"],
  ];
  for (const [id, tier] of entries) {
    if (id?.trim()) map[id.trim()] = tier;
  }
  return map;
}

const VARIANT_TO_TIER = buildVariantMap();

function verifySignature(rawBody: string, signature: string): boolean {
  if (!LS_SECRET) return false;
  const hmac = createHmac("sha256", LS_SECRET);
  hmac.update(rawBody);
  return hmac.digest("hex") === signature;
}

// Shared payload shape for subscription events
interface SubscriptionPayload {
  meta: { event_name: string };
  data: {
    attributes: {
      variant_id?: number;
      customer_id?: number;
      user_email: string;
      status?: string;
      ends_at?: string | null;
      renews_at?: string | null;
      current_period_end?: string | null;
      first_subscription_item?: { variant_id?: number } | null;
    };
    id: string;
  };
}

export async function POST(request: NextRequest) {
  const rawBody  = await request.text();
  const signature = request.headers.get("x-signature") ?? "";

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: SubscriptionPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { event_name } = payload.meta;
  const attrs         = payload.data.attributes;
  const subscriptionId = payload.data.id;

  // variant_id can be on the subscription or its first item (plan_changed sends it on first_subscription_item)
  const variantId  = String(attrs.variant_id ?? attrs.first_subscription_item?.variant_id ?? "");
  const customerId = attrs.customer_id ? String(attrs.customer_id) : undefined;
  const userEmail  = attrs.user_email;

  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, tier")
    .eq("email", userEmail)
    .single();

  if (!profile) {
    return NextResponse.json({ received: true, note: "user not found" });
  }

  const userId = profile.id;
  const currentTier = (profile.tier ?? "free") as AnyTier;

  switch (event_name) {

    // ── Activate / upgrade / plan change ────────────────────────────────────
    case "subscription_created":
    case "subscription_updated":
    case "subscription_plan_changed": {
      const newTier: PaidTier = VARIANT_TO_TIER[variantId] ?? "byok";
      await supabase.rpc("reset_credits_for_tier", { p_user_id: userId, p_tier: newTier });
      await supabase
        .from("profiles")
        .update({
          tier: newTier,
          onboarding_completed: true,
          ...(customerId && { lemon_squeezy_customer_id: customerId }),
          lemon_squeezy_subscription_id: subscriptionId,
          subscription_status: "active",
          subscription_ends_at: attrs.renews_at ?? attrs.ends_at,
        })
        .eq("id", userId);
      break;
    }

    // ── Cancelled — keep access until period ends ───────────────────────────
    case "subscription_cancelled": {
      await supabase
        .from("profiles")
        .update({
          subscription_status: "cancelled",
          subscription_ends_at: attrs.ends_at,
        })
        .eq("id", userId);
      break;
    }

    // ── Expired — downgrade to free, revoke team members ───────────────────
    case "subscription_expired": {
      await supabase.rpc("reset_credits_for_tier", { p_user_id: userId, p_tier: "free" });
      await supabase
        .from("profiles")
        .update({
          tier: "free",
          subscription_status: "expired",
          subscription_ends_at: null,
        })
        .eq("id", userId);
      if (currentTier === "team") {
        await supabase.rpc("revoke_team_members", { p_owner_id: userId });
      }
      break;
    }

    // ── Paused — block AI but keep data ────────────────────────────────────
    case "subscription_paused": {
      await supabase
        .from("profiles")
        .update({ subscription_status: "paused" })
        .eq("id", userId);
      break;
    }

    // ── Resumed / unpaused — reactivate ────────────────────────────────────
    case "subscription_resumed":
    case "subscription_unpaused": {
      await supabase.rpc("reset_credits_for_tier", { p_user_id: userId, p_tier: currentTier });
      await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          subscription_ends_at: attrs.renews_at ?? attrs.ends_at,
        })
        .eq("id", userId);
      break;
    }

    // ── Payment failed — grace period, don't cut access yet ────────────────
    // LS retries automatically; subscription_expired fires if all retries fail.
    case "subscription_payment_failed": {
      await supabase
        .from("profiles")
        .update({ subscription_status: "past_due" })
        .eq("id", userId);
      break;
    }

    // ── Payment success — reset credits for new billing cycle ───────────────
    case "subscription_payment_success": {
      await supabase.rpc("reset_credits_for_tier", { p_user_id: userId, p_tier: currentTier });
      await supabase
        .from("profiles")
        .update({
          subscription_status: "active",
          subscription_ends_at: attrs.renews_at ?? attrs.current_period_end,
        })
        .eq("id", userId);
      break;
    }

    // ── Refunded — downgrade to free immediately, revoke team members ────────
    case "subscription_payment_refunded":
    case "order_refunded": {
      await supabase.rpc("reset_credits_for_tier", { p_user_id: userId, p_tier: "free" });
      await supabase
        .from("profiles")
        .update({
          tier: "free",
          subscription_status: "expired",
          subscription_ends_at: null,
        })
        .eq("id", userId);
      if (currentTier === "team") {
        await supabase.rpc("revoke_team_members", { p_owner_id: userId });
      }
      break;
    }
  }

  return NextResponse.json({ received: true, event: event_name });
}
