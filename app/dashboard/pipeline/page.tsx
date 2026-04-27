import { createClient } from "@/lib/supabase/server";
import { PipelinePageContent } from "@/components/nextrole/pipeline-page";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const [{ data: jobs }, { data: allJobs }] = await Promise.all([
    supabase
      .from("jobs")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
    supabase
      .from("jobs")
      .select("title, company")
      .neq("status", "archived"),
  ]);

  return (
    <PipelinePageContent
      jobs={jobs ?? []}
      existingJobs={allJobs ?? []}
      error={error}
      message={message}
    />
  );
}
