import { createClient } from "@/lib/supabase/server";
import { TrainingPageContent } from "@/components/nextrole/training-page";

export default async function TrainingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, { data: providers }] = await Promise.all([
    supabase.from("profiles").select("base_cv, target_roles").eq("id", user.id).single(),
    supabase
      .from("provider_credentials")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("provider", ["anthropic", "openai"])
      .limit(1),
  ]);

  return (
    <TrainingPageContent
      hasCV={Boolean(profile?.base_cv)}
      hasProvider={Boolean(providers?.length)}
    />
  );
}
