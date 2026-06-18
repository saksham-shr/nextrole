import { createClient } from "@/lib/supabase/server";
import { canAccess, type Tier } from "@/lib/ai/gates";
import { NextResponse } from "next/server";

type SubStatus = "active" | "cancelled" | "past_due" | "expired" | "paused" | null;

export interface GuardResult {
  ok: true;
  userId: string;
  tier: Tier;
  creditsRemaining: number;
  isAdmin: boolean;
}

type GuardError = NextResponse;

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

/**
 * Gate every protected AI API route.
 * Admin email gets Pro feature access and is exempt from the credit-balance
 * check (the admin account never carries a real purchased balance).
 */
export async function requireFeature(
  feature: string,
): Promise<GuardResult | GuardError> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = !!(user.email && user.email.toLowerCase() === ADMIN_EMAIL);

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, daily_credits, topup_credits, signup_credits, subscription_status")
    .eq("id", user.id)
    .single();

  const tier    = (isAdmin ? "pro" : (profile?.tier ?? "free")) as Tier;
  const status  = (profile?.subscription_status ?? null) as SubStatus;
  const credits = (profile?.daily_credits ?? 0) + (profile?.topup_credits ?? 0) + (profile?.signup_credits ?? 0);

  if (!isAdmin && status === "paused") {
    return NextResponse.json({ error: "SUBSCRIPTION_PAUSED", currentTier: tier }, { status: 402 });
  }

  if (!canAccess(tier, feature)) {
    return NextResponse.json({ error: "UPGRADE_REQUIRED", feature, currentTier: tier }, { status: 403 });
  }

  // All tiers: check credit balance. Admin is exempt — admin account carries no real balance.
  if (!isAdmin && credits <= 0) {
    return NextResponse.json({ error: "NO_CREDITS", currentTier: tier }, { status: 402 });
  }

  return { ok: true, userId: user.id, tier, creditsRemaining: credits, isAdmin };
}

/**
 * Gate for pipeline job creation (unlimited for all tiers at launch).
 */
export async function requireJobSlot(): Promise<GuardResult | GuardError> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = !!(user.email && user.email.toLowerCase() === ADMIN_EMAIL);

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, daily_credits, topup_credits, subscription_status")
    .eq("id", user.id)
    .single();

  const tier    = (isAdmin ? "pro" : profile?.tier ?? "free") as Tier;
  const credits = (profile?.daily_credits ?? 0) + (profile?.topup_credits ?? 0);
  const status  = (profile?.subscription_status ?? null) as SubStatus;

  if (!isAdmin && status === "paused") {
    return NextResponse.json({ error: "SUBSCRIPTION_PAUSED", currentTier: tier }, { status: 402 });
  }

  return { ok: true, userId: user.id, tier, creditsRemaining: credits, isAdmin };
}
