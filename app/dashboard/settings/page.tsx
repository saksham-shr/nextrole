import { createClient } from "@/lib/supabase/server";
import { SettingsPageContent } from "@/components/nextrole/settings-page";
import type { ProfileRow } from "@/lib/db/types";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let profile: ProfileRow | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();
    profile = data ?? null;
  }

  return (
    <SettingsPageContent profile={profile} error={error} message={message} />
  );
}
