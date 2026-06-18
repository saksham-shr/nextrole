/**
 * Thin wrapper around the award_action_credit() RPC.
 *
 * All progressive credit grants for free-tier users flow through here.
 * The RPC is idempotent — safe to call from multiple code paths without
 * risk of double-granting (uses credit_grants_given jsonb for dedup).
 *
 * Fire-and-forget: callers should .catch() errors — a failed grant must
 * never block the user's primary action.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

export type GrantAction =
  | "signup"
  | "profile_complete"
  | "cv_upload"
  | "extension_connect"
  | "first_job"
  | "first_evaluation"
  | "work_experience";

const GRANT_AMOUNTS: Record<GrantAction, number> = {
  signup:             10,
  profile_complete:   15,
  cv_upload:          20,
  extension_connect:  25,
  first_job:          10,
  first_evaluation:   10,
  work_experience:    10,
};

export async function awardActionCredit(
  admin: SupabaseClient,
  userId: string,
  action: GrantAction,
): Promise<"granted" | "already_granted" | "error"> {
  const amount = GRANT_AMOUNTS[action];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (admin.rpc as any)("award_action_credit", {
    p_user_id: userId,
    p_action:  action,
    p_amount:  amount,
  });
  if (error) {
    console.error(`[grant] award_action_credit(${action}) failed for ${userId}:`, error.message);
    return "error";
  }
  const result = data as string | null;
  if (result === "granted" || result === "already_granted") return result;
  return "granted";
}

/**
 * Check whether the basic profile fields are filled (name + location).
 * Used to detect the "profile_complete" grant trigger.
 */
export function isProfileComplete(profile: Record<string, unknown>): boolean {
  return !!(
    profile.full_name &&
    (profile.city || profile.country)
  );
}

/**
 * Check if a referred user has crossed the 10cr usage threshold
 * and trigger the referral reward for their referrer.
 * Fire-and-forget — never blocks the caller.
 */
export async function checkReferralThreshold(
  admin: SupabaseClient,
  userId: string,
): Promise<void> {
  // Quick check: does this user have a referrer?
  const { data: profile } = await admin
    .from("profiles")
    .select("referred_by")
    .eq("id", userId)
    .single();

  if (!profile?.referred_by) return;

  // Check total credits used (from usage_log)
  const { data: usage } = await admin
    .from("usage_log")
    .select("credits_used")
    .eq("user_id", userId);

  const totalUsed = (usage ?? []).reduce((sum, row) => sum + ((row as { credits_used: number }).credits_used ?? 0), 0);
  if (totalUsed < 10) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (admin.rpc as any)("process_referral_reward", { p_referee_id: userId });
}
