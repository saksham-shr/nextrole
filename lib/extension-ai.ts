import type { SupabaseClient } from "@supabase/supabase-js";
import { CREDIT_COSTS, type CreditTask } from "@/lib/ai/gates";
import type { UserTier } from "@/lib/db/types";

type AdminClient = SupabaseClient;

export async function chargeExtensionAiSuccess(
  admin: AdminClient,
  opts: {
    userId: string;
    tier: UserTier;
    task: CreditTask;
    freeUsageField?: "evaluations" | "resumes";
    starterUsageField?: "tailor_sessions";
  },
) {
  const { userId, tier, task, freeUsageField, starterUsageField } = opts;

  if (tier === "free" && freeUsageField) {
    await admin.rpc("increment_daily_usage", { p_field: freeUsageField, p_user: userId });
    return 0;
  }

  if (tier === "starter" && starterUsageField) {
    await admin.rpc("increment_daily_usage", { p_field: starterUsageField, p_user: userId });
    return 0;
  }

  const credits = CREDIT_COSTS[task];
  const { data: ok, error } = await admin.rpc("deduct_credit", {
    p_user_id: userId,
    p_amount: credits,
  });
  if (error || ok !== true) {
    throw new Error("Insufficient credits");
  }
  return credits;
}

// Reservation: atomically deduct credits / increment daily usage BEFORE the
// AI call. Returns a refund() closure that callers MUST invoke if the AI
// call (or any post-call step) fails. This closes the race where two
// parallel requests both pass the read-only preflight check, both call the
// provider, and only one fails on the eventual write — billing drift.
//
// Free / starter usage: increment_daily_usage is atomic via an UPSERT; the
// daily limit is re-checked after increment, and over-limit reservations
// are rolled back before the AI call ever happens.
export type ChargeReservation = {
  refund: () => Promise<void>;
  charged: number;
};

export async function reserveExtensionAiCharge(
  admin: AdminClient,
  opts: {
    userId: string;
    tier: UserTier;
    task: CreditTask;
    freeUsageField?: "evaluations" | "resumes";
    freeDailyLimit?: number;
    starterUsageField?: "tailor_sessions";
    starterDailyLimit?: number;
  },
): Promise<ChargeReservation> {
  const { userId, tier, task, freeUsageField, freeDailyLimit, starterUsageField, starterDailyLimit } = opts;

  if (tier === "free" && freeUsageField) {
    const { data: newVal, error } = await admin.rpc("increment_daily_usage", { p_field: freeUsageField, p_user: userId });
    if (error) throw new Error("Could not reserve daily usage");
    if (typeof freeDailyLimit === "number" && typeof newVal === "number" && newVal > freeDailyLimit) {
      await decrementDailyUsage(admin, userId, freeUsageField);
      throw new Error("DAILY_LIMIT");
    }
    return {
      charged: 0,
      refund: async () => { await decrementDailyUsage(admin, userId, freeUsageField); },
    };
  }

  if (tier === "starter" && starterUsageField) {
    const { data: newVal, error } = await admin.rpc("increment_daily_usage", { p_field: starterUsageField, p_user: userId });
    if (error) throw new Error("Could not reserve daily usage");
    if (typeof starterDailyLimit === "number" && typeof newVal === "number" && newVal > starterDailyLimit) {
      await decrementDailyUsage(admin, userId, starterUsageField);
      throw new Error("DAILY_LIMIT");
    }
    return {
      charged: 0,
      refund: async () => { await decrementDailyUsage(admin, userId, starterUsageField); },
    };
  }

  const credits = CREDIT_COSTS[task];
  const { data: ok, error } = await admin.rpc("deduct_credit", {
    p_user_id: userId,
    p_amount: credits,
  });
  if (error || ok !== true) {
    throw new Error("INSUFFICIENT_CREDITS");
  }
  return {
    charged: credits,
    refund: async () => {
      // Inverse of deduct_credit: add the credits back. Try a dedicated
      // refund_credit RPC first; fall back to a SELECT/UPDATE under the
      // admin client (bypasses RLS) for older DBs that don't have it.
      try {
        // refund_credit added in 20260521000001 — typegen may lag.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rpcErr } = await (admin.rpc as any)("refund_credit", { p_user_id: userId, p_amount: credits });
        if (!rpcErr) return;
      } catch {}
      try {
        const { data } = await admin
          .from("profiles")
          .select("credits_remaining")
          .eq("id", userId)
          .single();
        const current = (data?.credits_remaining as number | null) ?? 0;
        await admin
          .from("profiles")
          .update({ credits_remaining: current + credits })
          .eq("id", userId);
      } catch {}
    },
  };
}

async function decrementDailyUsage(
  admin: AdminClient,
  userId: string,
  field: "evaluations" | "resumes" | "autofills" | "tailor_sessions",
): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await admin
    .from("daily_usage")
    .select(field)
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();
  const current = (data as Record<string, number> | null)?.[field] ?? 0;
  if (current <= 0) return;
  await admin
    .from("daily_usage")
    .update({ [field]: current - 1, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("date", today);
}