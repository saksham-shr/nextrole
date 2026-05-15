import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsPageContent } from "@/components/nextrole/settings-page";
import type { UserTier } from "@/lib/db/types";

export const metadata = { title: "Settings — NextRole" };

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const isAdmin = (user.email ?? "").toLowerCase() === ADMIN_EMAIL;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: profile }, { data: creditLog }] = await Promise.all([
    supabase
      .from("profiles")
      .select("tier, credits_remaining, subscription_ends_at, subscription_status")
      .eq("id", user.id)
      .single(),
    supabase
      .from("usage_log")
      .select("id, task_type, credits_used, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const tier: UserTier = isAdmin ? "pro" : ((profile?.tier as UserTier) ?? "free");

  return (
    <SettingsPageContent
      tier={tier}
      email={user.email ?? ""}
      creditsRemaining={profile?.credits_remaining ?? 0}
      renewsAt={isAdmin ? null : (profile?.subscription_ends_at ?? null)}
      subscriptionStatus={isAdmin ? "active" : (profile?.subscription_status ?? null)}
      portalUrl={null}
      creditLog={creditLog ?? []}
    />
  );
}
