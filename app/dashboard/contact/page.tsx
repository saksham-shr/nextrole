import { createClient } from "@/lib/supabase/server";
import { ContactPageContent } from "@/components/nextrole/contact-page";
import type { JobRow } from "@/lib/db/types";

export default async function ContactPage({
  searchParams,
}: {
  searchParams: Promise<{ job_id?: string }>;
}) {
  const { job_id } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [{ data: jobs }, { data: profile }, { data: providers }] = await Promise.all([
    supabase
      .from("jobs")
      .select("id, title, company, description, status")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase.from("profiles").select("base_cv, full_name").eq("id", user.id).single(),
    supabase
      .from("provider_credentials")
      .select("id")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .in("provider", ["anthropic", "openai"])
      .limit(1),
  ]);

  return (
    <ContactPageContent
      jobs={(jobs ?? []) as JobRow[]}
      hasCV={Boolean(profile?.base_cv)}
      candidateName={profile?.full_name ?? null}
      hasProvider={Boolean(providers?.length)}
      initialJobId={job_id}
    />
  );
}
