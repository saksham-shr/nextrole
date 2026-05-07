import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/ai/providers";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/evaluate/prompt";
import { requireFeature, requireJobSlot } from "@/lib/ai/guard";
import { resolveRoute, type AIRoute } from "@/lib/ai/router";
import { CREDIT_COSTS } from "@/lib/ai/gates";

export const maxDuration = 120;

type PipelineStep = "evaluate" | "status_update";

type EvalResult = { score?: number; decision?: string; [key: string]: unknown };

type PipelineJobInput = {
  title: string;
  company: string;
  url?: string | null;
  description?: string | null;
  source?: string | null;
};

export async function POST(request: NextRequest) {
  // Pipeline job creation is allowed for all tiers; evaluation step requires feature gate
  const guard = await requireJobSlot();
  if (guard instanceof NextResponse) return guard;
  const { userId, tier, isAdmin } = guard;

  const supabase = await createClient();

  const body = (await request.json()) as {
    job_id?: string;
    job?: PipelineJobInput;
    steps?: PipelineStep[];
    mode?: "api" | "prompt_only";
  };
  const { steps = ["status_update"], mode = "api" } = body;
  let jobId = body.job_id;

  // Create job if not provided
  if (!jobId && body.job) {
    const title   = (body.job.title   ?? "").trim();
    const company = (body.job.company ?? "").trim();

    if (!title || !company) {
      return NextResponse.json({ error: "job.title and job.company are required" }, { status: 400 });
    }

    const { data: createdJob, error: createError } = await supabase
      .from("jobs")
      .insert({
        user_id:     userId,
        title,
        company,
        url:         body.job.url?.trim()         || null,
        description: body.job.description?.trim() || null,
        source:      body.job.source?.trim()      || "browser_extension",
        status:      "pending",
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

  const results: Record<string, unknown> = { job_id: jobId, steps };

  // Evaluate step
  if (steps.includes("evaluate")) {
    if (!job.description) {
      results.evaluate = { error: "Job has no description" };
    } else {
      const evalGuard = await requireFeature("evaluate");
      if (evalGuard instanceof NextResponse) {
        results.evaluate = { error: "Insufficient access for evaluation" };
      } else {
        const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();

        let route: AIRoute;
        try { route = resolveRoute("evaluate"); }
        catch { return NextResponse.json({ error: "AI not configured" }, { status: 503 }); }

        // Deduct credits for paid tiers
        if (!isAdmin && tier !== "free") {
          const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: CREDIT_COSTS.evaluate });
          if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
        }

        const systemPrompt = buildSystemPrompt({
          applyThreshold: profile?.eval_score_apply ?? 3.5,
          watchThreshold: profile?.eval_score_watch ?? 2.5,
          customFocus: profile?.custom_eval_focus,
          language: profile?.preferred_language,
          archetypes: profile?.custom_archetypes,
        });
        const userPrompt = buildUserPrompt({
          title: job.title, company: job.company, description: job.description, base_cv: profile?.base_cv ?? "",
        });

        try {
          const raw = await callProvider({
            provider: route.provider,
            apiKey: route.apiKey, model: route.model,
            system: systemPrompt, user: userPrompt,
            maxTokens: 3000, cache: route.provider === "anthropic",
            json: true, fallbackModels: route.fallbackModels,
          });
          const evaluation = parseJSON(raw) as EvalResult;
          const score    = typeof evaluation?.score    === "number" ? evaluation.score : null;
          const decision = typeof evaluation?.decision === "string" ? evaluation.decision : null;

          await supabase.from("evaluations").insert({
            user_id: userId, job_id: jobId, score,
            decision: decision as "apply" | "skip" | "watch" | null,
            role_fit:                  (evaluation?.role_fit                  as Record<string, unknown>) ?? null,
            compensation_analysis:     (evaluation?.compensation_analysis     as Record<string, unknown>) ?? null,
            cv_match:                  (evaluation?.cv_match                  as Record<string, unknown>) ?? null,
            personalization_guidance:  (evaluation?.personalization_guidance  as Record<string, unknown>) ?? null,
            interview_signals:         (evaluation?.interview_signals         as Record<string, unknown>) ?? null,
            legitimacy_check:          (evaluation?.legitimacy_check          as Record<string, unknown>) ?? null,
            raw_output: raw, provider: route.provider, model: route.model,
          });

          results.evaluate = { score, decision };

          if (steps.includes("status_update") && decision) {
            const newStatus = decision === "skip" ? "archived" : "evaluated";
            await supabase.from("jobs").update({ status: newStatus, updated_at: new Date().toISOString() })
              .eq("id", jobId).eq("user_id", userId);
            results.status_update = { new_status: newStatus };
          }

          supabase.from("usage_log").insert({ user_id: userId, task_type: "evaluate", model: route.model, credits_used: CREDIT_COSTS.evaluate, byok: false }).then(() => {});
        } catch (err) {
          results.evaluate = { error: err instanceof Error ? err.message : "AI call failed" };
        }
      }
    }
  } else if (steps.includes("status_update")) {
    const { data: latestEval } = await supabase.from("evaluations")
      .select("decision").eq("job_id", jobId).eq("user_id", userId)
      .order("created_at", { ascending: false }).limit(1).single();
    if (latestEval?.decision) {
      const newStatus = latestEval.decision === "skip" ? "archived" : "evaluated";
      await supabase.from("jobs").update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", jobId).eq("user_id", userId);
      results.status_update = { new_status: newStatus };
    }
  }

  return NextResponse.json(results);
}

// Allow status updates via PATCH (Pipeline page: change job status)
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { job_id: string; status: string };
  if (!body.job_id || !body.status) return NextResponse.json({ error: "job_id and status required" }, { status: 400 });

  const VALID_STATUSES = ["pending", "evaluated", "applied", "interview", "offer", "rejected", "archived"];
  if (!VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { error } = await supabase.from("jobs")
    .update({ status: body.status as "pending" | "evaluated" | "applied" | "interview" | "offer" | "rejected" | "archived", updated_at: new Date().toISOString() })
    .eq("id", body.job_id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
