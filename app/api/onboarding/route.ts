/**
 * POST /api/onboarding
 * Marks onboarding complete and optionally sets tier (for free plan selection).
 * Called client-side after the user picks a plan on the onboarding page.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { UserTier } from "@/lib/db/types";
import { isSameOrigin } from "@/lib/security/csrf";

export async function POST(req: NextRequest) {
  if (!isSameOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await req.json().catch(() => ({}));

  // All new signups get a 14-day BYOK trial regardless of plan selection.
  // Paid tiers (starter/pro/team) activate only via Lemon Squeezy webhooks.
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

  await supabase
    .from("profiles")
    .update({
      tier: "byok" as UserTier,
      credits_remaining: -1,
      subscription_ends_at: trialEndsAt,
      onboarding_completed: true,
    })
    .eq("id", user.id);

  return NextResponse.json({ ok: true });
}
