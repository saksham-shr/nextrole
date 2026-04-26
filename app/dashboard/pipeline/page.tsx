import { createClient } from "@/lib/supabase/server";
import { PipelinePageContent } from "@/components/nextrole/pipeline-page";

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const { data: jobs } = await supabase
    .from("jobs")
    .select("*")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <PipelinePageContent
      jobs={jobs ?? []}
      error={error}
      message={message}
    />
  );
}
