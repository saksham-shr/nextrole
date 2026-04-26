import { createClient } from "@/lib/supabase/server";
import { InterviewPrepPageContent } from "@/components/nextrole/interview-prep-page";
import type { PrepPackWithJob } from "@/components/nextrole/interview-prep-page";

export default async function InterviewPrepPage() {
  const supabase = await createClient();

  const [{ data: packs }, { data: jobs }] = await Promise.all([
    supabase
      .from("interview_prep_packs")
      .select(`*, jobs (title, company)`)
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("id, title, company, description")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <InterviewPrepPageContent
      packs={(packs ?? []) as PrepPackWithJob[]}
      jobs={jobs ?? []}
    />
  );
}
