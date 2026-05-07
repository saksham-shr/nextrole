import { createClient } from "@/lib/supabase/server";
import { canAccess, FREE_DAILY_LIMITS, STARTER_DAILY_LIMITS, type Tier } from "@/lib/ai/gates";
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

// Map feature keys to the daily_usage column they consume
const FEATURE_USAGE_COL: Record<string, keyof typeof FREE_DAILY_LIMITS> = {
  evaluate:        "evaluations",
  resume_standard: "resumes",
  autofill:        "autofills",
};

const STARTER_USAGE_COL: Record<string, keyof typeof STARTER_DAILY_LIMITS> = {
  autofill: "autofills",
};

/**
 * Gate every protected AI API route.
 * Admin email bypasses all tier/credit checks.
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

  // Admin bypasses everything
  if (isAdmin) {
    return { ok: true, userId: user.id, tier: "pro", creditsRemaining: 999999, isAdmin };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, credits_remaining, subscription_status")
    .eq("id", user.id)
    .single();

  const tier    = (profile?.tier ?? "free") as Tier;
  const status  = (profile?.subscription_status ?? null) as SubStatus;
  const credits = profile?.credits_remaining ?? 0;

  if (status === "paused") {
    return NextResponse.json({ error: "SUBSCRIPTION_PAUSED", currentTier: tier }, { status: 402 });
  }

  if (!canAccess(tier, feature)) {
    return NextResponse.json({ error: "UPGRADE_REQUIRED", feature, currentTier: tier }, { status: 403 });
  }

  // Paid tiers: check daily credit balance (100 Starter / 300 Pro, resets at midnight)
  if (tier !== "free" && credits <= 0) {
    return NextResponse.json({ error: "NO_CREDITS", currentTier: tier }, { status: 402 });
  }

  // Free tier: enforce daily hard limits via daily_usage table
  if (tier === "free") {
    const usageCol = FEATURE_USAGE_COL[feature];
    if (usageCol !== undefined) {
      const limit = FREE_DAILY_LIMITS[usageCol];
      if (limit === 0) {
        return NextResponse.json({ error: "UPGRADE_REQUIRED", feature, currentTier: tier }, { status: 403 });
      }
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage } = await supabase
        .from("daily_usage")
        .select(usageCol)
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      const used = (usage as Record<string, number> | null)?.[usageCol] ?? 0;
      if (used >= limit) {
        return NextResponse.json(
          { error: "DAILY_LIMIT_REACHED", feature, limit, currentTier: tier },
          { status: 429 },
        );
      }
    }
  }

  // Starter tier: enforce per-feature daily limits on top of daily credits
  if (tier === "starter") {
    const usageCol = STARTER_USAGE_COL[feature];
    if (usageCol !== undefined) {
      const limit = STARTER_DAILY_LIMITS[usageCol];
      const today = new Date().toISOString().slice(0, 10);
      const { data: usage } = await supabase
        .from("daily_usage")
        .select(usageCol)
        .eq("user_id", user.id)
        .eq("date", today)
        .maybeSingle();
      const used = (usage as Record<string, number> | null)?.[usageCol] ?? 0;
      if (used >= limit) {
        return NextResponse.json(
          { error: "DAILY_LIMIT_REACHED", feature, limit, currentTier: tier },
          { status: 429 },
        );
      }
    }
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
    .select("tier, credits_remaining, subscription_status")
    .eq("id", user.id)
    .single();

  const tier    = (isAdmin ? "pro" : profile?.tier ?? "free") as Tier;
  const credits = profile?.credits_remaining ?? 0;
  const status  = (profile?.subscription_status ?? null) as SubStatus;

  if (!isAdmin && status === "paused") {
    return NextResponse.json({ error: "SUBSCRIPTION_PAUSED", currentTier: tier }, { status: 402 });
  }

  return { ok: true, userId: user.id, tier, creditsRemaining: credits, isAdmin };
}
