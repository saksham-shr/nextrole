import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/ai/providers";
import { RESUME_SYSTEM_PROMPT, buildResumePrompt } from "@/lib/resume/prompt";
import { renderResumeHtml } from "@/lib/resume/template";
import type { ResumeData } from "@/lib/resume/template";
import { requireFeature } from "@/lib/ai/guard";
import { resolveRoute, type AIRoute } from "@/lib/ai/router";
import { CREDIT_COSTS, PREMIUM_RESUME_LIFETIME_CAP } from "@/lib/ai/gates";

export const maxDuration = 120;

// Token caps by resume type
const STANDARD_MAX_TOKENS = 2500;
const PREMIUM_MAX_TOKENS  = 4000;

export async function POST(request: NextRequest) {
  const body = (await request.json()) as {
    job_id?: string;
    evaluation_id?: string;
    premium?: boolean;
  };

  const isPremium = !!body.premium;
  const featureKey = isPremium ? "resume_premium" : "resume_standard";

  const guard = await requireFeature(featureKey);
  if (guard instanceof NextResponse) return guard;
  const { userId, tier, isAdmin } = guard;

  const supabase = await createClient();

  const jobId = body.job_id;
  if (!jobId) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.description) return NextResponse.json({ error: "Job has no description — paste the JD first" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("base_cv").eq("id", userId).single();
  if (!profile?.base_cv) return NextResponse.json({ error: "No CV in your profile — add it in Settings first" }, { status: 400 });

  // Premium resume lifetime cap check
  if (isPremium && !isAdmin) {
    const { count } = await supabase
      .from("resumes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "final"); // only count completed premium resumes
    if ((count ?? 0) >= PREMIUM_RESUME_LIFETIME_CAP) {
      return NextResponse.json({ error: "PREMIUM_RESUME_CAP_REACHED", cap: PREMIUM_RESUME_LIFETIME_CAP }, { status: 403 });
    }
  }

  // Fetch prior eval data for delta tailoring
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

  // Resolve AI route based on premium vs standard
  let route: AIRoute;
  try {
    route = resolveRoute(isPremium ? "resume_premium" : "resume_standard");
  } catch (err) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : "AI route error") }, { status: 503 });
  }

  // Deduct credits
  if (!isAdmin) {
    const creditAmount = isPremium ? CREDIT_COSTS.resume_premium : CREDIT_COSTS.resume_standard;

    if (tier === "free" && !isPremium) {
      // Free tier: track daily usage instead of credits
      await supabase.rpc("increment_daily_usage", { p_field: "resumes", p_user: userId });
    } else if (tier !== "free") {
      const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: creditAmount });
      if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
    }
  }

  const { data: taskRun } = await supabase.from("task_runs").insert({
    user_id: userId, type: "pdf", status: "running", linked_job_id: jobId,
    input: { job_id: jobId, provider: route.provider, model: route.model, premium: isPremium },
  }).select("id").single();

  const userPrompt = buildResumePrompt({
    title: job.title, company: job.company, description: job.description,
    base_cv: profile.base_cv,
    eval_strengths: cvMatch?.strengths, eval_gaps: cvMatch?.gaps,
    personalization_angle: personGuidance?.angle, personalization_tactics: personGuidance?.tactics,
  });

  let rawOutput: string;
  try {
    rawOutput = await callProvider({
      provider: route.provider,
      apiKey: route.apiKey, model: route.model,
      system: RESUME_SYSTEM_PROMPT, user: userPrompt,
      maxTokens: isPremium ? PREMIUM_MAX_TOKENS : STANDARD_MAX_TOKENS,
      cache: route.provider === "anthropic",
      json: true,
      fallbackModels: route.fallbackModels,
    });
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
    content: JSON.stringify(resumeData), html, coverage,
    status: isPremium ? "final" : "draft",
    version: 1,
  }).select("id").single();

  if (taskRun) {
    await supabase.from("task_runs").update({
      status: "completed", output: { resume_id: resume?.id, coverage },
      updated_at: new Date().toISOString(),
    }).eq("id", taskRun.id);
  }

  supabase.from("usage_log").insert({
    user_id: userId,
    task_type: isPremium ? "resume_premium" : "resume_standard",
    model: route.model,
    credits_used: isPremium ? CREDIT_COSTS.resume_premium : CREDIT_COSTS.resume_standard,
    byok: false,
  }).then(() => {});

  return NextResponse.json({ resume_id: resume?.id, coverage, html });
}
