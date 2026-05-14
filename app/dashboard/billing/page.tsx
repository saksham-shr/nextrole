import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BillingPage } from "@/components/nextrole/billing-page";
import type { UserTier } from "@/lib/db/types";

export const metadata = { title: "Plan & Credits — NextRole" };

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

export default async function Billing() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = (user.email ?? "").toLowerCase() === ADMIN_EMAIL;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: usageRow }, { data: creditLog }] = await Promise.all([
    supabase
      .from("profiles")
      .select("tier, credits_remaining, subscription_ends_at, subscription_status")
      .eq("id", user.id)
      .single(),
    supabase
      .from("daily_usage")
      .select("evaluations, resumes, autofills")
      .eq("user_id", user.id)
      .eq("date", today)
      .maybeSingle(),
    supabase
      .from("usage_log")
      .select("id, task_type, credits_used, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  // Fetch Lemon Squeezy portal URL if on paid plan
  let portalUrl: string | null = null;
  try {
    const appUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
    const res = await fetch(`${appUrl}/api/billing/portal`, {
      method: "GET",
    });
    if (res.ok) {
      const data = await res.json() as { url?: string };
      portalUrl = data.url ?? null;
    }
  } catch { /* portal not critical */ }

  const tier: UserTier = isAdmin ? "pro" : ((profile?.tier as UserTier) ?? "free");
  const creditsRemaining = profile?.credits_remaining ?? 0;

  return (
    <BillingPage
      tier={tier}
      email={user.email ?? ""}
      trialEndsAt={isAdmin ? null : ((profile?.subscription_ends_at as string | null) ?? null)}
      subscriptionStatus={isAdmin ? "active" : ((profile?.subscription_status as string | null) ?? null)}
      renewsAt={isAdmin ? null : ((profile?.subscription_ends_at as string | null) ?? null)}
      portalUrl={isAdmin ? null : portalUrl}
      usage={{
        creditsRemaining,
        evaluationsToday: usageRow?.evaluations ?? 0,
        resumesToday:     usageRow?.resumes     ?? 0,
        autofillsToday:   usageRow?.autofills   ?? 0,
      }}
      creditLog={creditLog ?? []}
    />
  );
}
