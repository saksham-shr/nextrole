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
