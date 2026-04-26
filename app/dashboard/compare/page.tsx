import { createClient } from "@/lib/supabase/server";
import { ComparePageContent } from "@/components/nextrole/compare-page";
import type { JobWithLatestEval } from "@/components/nextrole/compare-page";

export default async function ComparePage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("jobs")
    .select("*, evaluations (score, decision)")
    .order("created_at", { ascending: false });

  return <ComparePageContent jobs={(rows ?? []) as JobWithLatestEval[]} />;
}
