import { createClient } from "@/lib/supabase/server";
import { DeepPageContent } from "@/components/nextrole/deep-page";
import type { JobRow } from "@/lib/db/types";

export default async function DeepPage({
  searchParams,
}: {
  searchParams: Promise<{ job_id?: string }>;
}) {
  const { job_id } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: jobs }, { data: providers }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, company, description, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("provider_credentials")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("provider", ["anthropic", "openai"])
      .limit(1),
  ]);

  return (
    <DeepPageContent
      jobs={(jobs ?? []) as JobRow[]}
      hasProvider={Boolean(providers?.length)}
      initialJobId={job_id}
    />
  );
}
