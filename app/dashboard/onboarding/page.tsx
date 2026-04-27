import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingPageContent } from "@/components/nextrole/onboarding-page";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: providers }, { data: profile }] = await Promise.all([
    supabase
      .from("provider_credentials")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("provider", ["anthropic", "openai", "gemini"])
      .limit(1),
    supabase
      .from("profiles")
      .select("full_name, base_cv")
      .eq("id", user.id)
      .single(),
  ]);

  // If the user has already completed setup (has a CV and a provider),
  // they don't need onboarding — send them to the dashboard.
  const alreadySetUp = Boolean(profile?.base_cv) && Boolean(providers?.length);
  if (alreadySetUp) redirect("/dashboard");

  return <OnboardingPageContent hasProvider={Boolean(providers?.length)} />;
}
