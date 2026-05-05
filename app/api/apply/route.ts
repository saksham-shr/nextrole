import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { APPLY_SYSTEM_PROMPT, buildApplyPrompt, type ApplyQuestion } from "@/lib/apply/prompt";
import { callProvider } from "@/lib/evaluate/providers";
import { requireFeature } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const guard = await requireFeature("apply");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

  const body = await request.json() as {
    job_id?: string;
    question?: ApplyQuestion;
    mode?: "api" | "prompt_only";
  };

  const { job_id, question, mode = "api" } = body;
  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const { data: job } = await supabase
    .from("jobs").select("*").eq("id", job_id).eq("user_id", userId).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.description) return NextResponse.json({ error: "Job has no description" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("base_cv, comp_min, comp_max, full_name").eq("id", userId).single();
  if (!profile?.base_cv) return NextResponse.json({ error: "No CV in profile — add it in Settings" }, { status: 400 });

  const { data: evals } = await supabase
    .from("evaluations")
    .select("personalization_guidance, cv_match")
    .eq("job_id", job_id)
    .order("created_at", { ascending: false })
    .limit(1);

  const evalData = evals?.[0];
  const evalSummary = evalData
    ? `Personalization angle: ${JSON.stringify(evalData.personalization_guidance)}\nCV match: ${JSON.stringify(evalData.cv_match)}`
    : null;

  const userPrompt = buildApplyPrompt({
    question,
    title: job.title,
    company: job.company,
    description: job.description,
    base_cv: profile.base_cv,
    eval_summary: evalSummary,
    comp_min: profile.comp_min,
    comp_max: profile.comp_max,
  });

  if (mode === "prompt_only") {
    return NextResponse.json({
      prompt: `SYSTEM\n${"─".repeat(60)}\n${APPLY_SYSTEM_PROMPT}\n\n${"─".repeat(60)}\nUSER\n${"─".repeat(60)}\n${userPrompt}`,
    });
  }

  const route = await resolveAIRoute(userId).catch((err) => {
    throw err instanceof Error && err.message === "BYOK_KEY_MISSING"
      ? new Error("Add your API key in Settings → Providers")
      : err;
  });

  if (!route.byok) {
    const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: 5 });
    if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
  }

  let draft: string;
  try {
    draft = await callProvider(route.provider, route.apiKey, route.model, APPLY_SYSTEM_PROMPT, userPrompt, 1024);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI call failed" }, { status: 502 });
  }

  await supabase.from("task_runs").insert({
    user_id: userId, type: "apply", status: "completed", linked_job_id: job_id,
    input: { job_id, question, provider: route.provider, model: route.model },
    output: { draft: draft.slice(0, 500) },
  });

  supabase.from("usage_log").insert({ user_id: userId, task_type: "apply", model: route.model, credits_used: route.byok ? 0 : 5, byok: route.byok }).then(() => {});

  return NextResponse.json({ draft });
}
