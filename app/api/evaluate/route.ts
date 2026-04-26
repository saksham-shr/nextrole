import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/evaluate/prompt";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";

export const maxDuration = 60;

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
  archetype?: string;
}

function clampScore(score: unknown): number {
  const n = typeof score === "number" ? score : parseFloat(String(score));
  return Math.max(1.0, Math.min(5.0, isNaN(n) ? 1.0 : n));
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    job_id?: string;
    mode?: "api" | "manual";
    raw_output?: string;
  };
  const { job_id: jobId, mode = "api" } = body;

  if (!jobId) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const { data: job } = await supabase.from("jobs").select("*").eq("id", jobId).eq("user_id", user.id).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single();

  // ── Manual mode ───────────────────────────────────────────────
  if (mode === "manual") {
    const rawOutput = body.raw_output?.trim();
    if (!rawOutput)
      return NextResponse.json({ error: "Paste the AI response before importing" }, { status: 400 });

    let result: EvalResult;
    try { result = parseJSON(rawOutput) as EvalResult; }
    catch { return NextResponse.json({ error: "Could not parse response as JSON — copy the full output" }, { status: 400 }); }

    const score = clampScore(result.score);
    const decision = (["apply", "watch", "skip"].includes(result.decision) ? result.decision : "watch") as "apply" | "watch" | "skip";
    const archetype = result.archetype ?? null;

    const { data: evaluation } = await supabase.from("evaluations").insert({
      user_id: user.id, job_id: jobId, score, decision,
      role_fit: result.blocks.role_fit as Record<string, unknown>,
      compensation_analysis: result.blocks.compensation_analysis as Record<string, unknown>,
      cv_match: result.blocks.cv_match as Record<string, unknown>,
      personalization_guidance: result.blocks.personalization_guidance as Record<string, unknown>,
      interview_signals: result.blocks.interview_signals as Record<string, unknown>,
      legitimacy_check: result.blocks.legitimacy_check as Record<string, unknown>,
      raw_output: rawOutput, provider: "manual", model: "manual",
    }).select("id").single();

    await supabase.from("jobs").update({
      status: "evaluated",
      archetype: archetype ?? job.archetype,
      updated_at: new Date().toISOString(),
    }).eq("id", jobId).eq("user_id", user.id);

    await supabase.from("task_runs").insert({
      user_id: user.id, type: "evaluate", status: "completed", linked_job_id: jobId,
      input: { job_id: jobId, mode: "manual" },
      output: { evaluation_id: evaluation?.id, score, decision },
    });

    if (evaluation?.id) {
      await supabase.from("reports").insert({
        user_id: user.id, job_id: jobId, evaluation_id: evaluation.id,
        title: `${job.title} at ${job.company}`,
        type: "evaluation",
        content: { score, decision, archetype, job_title: job.title, job_company: job.company, provider: "manual", model: "manual", blocks: result.blocks } as unknown as Record<string, unknown>,
      });
    }

    return NextResponse.json({ evaluation_id: evaluation?.id, score, decision, archetype, blocks: result.blocks });
  }

  // ── API mode ──────────────────────────────────────────────────
  if (!job.description)
    return NextResponse.json({ error: "Job has no description — paste the JD before evaluating" }, { status: 400 });

  if (!profile?.base_cv)
    return NextResponse.json({ error: "No CV in your profile — add it in Settings first" }, { status: 400 });

  const { data: creds } = await supabase
    .from("provider_credentials").select("*").eq("user_id", user.id)
    .eq("is_active", true).in("provider", ["anthropic", "openai", "gemini"])
    .order("updated_at", { ascending: false }).limit(1);

  const cred = creds?.[0];
  if (!cred?.encrypted_key)
    return NextResponse.json({ error: "No AI provider configured — add an API key in Providers" }, { status: 400 });

  const apiKey = decrypt(cred.encrypted_key);
  const defaultModel = cred.provider === "anthropic" ? "claude-opus-4-7"
    : cred.provider === "gemini" ? "gemini-2.0-flash"
    : "gpt-4o";
  const model = cred.model ?? defaultModel;

  const { data: taskRun } = await supabase.from("task_runs").insert({
    user_id: user.id, type: "evaluate", status: "running", linked_job_id: jobId,
    input: { job_id: jobId, provider: cred.provider, model },
  }).select("id").single();

  // Build personalised system prompt
  const systemPrompt = buildSystemPrompt({
    applyThreshold: profile.eval_score_apply ?? 3.5,
    watchThreshold: profile.eval_score_watch ?? 2.5,
    customFocus: profile.custom_eval_focus,
    language: profile.preferred_language,
    archetypes: profile.custom_archetypes,
  });

  const userPrompt = buildUserPrompt({
    title: job.title,
    company: job.company,
    description: job.description,
    base_cv: profile.base_cv,
    archetype: job.archetype,
    seniority: profile.seniority,
    target_roles: profile.target_roles as string[] | null,
    current_comp: profile.current_comp,
    comp_min: profile.comp_min,
    comp_max: profile.comp_max,
    work_mode: profile.work_mode,
    target_locations: profile.target_locations as string[] | null,
  });

  let rawOutput: string;
  try {
    rawOutput = await callProvider(cred.provider, apiKey, model, systemPrompt, userPrompt);
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

  const { data: evaluation } = await supabase.from("evaluations").insert({
    user_id: user.id, job_id: jobId, score, decision,
    role_fit: result.blocks.role_fit as Record<string, unknown>,
    compensation_analysis: result.blocks.compensation_analysis as Record<string, unknown>,
    cv_match: result.blocks.cv_match as Record<string, unknown>,
    personalization_guidance: result.blocks.personalization_guidance as Record<string, unknown>,
    interview_signals: result.blocks.interview_signals as Record<string, unknown>,
    legitimacy_check: result.blocks.legitimacy_check as Record<string, unknown>,
    raw_output: rawOutput, provider: cred.provider, model,
  }).select("id").single();

  // Save archetype back to the job
  await supabase.from("jobs").update({
    status: "evaluated",
    archetype: archetype ?? job.archetype,
    updated_at: new Date().toISOString(),
  }).eq("id", jobId).eq("user_id", user.id);

  if (taskRun) await supabase.from("task_runs").update({
    status: "completed",
    output: { evaluation_id: evaluation?.id, score, decision, archetype },
    updated_at: new Date().toISOString(),
  }).eq("id", taskRun.id);

  if (evaluation?.id) {
    await supabase.from("reports").insert({
      user_id: user.id, job_id: jobId, evaluation_id: evaluation.id,
      title: `${job.title} at ${job.company}`,
      type: "evaluation",
      content: { score, decision, archetype, job_title: job.title, job_company: job.company, provider: cred.provider, model, blocks: result.blocks } as unknown as Record<string, unknown>,
    });
  }

  await supabase.from("provider_credentials").update({ last_used_at: new Date().toISOString() }).eq("id", cred.id);

  return NextResponse.json({ evaluation_id: evaluation?.id, score, decision, archetype, blocks: result.blocks });
}
