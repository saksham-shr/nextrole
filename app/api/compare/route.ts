import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { COMPARE_SYSTEM_PROMPT, buildComparePrompt } from "@/lib/evaluate/compare";
import { requireFeature } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";

export const maxDuration = 60;

export interface RankedJob {
  job_id: string;
  rank: number;
  title: string;
  company: string;
  score: number;
  decision: string;
  why: string;
}

export interface CompareResult {
  ranked: RankedJob[];
  winner_id: string;
  winner_rationale: string;
  summary: string;
  report_id?: string;
  error?: string;
}

export async function POST(request: NextRequest) {
  const guard = await requireFeature("job_comparison");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

  const body = (await request.json()) as { job_ids?: string[] };
  const jobIds = body.job_ids ?? [];

  if (jobIds.length < 2 || jobIds.length > 8) {
    return NextResponse.json({ error: "Select 2–8 jobs to compare" }, { status: 400 });
  }

  const { data: jobs } = await supabase
    .from("jobs").select("id, title, company").in("id", jobIds).eq("user_id", userId);

  if (!jobs || jobs.length < 2) {
    return NextResponse.json({ error: "Could not load jobs" }, { status: 404 });
  }

  const { data: evals } = await supabase
    .from("evaluations")
    .select("id, job_id, score, decision, role_fit, compensation_analysis, cv_match, legitimacy_check")
    .in("job_id", jobIds).eq("user_id", userId)
    .order("created_at", { ascending: false });

  const latestEval = new Map<string, (typeof evals extends null ? never : NonNullable<typeof evals>[number])>();
  for (const e of evals ?? []) {
    if (!latestEval.has(e.job_id)) latestEval.set(e.job_id, e);
  }

  const jobsWithEvals = jobs
    .map((j) => ({ ...j, eval: latestEval.get(j.id) ?? null }))
    .filter((j): j is typeof j & { eval: NonNullable<typeof j["eval"]> } => j.eval !== null);

  if (jobsWithEvals.length < 2) {
    return NextResponse.json({ error: "At least 2 selected jobs must have been evaluated first" }, { status: 400 });
  }

  const route = await resolveAIRoute(userId).catch(() => null);
  if (!route) return NextResponse.json({ error: "AI provider error" }, { status: 500 });

  if (!route.byok) {
    const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: 8 });
    if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
  }

  const { data: taskRun } = await supabase.from("task_runs").insert({
    user_id: userId, type: "compare", status: "running",
    input: { job_ids: jobIds, count: jobsWithEvals.length },
  }).select("id").single();

  const compareInputs = jobsWithEvals.map((j) => ({
    id: j.id, title: j.title, company: j.company,
    score: j.eval.score, decision: j.eval.decision,
    role_fit: j.eval.role_fit, compensation_analysis: j.eval.compensation_analysis,
    cv_match: j.eval.cv_match, legitimacy_check: j.eval.legitimacy_check,
  }));

  let rawOutput: string;
  try {
    rawOutput = await callProvider(route.provider, route.apiKey, route.model, COMPARE_SYSTEM_PROMPT, buildComparePrompt(compareInputs));
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    if (taskRun) await supabase.from("task_runs").update({ status: "failed", error: message, updated_at: new Date().toISOString() }).eq("id", taskRun.id);
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let result: CompareResult;
  try {
    result = parseJSON(rawOutput) as CompareResult;
  } catch {
    if (taskRun) await supabase.from("task_runs").update({ status: "failed", error: "AI returned invalid JSON", updated_at: new Date().toISOString() }).eq("id", taskRun.id);
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  const { data: report } = await supabase.from("reports").insert({
    user_id: userId,
    title: `Compare: ${jobsWithEvals.map((j) => j.company).join(" vs ")}`,
    type: "compare",
    content: {
      ...result,
      compared_jobs: jobsWithEvals.map((j) => ({ id: j.id, title: j.title, company: j.company, score: j.eval.score, decision: j.eval.decision })),
    } as unknown as Record<string, unknown>,
  }).select("id").single();

  if (taskRun) {
    await supabase.from("task_runs").update({
      status: "completed",
      output: { report_id: report?.id, winner_id: result.winner_id, count: jobsWithEvals.length },
      updated_at: new Date().toISOString(),
    }).eq("id", taskRun.id);
  }

  supabase.from("usage_log").insert({ user_id: userId, task_type: "compare", model: route.model, credits_used: route.byok ? 0 : 8, byok: route.byok }).then(() => {});

  return NextResponse.json({ ...result, report_id: report?.id });
}
