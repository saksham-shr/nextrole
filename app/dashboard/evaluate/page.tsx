import { createClient } from "@/lib/supabase/server";
import { EvaluatePageContent } from "@/components/nextrole/evaluate-page";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/evaluate/prompt";
import type { JobRow } from "@/lib/db/types";

export default async function EvaluatePage({
  searchParams,
}: {
  searchParams: Promise<{ job_id?: string }>;
}) {
  const { job_id } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let job: JobRow | null = null;
  if (job_id && user) {
    const { data } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", job_id)
      .eq("user_id", user.id)
      .single();
    job = data ?? null;
  }

  let hasCV = false;
  let hasProvider = false;
  let promptText: string | null = null;

  if (user) {
    const [{ data: profile }, { data: providers }] = await Promise.all([
      supabase.from("profiles").select("base_cv").eq("id", user.id).single(),
      supabase
        .from("provider_credentials")
        .select("id")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .in("provider", ["anthropic", "openai"])
        .limit(1),
    ]);

    hasCV = Boolean(profile?.base_cv);
    hasProvider = (providers?.length ?? 0) > 0;

    // Generate the manual-mode prompt whenever we have a job description.
    // If CV is missing, include a placeholder so the user can see the full structure.
    if (job?.description) {
      const userPrompt = buildUserPrompt({
        title: job.title,
        company: job.company,
        description: job.description,
        base_cv: profile?.base_cv ?? "(paste your CV text here)",
        archetype: job.archetype,
      });
      promptText = `SYSTEM\n${"─".repeat(60)}\n${SYSTEM_PROMPT}\n\n${"─".repeat(60)}\nUSER\n${"─".repeat(60)}\n${userPrompt}`;
    }
  }

  return (
    <EvaluatePageContent
      job={job}
      hasCV={hasCV}
      hasProvider={hasProvider}
      promptText={promptText}
    />
  );
}
