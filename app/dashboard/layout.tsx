import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DashboardShell } from "@/components/nextrole/dashboard-shell";
import type { UserTier } from "@/lib/db/types";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?error=Session+expired.+Please+sign+in+again.");
  }

  const isAdmin = ADMIN_EMAIL !== "" && (user.email ?? "").toLowerCase() === ADMIN_EMAIL;

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, credits_remaining, subscription_ends_at, onboarding_completed")
    .eq("id", user.id)
    .single();

  // If onboarding isn't done (including no profile row yet), send them there.
  if (!isAdmin && !profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  // ── Invite gate ──────────────────────────────────────────────────────────
  // Admins always bypass. Non-admins must be on the invite list.
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
        redirect("/early-access");
      }

      // First access with a fresh invite — grant pro tier for 30 days.
      if (invite && !invite.used_at) {
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
        await Promise.all([
          admin.from("profiles").update({ tier: "pro", subscription_ends_at: expiresAt }).eq("id", user.id),
          admin.from("invites").update({ used_at: new Date().toISOString() }).eq("id", invite.id),
        ]);
        // Re-fetch to get the latest values. If the re-fetch fails, we still
        // know the grant ran so we hard-code "pro" as the fallback.
        const { data: updated } = await supabase
          .from("profiles")
          .select("tier, credits_remaining, subscription_ends_at, onboarding_completed")
          .eq("id", user.id)
          .single();
        return (
          <DashboardShell
            user={{ email: user.email ?? "" }}
            isAdmin={false}
            tier={(updated?.tier as UserTier) ?? "pro"}
            creditsRemaining={updated?.credits_remaining ?? 0}
            trialEndsAt={(updated?.subscription_ends_at as string | null) ?? expiresAt}
          >
            {children}
          </DashboardShell>
        );
      }
    } catch (e) {
      // Re-throw Next.js redirect errors so redirect() inside the try actually fires.
      if (typeof e === "object" && e !== null && "digest" in e &&
          typeof (e as { digest: unknown }).digest === "string" &&
          (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")) {
        throw e;
      }
      // Admin client not configured (dev) — skip gate.
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
