import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProfilePageContent } from "@/components/nextrole/profile-page";
import type { ProfileRow } from "@/lib/db/types";

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <h1 className="text-[20px] font-semibold">Profile not found</h1>
        <p className="mt-2 text-[13px] text-[var(--muted-foreground)]">
          Complete onboarding first.
        </p>
      </div>
    );
  }

  return <ProfilePageContent profile={profile as ProfileRow} />;
}
