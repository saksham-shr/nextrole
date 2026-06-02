import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingPricing } from "@/components/nextrole/onboarding-pricing";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, subscription_ends_at, tier")
    .eq("id", user.id)
    .single();

  // Already onboarded — skip to dashboard
  if (profile?.onboarding_completed) redirect("/dashboard");

  return (
    <OnboardingPricing
      trialEndsAt={(profile?.subscription_ends_at as string | null) ?? null}
      email={user.email ?? ""}
      currentTier={(profile?.tier as string | null) ?? "free"}
    />
  );
}
