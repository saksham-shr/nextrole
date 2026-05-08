import { createClient } from "@/lib/supabase/server";
import { EvaluatePageContent } from "@/components/nextrole/evaluate-page";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/evaluate/prompt";
import type { JobRow } from "@/lib/db/types";
import type { PastEval } from "@/components/nextrole/evaluate-page";

export default async function EvaluatePage({
  searchParams,
}: {
  searchParams: Promise<{ job_id?: string }>;
}) {
  const { job_id } = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();

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
  let pastEvals: PastEval[] = [];
  let unevaluatedJobs: JobRow[] = [];

  if (user) {
    const [{ data: profile }, { data: evalRows }, { data: pendingJobs }] = await Promise.all([
      supabase.from("profiles").select("base_cv").eq("id", user.id).single(),
      supabase
        .from("evaluations")
        .select("id, score, decision, role_fit, cv_match, compensation_analysis, personalization_guidance, interview_signals, legitimacy_check, created_at, jobs:job_id(id, title, company)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30),
      supabase
        .from("jobs")
        .select("*")
        .eq("user_id", user.id)
        .not("status", "in", '("archived","rejected")')
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    hasCV = Boolean(profile?.base_cv);
    // Provider is server-side — check env keys, not user BYOK credentials
    hasProvider = Boolean(
      process.env.OPENROUTER_API_KEY?.trim() ||
      process.env.ANTHROPIC_API_KEY?.trim() ||
      process.env.OPENAI_API_KEY?.trim() ||
      process.env.GEMINI_API_KEY?.trim()
    );
    pastEvals = (evalRows ?? []) as PastEval[];
    unevaluatedJobs = (pendingJobs ?? []) as JobRow[];

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
      pastEvals={pastEvals}
      unevaluatedJobs={unevaluatedJobs}
    />
  );
}
