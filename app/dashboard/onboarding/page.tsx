import { createClient } from "@/lib/supabase/server";
import { OnboardingPageContent } from "@/components/nextrole/onboarding-page";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: providers } = await supabase
    .from("provider_credentials")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("provider", ["anthropic", "openai"])
    .limit(1);

  return <OnboardingPageContent hasProvider={Boolean(providers?.length)} />;
}
