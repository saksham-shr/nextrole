/**
 * Auto-pipeline orchestration
 * POST /api/pipeline
 *
 * Chains: evaluate → update job status → (optionally) trigger resume tailoring
 * in a single HTTP call. Returns a combined result object.
 *
 * Body:
 *   job_id        string   — required
 *   steps         string[] — which steps to run (default: ["evaluate", "status_update"])
 *                            valid values: "evaluate" | "status_update" | "deep_research"
 *   mode          "api" | "prompt_only"  — applies to all AI steps
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { SYSTEM_PROMPT, buildUserPrompt } from "@/lib/evaluate/prompt";
import { DEEP_SYSTEM_PROMPT, buildDeepPrompt } from "@/lib/deep/prompt";

export const maxDuration = 120;

type PipelineStep = "evaluate" | "status_update" | "deep_research";

type EvalResult = {
  score?: number;
  decision?: string;
  [key: string]: unknown;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    job_id: string;
    steps?: PipelineStep[];
    mode?: "api" | "prompt_only";
  };

  const { job_id, steps = ["evaluate", "status_update"], mode = "api" } = body;

  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  // Load job
  const { data: job } = await supabase
    .from("jobs").select("*").eq("id", job_id).eq("user_id", user.id).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  if (!job.description) {
    return NextResponse.json(
      { error: "Job has no description — add one before running the pipeline" },
      { status: 400 },
    );
  }

  // Load profile (used by evaluate)
  const { data: profile } = await supabase
    .from("profiles").select("*").eq("id", user.id).single();

  // Resolve AI provider
  const { data: providers } = await supabase
    .from("provider_credentials").select("*").eq("user_id", user.id)
    .eq("is_active", true).in("provider", ["anthropic", "openai", "gemini"])
    .order("updated_at", { ascending: false }).limit(1);

  const cred = providers?.[0];

  const results: Record<string, unknown> = { job_id, steps };

  // ── Step: evaluate ────────────────────────────────────────────
  if (steps.includes("evaluate")) {
    const userPrompt = buildUserPrompt({
      title: job.title,
      company: job.company,
      description: job.description,
      base_cv: profile?.base_cv ?? "",
    });

    if (mode === "prompt_only") {
      results.evaluate = {
        prompt: `SYSTEM\n${"─".repeat(60)}\n${SYSTEM_PROMPT}\n\nUSER\n${"─".repeat(60)}\n${userPrompt}`,
      };
    } else {
      if (!cred?.encrypted_key) {
        return NextResponse.json(
          { error: "No AI provider configured — needed for evaluate step" },
          { status: 400 },
        );
      }
      const apiKey = decrypt(cred.encrypted_key);
      const model =
        cred.model ??
        (cred.provider === "anthropic"
          ? "claude-opus-4-7"
          : cred.provider === "gemini"
          ? "gemini-2.0-flash"
          : "gpt-4o");

      try {
        const raw = await callProvider(cred.provider, apiKey, model, SYSTEM_PROMPT, userPrompt);

        const evaluation = parseJSON(raw) as EvalResult;
        const score = typeof evaluation?.score === "number" ? evaluation.score : null;
        const decision = typeof evaluation?.decision === "string" ? evaluation.decision : null;

        // Persist evaluation
        await supabase.from("evaluations").insert({
          user_id: user.id,
          job_id,
          score,
          decision: decision as "apply" | "skip" | "watch" | null,
          role_fit: (evaluation?.role_fit as Record<string, unknown>) ?? null,
          compensation_analysis: (evaluation?.compensation_analysis as Record<string, unknown>) ?? null,
          cv_match: (evaluation?.cv_match as Record<string, unknown>) ?? null,
          personalization_guidance: (evaluation?.personalization_guidance as Record<string, unknown>) ?? null,
          interview_signals: (evaluation?.interview_signals as Record<string, unknown>) ?? null,
          legitimacy_check: (evaluation?.legitimacy_check as Record<string, unknown>) ?? null,
          raw_output: raw,
          provider: cred.provider,
          model,
        });

        results.evaluate = { score, decision, evaluation };

        // Auto status_update is bundled into evaluate when both are requested
        if (steps.includes("status_update") && decision) {
          const newStatus = decision === "apply" ? "evaluated"
            : decision === "skip" ? "archived"
            : "evaluated"; // "watch" stays evaluated

          await supabase.from("jobs").update({ status: newStatus, updated_at: new Date().toISOString() })
            .eq("id", job_id).eq("user_id", user.id);

          results.status_update = { previous_status: job.status, new_status: newStatus, reason: decision };
        }

        await supabase.from("provider_credentials")
          .update({ last_used_at: new Date().toISOString() }).eq("id", cred.id);

      } catch (err) {
        results.evaluate = { error: err instanceof Error ? err.message : "AI call failed" };
      }
    }
  } else if (steps.includes("status_update")) {
    // Standalone status update — use latest evaluation if present
    const { data: latestEval } = await supabase
      .from("evaluations").select("decision").eq("job_id", job_id)
      .eq("user_id", user.id).order("created_at", { ascending: false }).limit(1).single();

    if (latestEval?.decision) {
      const newStatus = latestEval.decision === "apply" ? "evaluated"
        : latestEval.decision === "skip" ? "archived"
        : "evaluated";

      await supabase.from("jobs").update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", job_id).eq("user_id", user.id);

      results.status_update = { previous_status: job.status, new_status: newStatus };
    } else {
      results.status_update = { skipped: true, reason: "No evaluation found for this job" };
    }
  }

  // ── Step: deep_research ──────────────────────────────────────
  if (steps.includes("deep_research")) {
    const deepPrompt = buildDeepPrompt({
      company: job.company,
      title: job.title,
      description: job.description,
    });

    if (mode === "prompt_only") {
      results.deep_research = {
        prompt: `SYSTEM\n${"─".repeat(60)}\n${DEEP_SYSTEM_PROMPT}\n\nUSER\n${"─".repeat(60)}\n${deepPrompt}`,
      };
    } else if (cred?.encrypted_key) {
      const apiKey = decrypt(cred.encrypted_key);
      const model =
        cred.model ??
        (cred.provider === "anthropic"
          ? "claude-opus-4-7"
          : cred.provider === "gemini"
          ? "gemini-2.0-flash"
          : "gpt-4o");
      try {
        const raw = await callProvider(cred.provider, apiKey, model, DEEP_SYSTEM_PROMPT, deepPrompt);
        results.deep_research = { dossier: parseJSON(raw) };
      } catch (err) {
        results.deep_research = { error: err instanceof Error ? err.message : "AI call failed" };
      }
    } else {
      results.deep_research = { skipped: true, reason: "No AI provider — use mode: prompt_only" };
    }
  }

  // ── Log to task_runs ─────────────────────────────────────────
  await supabase.from("task_runs").insert({
    user_id: user.id,
    type: "evaluate",  // primary type — covers the pipeline orchestration
    status: "completed",
    linked_job_id: job_id,
    input: { job_id, steps, mode, provider: cred?.provider ?? "none" },
    output: { steps_run: steps, company: job.company },
  });

  return NextResponse.json(results);
}
