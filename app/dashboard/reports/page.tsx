import { createClient } from "@/lib/supabase/server";
import { ReportsPageContent } from "@/components/nextrole/reports-page";
import type { ReportWithJob } from "@/components/nextrole/reports-page";

export default async function ReportsPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("reports")
    .select("*, jobs:job_id (title, company)")
    .order("created_at", { ascending: false });

  return <ReportsPageContent reports={(rows ?? []) as ReportWithJob[]} />;
}
