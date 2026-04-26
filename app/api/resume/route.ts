import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { RESUME_SYSTEM_PROMPT, buildResumePrompt } from "@/lib/resume/prompt";
import { renderResumeHtml } from "@/lib/resume/template";
import type { ResumeData } from "@/lib/resume/template";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    job_id?: string;
    evaluation_id?: string;
  };
  const jobId = body.job_id;
  if (!jobId) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  // Load job
  const { data: job } = await supabase
    .from("jobs")
    .select("*")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.description)
    return NextResponse.json(
      { error: "Job has no description — paste the JD first" },
      { status: 400 },
    );

  // Load profile (CV)
  const { data: profile } = await supabase
    .from("profiles")
    .select("base_cv")
    .eq("id", user.id)
    .single();
  if (!profile?.base_cv)
    return NextResponse.json(
      { error: "No CV in your profile — add it in Settings first" },
      { status: 400 },
    );

  // Load latest evaluation (use specified or most recent)
  let evalData: {
    cv_match: Record<string, unknown> | null;
    personalization_guidance: Record<string, unknown> | null;
  } | null = null;

  if (body.evaluation_id) {
    const { data } = await supabase
      .from("evaluations")
      .select("cv_match, personalization_guidance")
      .eq("id", body.evaluation_id)
      .eq("user_id", user.id)
      .single();
    evalData = data ?? null;
  } else {
    const { data } = await supabase
      .from("evaluations")
      .select("cv_match, personalization_guidance")
      .eq("job_id", jobId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    evalData = data ?? null;
  }

  // Extract eval intelligence if available
  const cvMatch = evalData?.cv_match as {
    strengths?: string[];
    gaps?: string[];
  } | null;
  const personGuidance = evalData?.personalization_guidance as {
    angle?: string;
    tactics?: string[];
  } | null;

  // Load active provider
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
    return NextResponse.json(
      { error: "No AI provider configured — add a key in Providers" },
      { status: 400 },
    );

  const apiKey = decrypt(cred.encrypted_key);
  const model = cred.model ?? (cred.provider === "anthropic" ? "claude-opus-4-7" : cred.provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o");

  // Create task_run
  const { data: taskRun } = await supabase
    .from("task_runs")
    .insert({
      user_id: user.id,
      type: "pdf",
      status: "running",
      linked_job_id: jobId,
      input: { job_id: jobId, provider: cred.provider, model },
    })
    .select("id")
    .single();

  const userPrompt = buildResumePrompt({
    title: job.title,
    company: job.company,
    description: job.description,
    base_cv: profile.base_cv,
    eval_strengths: cvMatch?.strengths,
    eval_gaps: cvMatch?.gaps,
    personalization_angle: personGuidance?.angle,
    personalization_tactics: personGuidance?.tactics,
  });

  let rawOutput: string;
  try {
    rawOutput =
      await callProvider(cred.provider, apiKey, model, RESUME_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    if (taskRun) {
      await supabase
        .from("task_runs")
        .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
        .eq("id", taskRun.id);
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let resumeData: ResumeData;
  try {
    resumeData = parseJSON(rawOutput) as ResumeData;
  } catch {
    if (taskRun) {
      await supabase
        .from("task_runs")
        .update({
          status: "failed",
          error: "AI returned invalid JSON",
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskRun.id);
    }
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  const html = renderResumeHtml(resumeData);
  const coverage = Math.max(0, Math.min(100, resumeData.coverage ?? 0));

  // Persist resume
  const { data: resume } = await supabase
    .from("resumes")
    .insert({
      user_id: user.id,
      job_id: jobId,
      title: `${job.title} at ${job.company}`,
      content: JSON.stringify(resumeData),
      html,
      coverage,
      status: "draft",
      version: 1,
    })
    .select("id")
    .single();

  if (taskRun) {
    await supabase
      .from("task_runs")
      .update({
        status: "completed",
        output: { resume_id: resume?.id, coverage },
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskRun.id);
  }

  await supabase
    .from("provider_credentials")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", cred.id);

  return NextResponse.json({ resume_id: resume?.id, coverage });
}
