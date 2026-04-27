import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingPageContent } from "@/components/nextrole/onboarding-page";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: providers }] = await Promise.all([
    supabase
      .from("provider_credentials")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("provider", ["anthropic", "openai", "gemini"])
      .limit(1),
    // Mark onboarding as seen the moment the page loads.
    // This is a fire-and-forget update — the dashboard will never
    // redirect here again after this request completes.
    supabase
      .from("profiles")
      .update({ onboarding_completed: true, updated_at: new Date().toISOString() })
      .eq("id", user.id),
  ]);

  return <OnboardingPageContent hasProvider={Boolean(providers?.length)} />;
}
