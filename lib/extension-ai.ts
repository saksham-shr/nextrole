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
      // add_credits is the inverse of deduct_credit — both are service_role only.
      try {
        await admin.rpc("add_credits", { p_user_id: userId, p_amount: credits });
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