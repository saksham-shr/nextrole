import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/evaluate/prompt";

export const maxDuration = 300;

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

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { job_ids?: string[] };
  const jobIds = body.job_ids ?? [];

  if (jobIds.length < 1 || jobIds.length > 20) {
    return NextResponse.json({ error: "Select 1–20 jobs to batch evaluate" }, { status: 400 });
  }

  // Load jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, company, description, archetype")
    .in("id", jobIds)
    .eq("user_id", user.id);

  if (!jobs || jobs.length === 0) {
    return NextResponse.json({ error: "No jobs found" }, { status: 404 });
  }

  // Load profile (CV)
  const { data: profile } = await supabase
    .from("profiles")
    .select("base_cv")
    .eq("id", user.id)
    .single();

  if (!profile?.base_cv) {
    return NextResponse.json(
      { error: "No CV in your profile — add it in Settings first" },
      { status: 400 },
    );
  }

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
  if (!cred?.encrypted_key) {
    return NextResponse.json(
      { error: "No AI provider configured — add a key in Providers" },
      { status: 400 },
    );
  }

  const apiKey = decrypt(cred.encrypted_key);
  const model = cred.model ?? (cred.provider === "anthropic" ? "claude-opus-4-7" : cred.provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o");

  // Create batch task_run
  const { data: batchRun } = await supabase
    .from("task_runs")
    .insert({
      user_id: user.id,
      type: "batch",
      status: "running",
      input: { job_ids: jobIds, count: jobs.length },
      progress_message: `0 / ${jobs.length} complete`,
    })
    .select("id")
    .single();

  const results: BatchJobResult[] = [];
  let completed = 0;
  let failed = 0;
  let skipped = 0;

  for (const job of jobs) {
    // Skip jobs without descriptions
    if (!job.description) {
      results.push({
        job_id: job.id,
        title: job.title,
        company: job.company,
        status: "skipped",
        error: "No job description",
      });
      skipped++;
      continue;
    }

    const userPrompt = buildUserPrompt({
      title: job.title,
      company: job.company,
      description: job.description,
      base_cv: profile.base_cv,
      archetype: job.archetype,
    });

    let rawOutput: string;
    try {
      rawOutput =
        await callProvider(cred.provider, apiKey, model, SYSTEM_PROMPT, userPrompt);
    } catch (err) {
      const message = err instanceof Error ? err.message : "AI call failed";
      results.push({
        job_id: job.id,
        title: job.title,
        company: job.company,
        status: "failed",
        error: message,
      });
      failed++;

      if (batchRun) {
        await supabase
          .from("task_runs")
          .update({
            progress_message: `${completed + failed + skipped} / ${jobs.length} complete`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", batchRun.id);
      }
      continue;
    }

    let result: EvalResult;
    try {
      result = parseJSON(rawOutput) as EvalResult;
    } catch {
      results.push({
        job_id: job.id,
        title: job.title,
        company: job.company,
        status: "failed",
        error: "AI returned invalid JSON",
      });
      failed++;
      continue;
    }

    const score = clampScore(result.score);
    const decision = (
      ["apply", "watch", "skip"].includes(result.decision) ? result.decision : "watch"
    ) as "apply" | "watch" | "skip";

    // Persist evaluation
    const { data: evaluation } = await supabase
      .from("evaluations")
      .insert({
        user_id: user.id,
        job_id: job.id,
        score,
        decision,
        role_fit: result.blocks.role_fit as Record<string, unknown>,
        compensation_analysis: result.blocks.compensation_analysis as Record<string, unknown>,
        cv_match: result.blocks.cv_match as Record<string, unknown>,
        personalization_guidance: result.blocks.personalization_guidance as Record<string, unknown>,
        interview_signals: result.blocks.interview_signals as Record<string, unknown>,
        legitimacy_check: result.blocks.legitimacy_check as Record<string, unknown>,
        raw_output: rawOutput,
        provider: cred.provider,
        model,
      })
      .select("id")
      .single();

    // Update job status
    await supabase
      .from("jobs")
      .update({ status: "evaluated", updated_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("user_id", user.id);

    // Persist report
    if (evaluation?.id) {
      await supabase.from("reports").insert({
        user_id: user.id,
        job_id: job.id,
        evaluation_id: evaluation.id,
        title: `${job.title} at ${job.company}`,
        type: "evaluation",
        content: {
          score,
          decision,
          job_title: job.title,
          job_company: job.company,
          provider: cred.provider,
          model,
          blocks: result.blocks,
        } as unknown as Record<string, unknown>,
      });
    }

    results.push({
      job_id: job.id,
      title: job.title,
      company: job.company,
      status: "completed",
      score,
      decision,
      evaluation_id: evaluation?.id,
    });
    completed++;

    // Update progress
    if (batchRun) {
      await supabase
        .from("task_runs")
        .update({
          progress_message: `${completed + failed + skipped} / ${jobs.length} complete`,
          updated_at: new Date().toISOString(),
        })
        .eq("id", batchRun.id);
    }
  }

  // Finalize batch task_run
  if (batchRun) {
    await supabase
      .from("task_runs")
      .update({
        status: failed === jobs.length ? "failed" : "completed",
        output: { completed, failed, skipped, total: jobs.length },
        progress_message: `${completed} completed, ${failed} failed, ${skipped} skipped`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", batchRun.id);
  }

  await supabase
    .from("provider_credentials")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", cred.id);

  return NextResponse.json({
    task_run_id: batchRun?.id,
    results,
    completed,
    failed,
    skipped,
  } satisfies BatchResponse);
}
