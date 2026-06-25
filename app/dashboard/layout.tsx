import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/nextrole/dashboard-shell";
import type { UserTier } from "@/lib/db/types";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
const TIER_CREDITS: Record<string, number> = { pro: 300, starter: 100, free: 0 };
const ALLOWED_INVITE_TIERS = new Set(["free", "starter", "pro"]);

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=Session+expired.+Please+sign+in+again.");
  }

  const isAdmin = ADMIN_EMAIL !== "" && (user.email ?? "").toLowerCase() === ADMIN_EMAIL;

  let profile = (await supabase
    .from("profiles")
    .select("tier, credits_remaining, credit_grants_given, subscription_ends_at, onboarding_completed, subscription_status, credits_reset_at, referral_code")
    .eq("id", user.id)
    .single()).data;

  // ── Invite tier grant — MUST run before the onboarding redirect ──────────
  // If we redirected to /onboarding first, a brand-new invited user would
  // never reach this block on their initial dashboard visit: they'd be sent
  // through onboarding (potentially picking + paying for a tier) before
  // their invite is honored. By granting first, the user lands in onboarding
  // already on their intended tier with credits, and onboarding can skip
  // tier selection / payment.
  if (!isAdmin) {
    try {
      const admin = createAdminClient();
      const { data: invite } = await admin
        .from("invites")
        .select("id, used_at, expires_at, tier")
        .ilike("email", user.email ?? "")
        .maybeSingle();

      const inviteFresh = invite
        && !invite.used_at
        && (!invite.expires_at || new Date(invite.expires_at) > new Date())
        && ALLOWED_INVITE_TIERS.has(String(invite.tier ?? ""));

      if (invite && inviteFresh) {
        const grantTier = (invite.tier ?? "pro") as UserTier;
        const grantCredits = TIER_CREDITS[grantTier] ?? 0;
        const isPaid = grantTier !== "free";
        const grantExpiry = isPaid
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null;
        // subscription_status MUST match the tier so downstream code treats
        // invited paid users as real paid users:
        //   - app/api/cron/reset-credits expects status ∈ {active, past_due, cancelled}
        //     to include the user in nightly credit reset
        //   - app/api/razorpay/create-order requires status === "active" for
        //     a Pro user to buy top-ups
        //   - admin grantTier server action uses the same active/expired mapping
        // Free invites get "expired" (mirrors the cron's post-expiry state and
        // admin.grantTier's free-tier path).
        const grantStatus = isPaid ? "active" : "expired";
        await Promise.all([
          admin.from("profiles")
            .update({
              tier:                 grantTier,
              subscription_ends_at: grantExpiry,
              credits_remaining:    grantCredits,
              subscription_status:  grantStatus,
            })
            .eq("id", user.id),
          admin.from("invites")
            .update({ used_at: new Date().toISOString() })
            .eq("id", invite.id),
        ]);
        profile = {
          ...profile,
          tier: grantTier,
          credits_remaining: grantCredits,
          credit_grants_given: (profile?.credit_grants_given ?? {}) as Record<string, string>,
          subscription_ends_at: grantExpiry,
          onboarding_completed: profile?.onboarding_completed ?? false,
          subscription_status: (profile?.subscription_status ?? null) as (typeof profile extends null ? null : NonNullable<typeof profile>["subscription_status"]),
          credits_reset_at: profile?.credits_reset_at ?? "",
          referral_code: (profile?.referral_code as string | null) ?? null,
        };
      } else if (invite && !inviteFresh && invite.tier && !ALLOWED_INVITE_TIERS.has(String(invite.tier))) {
        // Defensive: if a malformed invite tier somehow landed in the table
        // (pre-validation history), do nothing rather than crash. Operator
        // can clean it up via the admin panel.
        console.warn("[dashboard layout] skipping invite with disallowed tier:", invite.tier);
      }
    } catch {
      // Admin client not configured (dev) or invite table missing — skip grant.
    }
  }

  // ── Onboarding redirect — AFTER invite grant ─────────────────────────────
  // A freshly-granted invited user still gets sent through onboarding (to
  // fill out their profile), but their tier + credits are already set so
  // onboarding doesn't ask them to pick/pay again.
  if (!isAdmin && !profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const tier: UserTier = isAdmin ? "pro" : ((profile?.tier as UserTier) ?? "free");
  const trialEndsAt: string | null = (profile?.subscription_ends_at as string | null) ?? null;
  let creditsRemaining: number = profile?.credits_remaining ?? 0;

  // If a paid user has 0 credits and the daily reset is overdue, top them
  // up now. This handles new subscriptions (cron hasn't run yet today) and
  // local dev environments where the cron never runs.
  const DAILY_MAX: Record<string, number> = { pro: 300, starter: 100 };
  const dailyMax = DAILY_MAX[tier] ?? 0;
  if (!isAdmin && dailyMax > 0 && creditsRemaining === 0) {
    const subStatus = profile?.subscription_status as string | null;
    const resetAt   = profile?.credits_reset_at ? new Date(profile.credits_reset_at as string) : null;
    const isActive  = subStatus === "active" || subStatus === "trialing";
    const isOverdue = !resetAt || resetAt <= new Date();
    if (isActive && isOverdue) {
      try {
        const adminCl = createAdminClient();
        await adminCl
          .from("profiles")
          .update({
            credits_remaining: dailyMax,
            credits_reset_at:  new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          })
          .eq("id", user.id);
        creditsRemaining = dailyMax;
      } catch {
        // Non-fatal — next cron run will fix it
      }
    }
  }

  // Admin's real DB credits are likely 0 (never purchased) — show the Pro
  // daily allowance for display purposes only; never written back to the DB.
  if (isAdmin) {
    creditsRemaining = DAILY_MAX.pro;
  }

  const referralCode = (profile?.referral_code as string | null) ?? null;
  const creditGrantsGiven = (profile?.credit_grants_given ?? {}) as unknown as Record<string, boolean>;

  return (
    <DashboardShell
      user={{ email: user.email ?? "" }}
      isAdmin={isAdmin}
      tier={tier}
      creditsRemaining={creditsRemaining}
      trialEndsAt={trialEndsAt}
      referralCode={referralCode}
      creditGrantsGiven={creditGrantsGiven}
    >
      {children}
    </DashboardShell>
  );
}
