import { createClient } from "@/lib/supabase/server";
import { ActivityPageContent } from "@/components/nextrole/activity-page";
import type { TaskRunWithJob } from "@/components/nextrole/activity-page";

export default async function ActivityPage() {
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("task_runs")
    .select("*, jobs:linked_job_id (title, company)")
    .order("created_at", { ascending: false })
    .limit(100);

  return <ActivityPageContent runs={(rows ?? []) as TaskRunWithJob[]} />;
}
