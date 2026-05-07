import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/evaluate/prompt";
import { callProvider, parseJSON } from "@/lib/ai/providers";
import { requireFeature } from "@/lib/ai/guard";
import { resolveRoute } from "@/lib/ai/router";
import { CREDIT_COSTS } from "@/lib/ai/gates";

export const maxDuration = 60;

// Token cap for evaluation output
const EVAL_MAX_TOKENS = 3000;

interface EvalBlocks {
  role_fit: { score: number; summary: string; details: string; signals: string[] };
  compensation_analysis: { score: number; summary: string; details: string; market_position: string };
  cv_match: { score: number; summary: string; coverage: string; gaps: string[]; strengths: string[] };
  personalization_guidance: { summary: string; tactics: string[]; angle: string };
  interview_signals: { likely_topics: string[]; red_flags: string[]; preparation_notes: string };
  legitimacy_check: { score: number; verdict: string; notes: string };
  level_strategy: { score: number; summary: string; seniority_fit: string; progression_value: string; notes: string };
  decision: { score: number; decision: string; rationale: string; priority: string };
}

interface EvalResult {
  blocks: EvalBlocks;
  score: number;
  decision: string;
  archetype?: string;
}

function clampScore(score: unknown): number {
  const n = typeof score === "number" ? score : parseFloat(String(score));
  return Math.max(1.0, Math.min(5.0, isNaN(n) ? 1.0 : n));
}

export async function POST(request: NextRequest) {
  // Feature key "evaluate" maps to free daily limit: 5/day; starter/pro: credit-based
  const guard = await requireFeature("evaluate");
  if (guard instanceof NextResponse) return guard;
  const { userId, tier } = guard;

  const supabase = await createClient();

  const body = await request.json() as {
    job_id?: string;
    mode?: "api" | "manual" | "lite" | "full";
    raw_output?: string;
  };
  const { job_id: jobId, mode = "api" } = body;

  if (!jobId) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

  // ── Manual import mode ─────────────────────────────────────────────────────
  if (mode === "manual") {
    const rawOutput = body.raw_output?.trim();
    if (!rawOutput)
      return NextResponse.json({ error: "Paste the AI response before importing" }, { status: 400 });

    let result: EvalResult;
    try { result = parseJSON(rawOutput) as EvalResult; }
    catch { return NextResponse.json({ error: "Could not parse response as JSON" }, { status: 400 }); }

    const score = clampScore(result.score);
    const decision = (["apply", "watch", "skip"].includes(result.decision) ? result.decision : "watch") as "apply" | "watch" | "skip";

    const { data: evaluation } = await supabase.from("evaluations").insert({
      user_id: userId, job_id: jobId, score, decision,
      role_fit: result.blocks.role_fit as Record<string, unknown>,
      compensation_analysis: result.blocks.compensation_analysis as Record<string, unknown>,
      cv_match: result.blocks.cv_match as Record<string, unknown>,
      personalization_guidance: result.blocks.personalization_guidance as Record<string, unknown>,
      interview_signals: result.blocks.interview_signals as Record<string, unknown>,
      legitimacy_check: result.blocks.legitimacy_check as Record<string, unknown>,
      level_strategy: result.blocks.level_strategy as Record<string, unknown>,
      raw_output: rawOutput, provider: "manual", model: "manual",
    }).select("id").single();

    await supabase.from("jobs").update({ status: "evaluated", updated_at: new Date().toISOString() })
      .eq("id", jobId).eq("user_id", userId);

    return NextResponse.json({ evaluation_id: evaluation?.id, score, decision, blocks: result.blocks });
  }

  // ── Validation ──────────────────────────────────────────────────────────────
  if (!job.description)
    return NextResponse.json({ error: "Job has no description — paste the JD before evaluating" }, { status: 400 });
  if (!profile?.base_cv)
    return NextResponse.json({ error: "No CV in your profile — add it in Settings first" }, { status: 400 });

  // ── Route selection ────────────────────────────────────────────────────────
  // Two-pass: "lite" uses Flash Lite (free screen, no credit deduct for free tier check)
  // "full" or default "api" uses the standard arbitrated model and deducts credits
  const isLitePass = mode === "lite";

  let route: { provider: string; apiKey: string; model: string; fallbackModels?: string[] };
  if (isLitePass) {
    try {
      route = resolveRoute("evaluate"); // lite pass reuses same route — free fallbacks handle rate limits
    } catch (err) {
      return NextResponse.json({ error: "Lite evaluation not available" }, { status: 503 });
    }
  } else {
    try {
      route = resolveRoute("evaluate");
    } catch (err) {
      return NextResponse.json({ error: (err instanceof Error ? err.message : "AI route error") }, { status: 503 });
    }
  }

  // Deduct credits for paid tiers (lite pass is free — it's just a screen)
  if (!isLitePass && tier !== "free") {
    const { data: ok } = await supabase.rpc("deduct_credit", {
      p_user_id: userId,
      p_amount:  CREDIT_COSTS.evaluate,
    });
    if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
  }

  // Increment free-tier daily usage counter
  if (tier === "free" && !isLitePass) {
    await supabase.rpc("increment_daily_usage", { p_field: "evaluations", p_user: userId });
  }

  const { data: taskRun } = await supabase.from("task_runs").insert({
    user_id: userId, type: "evaluate", status: "running", linked_job_id: jobId,
    input: { job_id: jobId, provider: route.provider, model: route.model, mode },
  }).select("id").single();

  const systemPrompt = buildSystemPrompt({
    applyThreshold: profile.eval_score_apply ?? 3.5,
    watchThreshold: profile.eval_score_watch ?? 2.5,
    customFocus: profile.custom_eval_focus,
    language: profile.preferred_language,
    archetypes: profile.custom_archetypes,
  });

  const userPrompt = buildUserPrompt({
    title: job.title, company: job.company, description: job.description,
    base_cv: profile.base_cv, archetype: job.archetype, seniority: profile.seniority,
    target_roles: profile.target_roles as string[] | null,
    current_comp: profile.current_comp, comp_min: profile.comp_min, comp_max: profile.comp_max,
    work_mode: profile.work_mode, target_locations: profile.target_locations as string[] | null,
  });

  let rawOutput: string;
  try {
    rawOutput = await callProvider({
      provider: route.provider as "anthropic" | "openai" | "gemini" | "sarvam",
      apiKey: route.apiKey, model: route.model,
      system: systemPrompt, user: userPrompt,
      maxTokens: EVAL_MAX_TOKENS,
      cache: route.provider === "anthropic",
      json: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI call failed";
    if (taskRun) await supabase.from("task_runs").update({ status: "failed", error: msg, updated_at: new Date().toISOString() }).eq("id", taskRun.id);
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let result: EvalResult;
  try { result = parseJSON(rawOutput) as EvalResult; }
  catch {
    if (taskRun) await supabase.from("task_runs").update({ status: "failed", error: "AI returned invalid JSON", updated_at: new Date().toISOString() }).eq("id", taskRun.id);
    return NextResponse.json({ error: "AI returned invalid JSON", raw: rawOutput }, { status: 502 });
  }

  const score = clampScore(result.score);
  const decision = (["apply", "watch", "skip"].includes(result.decision) ? result.decision : "watch") as "apply" | "watch" | "skip";
  const archetype = result.archetype ?? null;

  // Lite pass: return result without persisting a full evaluation row
  if (isLitePass) {
    if (taskRun) await supabase.from("task_runs").update({ status: "completed", updated_at: new Date().toISOString() }).eq("id", taskRun.id);
    return NextResponse.json({ score, decision, archetype, blocks: result.blocks, lite: true });
  }

  const { data: evaluation } = await supabase.from("evaluations").insert({
    user_id: userId, job_id: jobId, score, decision,
    role_fit: result.blocks.role_fit as Record<string, unknown>,
    compensation_analysis: result.blocks.compensation_analysis as Record<string, unknown>,
    cv_match: result.blocks.cv_match as Record<string, unknown>,
    personalization_guidance: result.blocks.personalization_guidance as Record<string, unknown>,
    interview_signals: result.blocks.interview_signals as Record<string, unknown>,
    legitimacy_check: result.blocks.legitimacy_check as Record<string, unknown>,
    level_strategy: result.blocks.level_strategy as Record<string, unknown>,
    raw_output: rawOutput, provider: route.provider, model: route.model,
  }).select("id").single();

  supabase.from("usage_log").insert({ user_id: userId, task_type: "evaluate", model: route.model, credits_used: tier === "free" ? 0 : CREDIT_COSTS.evaluate, byok: false }).then(() => {});

  await supabase.from("jobs").update({ status: "evaluated", archetype: archetype ?? job.archetype, updated_at: new Date().toISOString() })
    .eq("id", jobId).eq("user_id", userId);

  if (taskRun) await supabase.from("task_runs").update({ status: "completed", output: { evaluation_id: evaluation?.id, score, decision, archetype }, updated_at: new Date().toISOString() }).eq("id", taskRun.id);

  if (evaluation?.id) {
    await supabase.from("reports").insert({
      user_id: userId, job_id: jobId, evaluation_id: evaluation.id,
      title: `${job.title} at ${job.company}`, type: "evaluation",
      content: { score, decision, archetype, job_title: job.title, job_company: job.company, provider: route.provider, model: route.model, blocks: result.blocks } as unknown as Record<string, unknown>,
    });
  }

  return NextResponse.json({ evaluation_id: evaluation?.id, score, decision, archetype, blocks: result.blocks });
}
