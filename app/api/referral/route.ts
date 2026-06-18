/**
 * GET /api/referral
 *
 * Returns the authenticated user's referral code, stats, and referral history.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code, referred_by")
    .eq("id", user.id)
    .single();

  if (!profile?.referral_code) {
    return NextResponse.json({ error: "No referral code found" }, { status: 404 });
  }

  // Get referral stats
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: grants } = await (supabase.from("referral_grants") as any)
    .select("referee_id, referee_threshold_met, credits_awarded, awarded_at, created_at")
    .eq("referrer_id", user.id)
    .order("created_at", { ascending: false }) as { data: Array<{ referee_threshold_met: boolean; credits_awarded: number }> | null };

  const total = grants?.length ?? 0;
  const completed = grants?.filter((g) => g.referee_threshold_met).length ?? 0;
  const creditsEarned = grants?.reduce((sum, g) => sum + (g.credits_awarded ?? 0), 0) ?? 0;

  return NextResponse.json({
    referral_code: profile.referral_code,
    referred_by: profile.referred_by ?? null,
    stats: {
      total_referrals: total,
      completed_referrals: completed,
      credits_earned: creditsEarned,
      max_referrals: 5,
    },
  });
}
