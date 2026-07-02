import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { SettingsPageContent } from "@/components/nextrole/settings-page";
import type { UserTier } from "@/lib/db/types";

export const metadata = { title: "Settings — Braevity" };

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
      .select("tier, credits_remaining, subscription_ends_at, subscription_status, preferred_language, eval_score_apply, eval_score_watch, custom_eval_focus, custom_archetypes, target_archetypes, preferred_company_types")
      .eq("id", user.id)
      .single(),
    supabase
      .from("usage_log")
      .select("id, activity_type, credits_used, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
  ]);

  const tier: UserTier = isAdmin ? "pro" : ((profile?.tier as UserTier) ?? "free");

  return (
    <SettingsPageContent
      tier={tier}
      email={user.email ?? ""}
      creditsRemaining={isAdmin ? 300 : (profile?.credits_remaining ?? 0)}
      renewsAt={isAdmin ? null : (profile?.subscription_ends_at ?? null)}
      subscriptionStatus={isAdmin ? "active" : (profile?.subscription_status ?? null)}
      portalUrl={null}
      creditLog={creditLog ?? []}
      aiPrefs={{
        preferred_language: (profile as Record<string, unknown>)?.preferred_language as string ?? "English",
        eval_score_apply: (profile as Record<string, unknown>)?.eval_score_apply as number ?? 3.5,
        eval_score_watch: (profile as Record<string, unknown>)?.eval_score_watch as number ?? 2.5,
        custom_eval_focus: (profile as Record<string, unknown>)?.custom_eval_focus as string ?? "",
        custom_archetypes: ((profile as Record<string, unknown>)?.custom_archetypes as string[]) ?? [],
        target_archetypes: ((profile as Record<string, unknown>)?.target_archetypes as string[]) ?? [],
        preferred_company_types: ((profile as Record<string, unknown>)?.preferred_company_types as string[]) ?? [],
      }}
    />
  );
}
