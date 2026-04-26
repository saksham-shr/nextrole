import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import {
  INTERVIEW_PREP_SYSTEM_PROMPT,
  buildInterviewPrepPrompt,
} from "@/lib/interview/prompt";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { job_id?: string };
  if (!body.job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const { data: job } = await supabase
    .from("jobs")
    .select("title, company, description")
    .eq("id", body.job_id)
    .eq("user_id", user.id)
    .single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.description)
    return NextResponse.json(
      { error: "Job has no description — paste it in Pipeline first" },
      { status: 400 },
    );

  const { data: profile } = await supabase
    .from("profiles")
    .select("base_cv")
    .eq("id", user.id)
    .single();
  if (!profile?.base_cv)
    return NextResponse.json({ error: "No CV set — add it in Settings" }, { status: 400 });

  const { data: evals } = await supabase
    .from("evaluations")
    .select("role_fit, cv_match, interview_signals, personalization_guidance, legitimacy_check")
    .eq("job_id", body.job_id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const evalData = evals?.[0] ?? null;

  const { data: providers } = await supabase
    .from("provider_credentials")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("provider", ["anthropic", "openai", "gemini"])
    .order("updated_at", { ascending: false })
    .limit(1);
  const cred = providers?.[0];
  if (!cred?.encrypted_key)
    return NextResponse.json({ error: "No AI provider configured" }, { status: 400 });

  const apiKey = decrypt(cred.encrypted_key);
  const model = cred.model ?? (cred.provider === "anthropic" ? "claude-opus-4-7" : cred.provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o");

  const userPrompt = buildInterviewPrepPrompt({
    jobTitle: job.title,
    jobCompany: job.company,
    jobDescription: job.description,
    cv: profile.base_cv,
    evalBlocks: evalData,
  });

  let content: Record<string, unknown>;
  try {
    const raw =
      await callProvider(cred.provider, apiKey, model, INTERVIEW_PREP_SYSTEM_PROMPT, userPrompt);
    content = parseJSON(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "AI returned invalid output" }, { status: 502 });
  }

  const { data: pack } = await supabase
    .from("interview_prep_packs")
    .insert({
      user_id: user.id,
      job_id: body.job_id,
      title: `${job.title} at ${job.company}`,
      content,
      status: "ready",
      provider: cred.provider,
      model,
    })
    .select("id")
    .single();

  await supabase.from("task_runs").insert({
    user_id: user.id,
    type: "interview_prep",
    status: "completed",
    linked_job_id: body.job_id,
    input: { job_id: body.job_id, job_title: job.title, company: job.company },
    output: { pack_id: pack?.id },
  });

  await supabase
    .from("provider_credentials")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", cred.id);

  return NextResponse.json({ pack_id: pack?.id, content });
}
