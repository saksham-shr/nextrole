import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTeamData } from "@/app/actions/team";
import { TeamPage } from "@/components/nextrole/team-page";

export default async function TeamDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  if (profile?.tier !== "team") {
    redirect("/dashboard/billing");
  }

  const data = await getTeamData();

  return <TeamPage {...data} />;
}
