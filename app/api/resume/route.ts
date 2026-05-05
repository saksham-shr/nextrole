import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { RESUME_SYSTEM_PROMPT, buildResumePrompt } from "@/lib/resume/prompt";
import { renderResumeHtml } from "@/lib/resume/template";
import type { ResumeData } from "@/lib/resume/template";
import { requireFeature } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  const guard = await requireFeature("resume_tailor");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

  const body = (await request.json()) as { job_id?: string; evaluation_id?: string };
  const jobId = body.job_id;
  if (!jobId) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const { data: job } = await supabase
    .from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.description) return NextResponse.json({ error: "Job has no description — paste the JD first" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("base_cv").eq("id", userId).single();
  if (!profile?.base_cv) return NextResponse.json({ error: "No CV in your profile — add it in Settings first" }, { status: 400 });

  let evalData: { cv_match: Record<string, unknown> | null; personalization_guidance: Record<string, unknown> | null } | null = null;
  if (body.evaluation_id) {
    const { data } = await supabase.from("evaluations").select("cv_match, personalization_guidance").eq("id", body.evaluation_id).eq("user_id", userId).single();
    evalData = data ?? null;
  } else {
    const { data } = await supabase.from("evaluations").select("cv_match, personalization_guidance").eq("job_id", jobId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single();
    evalData = data ?? null;
  }

  const cvMatch = evalData?.cv_match as { strengths?: string[]; gaps?: string[] } | null;
  const personGuidance = evalData?.personalization_guidance as { angle?: string; tactics?: string[] } | null;

  const route = await resolveAIRoute(userId).catch(() => null);
  if (!route) return NextResponse.json({ error: "AI provider error" }, { status: 500 });

  if (!route.byok) {
    const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: 5 });
    if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
  }

  const { data: taskRun } = await supabase.from("task_runs").insert({
    user_id: userId, type: "pdf", status: "running", linked_job_id: jobId,
    input: { job_id: jobId, provider: route.provider, model: route.model },
  }).select("id").single();

  const userPrompt = buildResumePrompt({
    title: job.title, company: job.company, description: job.description,
    base_cv: profile.base_cv,
    eval_strengths: cvMatch?.strengths, eval_gaps: cvMatch?.gaps,
    personalization_angle: personGuidance?.angle, personalization_tactics: personGuidance?.tactics,
  });

  let rawOutput: string;
  try {
    rawOutput = await callProvider(route.provider, route.apiKey, route.model, RESUME_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    if (taskRun) await supabase.from("task_runs").update({ status: "failed", error: message, updated_at: new Date().toISOString() }).eq("id", taskRun.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let resumeData: ResumeData;
  try {
    resumeData = parseJSON(rawOutput) as ResumeData;
  } catch {
    if (taskRun) await supabase.from("task_runs").update({ status: "failed", error: "AI returned invalid JSON", updated_at: new Date().toISOString() }).eq("id", taskRun.id);
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  const html = renderResumeHtml(resumeData);
  const coverage = Math.max(0, Math.min(100, resumeData.coverage ?? 0));

  const { data: resume } = await supabase.from("resumes").insert({
    user_id: userId, job_id: jobId,
    title: `${job.title} at ${job.company}`,
    content: JSON.stringify(resumeData), html, coverage, status: "draft", version: 1,
  }).select("id").single();

  if (taskRun) {
    await supabase.from("task_runs").update({
      status: "completed", output: { resume_id: resume?.id, coverage },
      updated_at: new Date().toISOString(),
    }).eq("id", taskRun.id);
  }

  supabase.from("usage_log").insert({ user_id: userId, task_type: "resume_tailor", model: route.model, credits_used: route.byok ? 0 : 5, byok: route.byok }).then(() => {});

  return NextResponse.json({ resume_id: resume?.id, coverage });
}
