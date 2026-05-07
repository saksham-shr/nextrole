import { createClient } from "@/lib/supabase/server";
import { PipelinePageContent } from "@/components/nextrole/pipeline-page";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const allJobs = (jobs ?? []).map((j) => ({ title: j.title, company: j.company }));

  return (
    <PipelinePageContent
      jobs={jobs ?? []}
      existingJobs={allJobs}
      error={error}
      message={message}
    />
  );
}
