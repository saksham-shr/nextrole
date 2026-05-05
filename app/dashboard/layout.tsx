import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
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

  // getUser() validates against Supabase's server — no JWT-only false positives.
  // If we land here without a user the session is genuinely dead; clear the
  // cookies explicitly before redirecting so the middleware doesn't immediately
  // bounce the user back here and create a redirect loop.
  if (!user) {
    const cookieStore = await cookies();
    for (const cookie of cookieStore.getAll()) {
      if (cookie.name.startsWith("sb-")) cookieStore.delete(cookie.name);
    }
    redirect("/login?error=Session+expired.+Please+sign+in+again.");
  }

  const isAdmin = (user.email ?? "").toLowerCase() === ADMIN_EMAIL;

  const [{ data: profile }, { data: pendingInviteRow }] = await Promise.all([
    supabase
      .from("profiles")
      .select("tier, credits_remaining, subscription_ends_at, onboarding_completed")
      .eq("id", user.id)
      .single(),
    supabase
      .from("team_members")
      .select("id, owner_id")
      .eq("invited_email", (user.email ?? "").toLowerCase())
      .eq("status", "pending")
      .limit(1)
      .maybeSingle(),
  ]);

  if (!isAdmin && !profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  const tier: UserTier = isAdmin ? "byok" : ((profile?.tier as UserTier) ?? "free");
  const trialEndsAt: string | null = (profile?.subscription_ends_at as string | null) ?? null;

  // For team members, show credits from the owner's pool
  let creditsRemaining: number = profile?.credits_remaining ?? 0;
  if (tier === "team" && !isAdmin) {
    const { data: membership } = await supabase
      .from("team_members")
      .select("owner_id")
      .eq("member_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (membership) {
      const { data: ownerProfile } = await supabase
        .from("profiles")
        .select("credits_remaining")
        .eq("id", membership.owner_id)
        .single();
      creditsRemaining = ownerProfile?.credits_remaining ?? 0;
    }
  }

  // Resolve owner email for invite banner
  let pendingInvite: { id: string; ownerEmail: string } | null = null;
  if (pendingInviteRow) {
    const { data: ownerUser } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", pendingInviteRow.owner_id)
      .single();
    pendingInvite = {
      id: pendingInviteRow.id,
      ownerEmail: (ownerUser as { email?: string } | null)?.email ?? "Someone",
    };
  }

  return (
    <DashboardShell
      user={{ email: user.email ?? "" }}
      isAdmin={isAdmin}
      tier={tier}
      creditsRemaining={creditsRemaining}
      trialEndsAt={trialEndsAt}
      pendingInvite={pendingInvite}
    >
      {children}
    </DashboardShell>
  );
}
