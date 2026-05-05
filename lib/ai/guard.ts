import { createClient } from "@/lib/supabase/server";
import { canAccess, jobLimit } from "@/lib/ai/gates";
import { NextResponse } from "next/server";

type Tier = "free" | "starter" | "pro" | "team" | "byok";
type SubStatus = "active" | "cancelled" | "past_due" | "expired" | "paused" | null;

export interface GuardResult {
  ok: true;
  userId: string;
  tier: Tier;
  creditsRemaining: number;
  inTrial: boolean;
  pastDue: boolean;
}

type GuardError = NextResponse;

function checkTrial(endsAt: string | null): boolean {
  return !!endsAt && new Date(endsAt) > new Date();
}

// Resolve the effective credits pool for this user.
// Team members share the owner's credit pool — fetch owner's credits if member.
async function resolveCredits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  tier: Tier,
): Promise<number> {
  if (tier !== "team") return 0; // caller already loaded credits from own profile

  const { data: membership } = await supabase
    .from("team_members")
    .select("owner_id")
    .eq("member_id", userId)
    .eq("status", "active")
    .maybeSingle();

  if (!membership) return 0;

  const { data: ownerProfile } = await supabase
    .from("profiles")
    .select("credits_remaining")
    .eq("id", membership.owner_id)
    .single();

  return ownerProfile?.credits_remaining ?? 0;
}

/**
 * Call at the top of every protected AI route.
 */
export async function requireFeature(
  feature: string,
): Promise<GuardResult | GuardError> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, credits_remaining, subscription_ends_at, subscription_status")
    .eq("id", user.id)
    .single();

  const tier    = (profile?.tier ?? "free") as Tier;
  const inTrial = checkTrial(profile?.subscription_ends_at as string | null);
  const status  = (profile?.subscription_status ?? null) as SubStatus;

  if (status === "paused") {
    return NextResponse.json(
      { error: "SUBSCRIPTION_PAUSED", currentTier: tier },
      { status: 402 },
    );
  }

  if (!canAccess(tier, feature)) {
    return NextResponse.json(
      { error: "UPGRADE_REQUIRED", feature, currentTier: tier },
      { status: 403 },
    );
  }

  // Resolve credits: team members use the owner's pool
  let credits = profile?.credits_remaining ?? 0;
  if (tier === "team") {
    const ownerCredits = await resolveCredits(supabase, user.id, tier);
    if (ownerCredits > 0 || credits === 0) credits = ownerCredits;
  }

  if (credits === 0 && tier !== "byok") {
    return NextResponse.json(
      { error: "NO_CREDITS", currentTier: tier },
      { status: 402 },
    );
  }

  return {
    ok: true,
    userId: user.id,
    tier,
    creditsRemaining: credits,
    inTrial,
    pastDue: status === "past_due",
  };
}

/**
 * Guard for job creation — checks pipeline slot limit.
 */
export async function requireJobSlot(): Promise<GuardResult | GuardError> {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, credits_remaining, subscription_ends_at, subscription_status")
    .eq("id", user.id)
    .single();

  const tier    = (profile?.tier ?? "free") as Tier;
  const credits = profile?.credits_remaining ?? 0;
  const inTrial = checkTrial(profile?.subscription_ends_at as string | null);
  const status  = (profile?.subscription_status ?? null) as SubStatus;
  const limit   = jobLimit(tier);

  if (status === "paused") {
    return NextResponse.json(
      { error: "SUBSCRIPTION_PAUSED", currentTier: tier },
      { status: 402 },
    );
  }

  if (limit !== -1) {
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);

    if ((count ?? 0) >= limit) {
      return NextResponse.json(
        { error: "JOB_LIMIT_REACHED", limit, currentTier: tier },
        { status: 403 },
      );
    }
  }

  return {
    ok: true,
    userId: user.id,
    tier,
    creditsRemaining: credits,
    inTrial,
    pastDue: status === "past_due",
  };
}
