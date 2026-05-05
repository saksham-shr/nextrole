import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { BillingPage } from "@/components/nextrole/billing-page";
import type { UserTier } from "@/lib/db/types";

export default async function Billing() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, credits_remaining, subscription_ends_at")
    .eq("id", user.id)
    .single();

  return (
    <BillingPage
      tier={(profile?.tier as UserTier) ?? "free"}
      creditsRemaining={profile?.credits_remaining ?? 0}
      trialEndsAt={(profile?.subscription_ends_at as string | null) ?? null}
      userEmail={user.email ?? ""}
    />
  );
}
