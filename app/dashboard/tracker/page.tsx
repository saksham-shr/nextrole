import { createClient } from "@/lib/supabase/server";
import { TrackerPageContent } from "@/components/nextrole/tracker-page";
import type { JobWithEval } from "@/components/nextrole/tracker-page";

export default async function TrackerPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("jobs")
    .select(
      `*,
      evaluations (
        score,
        decision,
        created_at
      )`,
    )
    .order("created_at", { ascending: false });

  const jobs = (rows ?? []) as JobWithEval[];

  return <TrackerPageContent jobs={jobs} />;
}
