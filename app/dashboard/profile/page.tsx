import { createClient } from "@/lib/supabase/server";
import { ProfilePageContent } from "@/components/nextrole/profile-page";
import type { ProfileRow } from "@/lib/db/types";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  return (
    <ProfilePageContent
      profile={(profile ?? null) as ProfileRow | null}
      error={error}
      message={message}
    />
  );
}
