import { createClient } from "@/lib/supabase/server";
import { TrackerPageContent } from "@/components/nextrole/tracker-page";
import type { JobWithEval } from "@/components/nextrole/tracker-page";

export default async function TrackerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: rows }, { data: events }] = await Promise.all([
    supabase
      .from("jobs")
      .select(`*, evaluations (score, decision, created_at)`)
      .order("created_at", { ascending: false }),
    supabase
      .from("job_events")
      .select("job_id, event_type, payload, created_at")
      .eq("user_id", user.id)
      .eq("event_type", "status_change")
      .order("created_at", { ascending: true }),
  ]);

  const jobs = (rows ?? []) as JobWithEval[];

  return <TrackerPageContent jobs={jobs} jobEvents={events ?? []} />;
}
