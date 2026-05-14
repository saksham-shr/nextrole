import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/nextrole/dashboard-shell";
import type { UserTier } from "@/lib/db/types";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith("sb-")) cookieStore.delete(cookie.name);
    }
    redirect("/login?error=Session+expired.+Please+sign+in+again.");
  }

  const isAdmin = (user.email ?? "").toLowerCase() === ADMIN_EMAIL;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, credits_remaining, subscription_ends_at, onboarding_completed")
    .eq("id", user.id)
    .single();

  if (!isAdmin && !profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  // ── Invite gate ──────────────────────────────────────────────────────────
  // Non-admins must be on the invite list to access the dashboard.
  // If invited and not yet activated, we grant pro tier for 30 days here.
  if (!isAdmin) {
    try {
      const admin = createAdminClient();
      const userEmail = (user.email ?? "").toLowerCase();

      const { data: invite } = await admin
        .from("invites")
        .select("id, used_at, expires_at, tier")
        .ilike("email", userEmail)
        .maybeSingle();

      const inviteValid =
        invite &&
        (!invite.expires_at || new Date(invite.expires_at) > new Date());

      if (!inviteValid) {
        // Not invited — send to early access page
        redirect("/early-access");
      }

      // First time using the invite — grant pro tier
      if (invite && !invite.used_at) {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await Promise.all([
          admin
            .from("profiles")
            .update({ tier: "pro", subscription_ends_at: expiresAt })
            .eq("id", user.id),
          admin
            .from("invites")
            .update({ used_at: new Date().toISOString() })
            .eq("id", invite.id),
        ]);
        // Re-fetch profile with updated tier
        const { data: updated } = await supabase
          .from("profiles")
          .select("tier, credits_remaining, subscription_ends_at, onboarding_completed")
          .eq("id", user.id)
          .single();
        if (updated) {
          return (
            <DashboardShell
              user={{ email: user.email ?? "" }}
              isAdmin={false}
              tier={(updated.tier as UserTier) ?? "pro"}
              creditsRemaining={updated.credits_remaining ?? 0}
              trialEndsAt={(updated.subscription_ends_at as string | null) ?? null}
            >
              {children}
            </DashboardShell>
          );
        }
      }
    } catch {
      // If admin client not configured, skip the gate (dev mode)
    }
  }
  // ── End invite gate ──────────────────────────────────────────────────────

  const tier: UserTier = isAdmin ? "pro" : ((profile?.tier as UserTier) ?? "free");
  const trialEndsAt: string | null = (profile?.subscription_ends_at as string | null) ?? null;
  const creditsRemaining: number = profile?.credits_remaining ?? 0;

  return (
    <DashboardShell
      user={{ email: user.email ?? "" }}
      isAdmin={isAdmin}
      tier={tier}
      creditsRemaining={creditsRemaining}
      trialEndsAt={trialEndsAt}
    >
      {children}
    </DashboardShell>
  );
}
