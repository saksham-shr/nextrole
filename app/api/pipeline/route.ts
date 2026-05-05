import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/evaluate/prompt";
import { DEEP_SYSTEM_PROMPT, buildDeepPrompt } from "@/lib/deep/prompt";
import { requireFeature, requireJobSlot } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";

export const maxDuration = 120;

type PipelineStep = "evaluate" | "status_update" | "deep_research";

type EvalResult = { score?: number; decision?: string; [key: string]: unknown };

type PipelineJobInput = {
  title: string;
  company: string;
  url?: string | null;
  description?: string | null;
  source?: string | null;
};

export async function POST(request: NextRequest) {
  const guard = await requireFeature("auto_evaluate");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

  const body = (await request.json()) as {
    job_id?: string;
    job?: PipelineJobInput;
    steps?: PipelineStep[];
    mode?: "api" | "prompt_only";
  };
  const { steps = ["evaluate", "status_update"], mode = "api" } = body;
  let jobId = body.job_id;

  if (!jobId && body.job) {
    const slot = await requireJobSlot();
    if (slot instanceof NextResponse) return slot;

    const title = (body.job.title ?? "").trim();
    const company = (body.job.company ?? "").trim();

    if (!title || !company) {
      return NextResponse.json({ error: "job.title and job.company are required" }, { status: 400 });
    }

    const { data: createdJob, error: createError } = await supabase
      .from("jobs")
      .insert({
        user_id: userId,
        title,
        company,
        url: body.job.url?.trim() || null,
        description: body.job.description?.trim() || null,
        source: body.job.source?.trim() || "browser_extension",
        status: "pending",
      })
      .select("*")
      .single();

    if (createError || !createdJob) {
      return NextResponse.json({ error: createError?.message ?? "Could not create job" }, { status: 500 });
    }

    jobId = createdJob.id;
  }

  if (!jobId) return NextResponse.json({ error: "job_id or job payload required" }, { status: 400 });

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.description) return NextResponse.json({ error: "Job has no description; add one before running the pipeline" }, { status: 400 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

  const results: Record<string, unknown> = { job_id: jobId, steps };

  if (mode === "prompt_only") {
    if (steps.includes("evaluate")) {
      const userPrompt = buildUserPrompt({ title: job.title, company: job.company, description: job.description, base_cv: profile?.base_cv ?? "" });
      results.evaluate = { prompt: `SYSTEM\n${"-".repeat(60)}\n${SYSTEM_PROMPT}\n\nUSER\n${"-".repeat(60)}\n${userPrompt}` };
    }
    if (steps.includes("deep_research")) {
      const deepPrompt = buildDeepPrompt({ company: job.company, title: job.title, description: job.description });
      results.deep_research = { prompt: `SYSTEM\n${"-".repeat(60)}\n${DEEP_SYSTEM_PROMPT}\n\nUSER\n${"-".repeat(60)}\n${deepPrompt}` };
    }
    return NextResponse.json(results);
  }

  const route = await resolveAIRoute(userId).catch(() => null);
  if (!route) return NextResponse.json({ error: "AI provider error" }, { status: 500 });

  if (!route.byok) {
    const evalCredits = steps.includes("evaluate") ? 5 : 0;
    const deepCredits = steps.includes("deep_research") ? 15 : 0;
    const total = evalCredits + deepCredits;
    if (total > 0) {
      const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: total });
      if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
    }
  }

  if (steps.includes("evaluate")) {
    const userPrompt = buildUserPrompt({ title: job.title, company: job.company, description: job.description, base_cv: profile?.base_cv ?? "" });
    try {
      const raw = await callProvider(route.provider, route.apiKey, route.model, SYSTEM_PROMPT, userPrompt);
      const evaluation = parseJSON(raw) as EvalResult;
      const score = typeof evaluation?.score === "number" ? evaluation.score : null;
      const decision = typeof evaluation?.decision === "string" ? evaluation.decision : null;

      await supabase.from("evaluations").insert({
        user_id: userId,
        job_id: jobId,
        score,
        decision: decision as "apply" | "skip" | "watch" | null,
        role_fit: (evaluation?.role_fit as Record<string, unknown>) ?? null,
        compensation_analysis: (evaluation?.compensation_analysis as Record<string, unknown>) ?? null,
        cv_match: (evaluation?.cv_match as Record<string, unknown>) ?? null,
        personalization_guidance: (evaluation?.personalization_guidance as Record<string, unknown>) ?? null,
        interview_signals: (evaluation?.interview_signals as Record<string, unknown>) ?? null,
        legitimacy_check: (evaluation?.legitimacy_check as Record<string, unknown>) ?? null,
        raw_output: raw,
        provider: route.provider,
        model: route.model,
      });

      results.evaluate = { score, decision, evaluation };

      if (steps.includes("status_update") && decision) {
        const newStatus = decision === "skip" ? "archived" : "evaluated";
        await supabase.from("jobs").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", jobId).eq("user_id", userId);
        results.status_update = { previous_status: job.status, new_status: newStatus, reason: decision };
      }

      supabase.from("usage_log").insert({ user_id: userId, task_type: "evaluate", model: route.model, credits_used: route.byok ? 0 : 5, byok: route.byok }).then(() => {});
    } catch (err) {
      results.evaluate = { error: err instanceof Error ? err.message : "AI call failed" };
    }
  } else if (steps.includes("status_update")) {
    const { data: latestEval } = await supabase.from("evaluations").select("decision").eq("job_id", jobId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single();
    if (latestEval?.decision) {
      const newStatus = latestEval.decision === "skip" ? "archived" : "evaluated";
      await supabase.from("jobs").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", jobId).eq("user_id", userId);
      results.status_update = { previous_status: job.status, new_status: newStatus };
    } else {
      results.status_update = { skipped: true, reason: "No evaluation found for this job" };
    }
  }

  if (steps.includes("deep_research")) {
    const deepPrompt = buildDeepPrompt({ company: job.company, title: job.title, description: job.description });
    try {
      const raw = await callProvider(route.provider, route.apiKey, route.model, DEEP_SYSTEM_PROMPT, deepPrompt);
      results.deep_research = { dossier: parseJSON(raw) };
      supabase.from("usage_log").insert({ user_id: userId, task_type: "deep_research", model: route.model, credits_used: route.byok ? 0 : 15, byok: route.byok }).then(() => {});
    } catch (err) {
      results.deep_research = { error: err instanceof Error ? err.message : "AI call failed" };
    }
  }

  await supabase.from("task_runs").insert({
    user_id: userId,
    type: "evaluate",
    status: "completed",
    linked_job_id: jobId,
    input: { job_id: jobId, steps, mode, provider: route.provider },
    output: { steps_run: steps, company: job.company },
  });

  return NextResponse.json(results);
}
