import { createClient } from "@/lib/supabase/server";
import { ResumesPageContent } from "@/components/nextrole/resumes-page";
import type { ResumeWithJob } from "@/components/nextrole/resumes-page";
import type { JobRow } from "@/lib/db/types";

export default async function ResumesPage() {
  const supabase = await createClient();

  const [{ data: resumeRows }, { data: jobRows }] = await Promise.all([
    supabase
      .from("resumes")
      .select("*, jobs:job_id (title, company)")
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("id, title, company, description")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <ResumesPageContent
      resumes={(resumeRows ?? []) as ResumeWithJob[]}
      jobs={(jobRows ?? []) as Pick<JobRow, "id" | "title" | "company" | "description">[]}
    />
  );
}
