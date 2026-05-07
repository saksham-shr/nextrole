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
