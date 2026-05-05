import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/evaluate/prompt";
import { requireFeature } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";
import type { SupabaseClient } from "@supabase/supabase-js";

export const maxDuration = 300;

const CONCURRENCY = 5;
const CREDITS_PER_JOB = 5;

interface EvalBlocks {
  role_fit: { score: number; summary: string; details: string; signals: string[] };
  compensation_analysis: { score: number; summary: string; details: string; market_position: string };
  cv_match: { score: number; summary: string; coverage: string; gaps: string[]; strengths: string[] };
  personalization_guidance: { summary: string; tactics: string[]; angle: string };
  interview_signals: { likely_topics: string[]; red_flags: string[]; preparation_notes: string };
  legitimacy_check: { score: number; verdict: string; notes: string };
  decision: { score: number; decision: string; rationale: string; priority: string };
}

interface EvalResult {
  blocks: EvalBlocks;
  score: number;
  decision: string;
}

export interface BatchJobResult {
  job_id: string;
  title: string;
  company: string;
  status: "completed" | "failed" | "skipped";
  score?: number;
  decision?: string;
  evaluation_id?: string;
  error?: string;
}

export interface BatchResponse {
  task_run_id?: string;
  results: BatchJobResult[];
  completed: number;
  failed: number;
  skipped: number;
  error?: string;
}

function clampScore(score: unknown): number {
  const n = typeof score === "number" ? score : parseFloat(String(score));
  return Math.max(1.0, Math.min(5.0, isNaN(n) ? 1.0 : n));
}

async function evaluateJob(
  job: { id: string; title: string; company: string; description: string | null; archetype: string | null },
  deps: { supabase: SupabaseClient; userId: string; baseCv: string; provider: string; apiKey: string; model: string },
): Promise<BatchJobResult> {
  const { supabase, userId, baseCv, provider, apiKey, model } = deps;

  if (!job.description) {
    return { job_id: job.id, title: job.title, company: job.company, status: "skipped", error: "No job description" };
  }

  const userPrompt = buildUserPrompt({ title: job.title, company: job.company, description: job.description, base_cv: baseCv, archetype: job.archetype });

  let rawOutput: string;
  try {
    rawOutput = await callProvider(provider, apiKey, model, SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    return { job_id: job.id, title: job.title, company: job.company, status: "failed", error: err instanceof Error ? err.message : "AI call failed" };
  }

  let result: EvalResult;
  try {
    result = parseJSON(rawOutput) as EvalResult;
  } catch {
    return { job_id: job.id, title: job.title, company: job.company, status: "failed", error: "AI returned invalid JSON" };
  }

  const score = clampScore(result.score);
  const decision = (["apply", "watch", "skip"].includes(result.decision) ? result.decision : "watch") as "apply" | "watch" | "skip";

  const { data: evaluation } = await supabase.from("evaluations").insert({
    user_id: userId, job_id: job.id, score, decision,
    role_fit: result.blocks.role_fit as Record<string, unknown>,
    compensation_analysis: result.blocks.compensation_analysis as Record<string, unknown>,
    cv_match: result.blocks.cv_match as Record<string, unknown>,
    personalization_guidance: result.blocks.personalization_guidance as Record<string, unknown>,
    interview_signals: result.blocks.interview_signals as Record<string, unknown>,
    legitimacy_check: result.blocks.legitimacy_check as Record<string, unknown>,
    raw_output: rawOutput, provider, model,
  }).select("id").single();

  await supabase.from("jobs").update({ status: "evaluated", updated_at: new Date().toISOString() }).eq("id", job.id).eq("user_id", userId);

  if (evaluation?.id) {
    await supabase.from("reports").insert({
      user_id: userId, job_id: job.id, evaluation_id: evaluation.id,
      title: `${job.title} at ${job.company}`, type: "evaluation",
      content: { score, decision, job_title: job.title, job_company: job.company, provider, model, blocks: result.blocks } as unknown as Record<string, unknown>,
    });
  }

  return { job_id: job.id, title: job.title, company: job.company, status: "completed", score, decision, evaluation_id: evaluation?.id };
}

export async function POST(request: NextRequest) {
  const guard = await requireFeature("batch");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

  const body = (await request.json()) as { job_ids?: string[] };
  const jobIds = body.job_ids ?? [];

  if (jobIds.length < 1 || jobIds.length > 20) {
    return NextResponse.json({ error: "Select 1–20 jobs to batch evaluate" }, { status: 400 });
  }

  const { data: jobs } = await supabase
    .from("jobs").select("id, title, company, description, archetype").in("id", jobIds).eq("user_id", userId);

  if (!jobs || jobs.length === 0) return NextResponse.json({ error: "No jobs found" }, { status: 404 });

  const { data: profile } = await supabase.from("profiles").select("base_cv").eq("id", userId).single();
  if (!profile?.base_cv) return NextResponse.json({ error: "No CV in your profile — add it in Settings first" }, { status: 400 });

  const route = await resolveAIRoute(userId).catch(() => null);
  if (!route) return NextResponse.json({ error: "AI provider error" }, { status: 500 });

  // Deduct credits for all jobs upfront
  if (!route.byok) {
    const totalCredits = jobs.length * CREDITS_PER_JOB;
    const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: totalCredits });
    if (!ok) return NextResponse.json({ error: "NO_CREDITS", required: totalCredits }, { status: 402 });
  }

  const { data: batchRun } = await supabase.from("task_runs").insert({
    user_id: userId, type: "batch", status: "running",
    input: { job_ids: jobIds, count: jobs.length, concurrency: CONCURRENCY },
    progress_message: `0 / ${jobs.length} complete`,
  }).select("id").single();

  const deps = { supabase, userId, baseCv: profile.base_cv, provider: route.provider, apiKey: route.apiKey, model: route.model };

  const allResults: BatchJobResult[] = [];
  let completed = 0, failed = 0, skipped = 0;

  for (let i = 0; i < jobs.length; i += CONCURRENCY) {
    const chunk = jobs.slice(i, i + CONCURRENCY);
    const settled = await Promise.allSettled(chunk.map((job) => evaluateJob(job, deps)));

    for (const outcome of settled) {
      const result: BatchJobResult = outcome.status === "fulfilled"
        ? outcome.value
        : { job_id: "unknown", title: "Unknown", company: "Unknown", status: "failed", error: outcome.reason instanceof Error ? outcome.reason.message : "Unexpected error" };

      allResults.push(result);
      if (result.status === "completed") completed++;
      else if (result.status === "skipped") skipped++;
      else failed++;
    }

    if (batchRun) {
      await supabase.from("task_runs").update({ progress_message: `${completed + failed + skipped} / ${jobs.length} complete`, updated_at: new Date().toISOString() }).eq("id", batchRun.id);
    }
  }

  if (batchRun) {
    await supabase.from("task_runs").update({
      status: failed === jobs.length ? "failed" : "completed",
      output: { completed, failed, skipped, total: jobs.length },
      progress_message: `${completed} completed, ${failed} failed, ${skipped} skipped`,
      updated_at: new Date().toISOString(),
    }).eq("id", batchRun.id);
  }

  supabase.from("usage_log").insert({ user_id: userId, task_type: "batch", model: route.model, credits_used: route.byok ? 0 : completed * CREDITS_PER_JOB, byok: route.byok }).then(() => {});

  return NextResponse.json({ task_run_id: batchRun?.id, results: allResults, completed, failed, skipped } satisfies BatchResponse);
}
