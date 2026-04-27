import { createClient } from "@/lib/supabase/server";
import { NegotiatePageContent } from "@/components/nextrole/negotiate-page";
import type { JobRow } from "@/lib/db/types";

export default async function NegotiatePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: jobs }, { data: profile }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, company, status")
      .eq("user_id", user.id)
      .in("status", ["evaluated", "applied", "interview", "offer"])
      .order("updated_at", { ascending: false }),
    supabase
      .from("profiles")
      .select("current_comp, comp_max")
      .eq("id", user.id)
      .single(),
  ]);

  return (
    <NegotiatePageContent
      jobs={(jobs ?? []) as JobRow[]}
      profileComp={{
        current_comp: profile?.current_comp ?? null,
        comp_max: profile?.comp_max ?? null,
      }}
    />
  );
}
