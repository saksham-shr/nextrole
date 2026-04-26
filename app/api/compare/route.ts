import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { COMPARE_SYSTEM_PROMPT, buildComparePrompt } from "@/lib/evaluate/compare";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { job_ids?: string[] };
  const jobIds = body.job_ids ?? [];

  if (jobIds.length < 2 || jobIds.length > 8) {
    return NextResponse.json({ error: "Select 2–8 jobs to compare" }, { status: 400 });
  }

  // Load jobs
  const { data: jobs } = await supabase
    .from("jobs")
    .select("id, title, company")
    .in("id", jobIds)
    .eq("user_id", user.id);

  if (!jobs || jobs.length < 2) {
    return NextResponse.json({ error: "Could not load jobs" }, { status: 404 });
  }

  // Load latest evaluation per job
  const { data: evals } = await supabase
    .from("evaluations")
    .select(
      "id, job_id, score, decision, role_fit, compensation_analysis, cv_match, legitimacy_check",
    )
    .in("job_id", jobIds)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Map job_id → latest eval (already sorted desc)
  const latestEval = new Map<string, (typeof evals extends null ? never : NonNullable<typeof evals>[number])>();
  for (const e of evals ?? []) {
    if (!latestEval.has(e.job_id)) latestEval.set(e.job_id, e);
  }

  // Only compare jobs that have evaluations
  const jobsWithEvals = jobs
    .map((j) => ({ ...j, eval: latestEval.get(j.id) ?? null }))
    .filter((j): j is typeof j & { eval: NonNullable<typeof j["eval"]> } => j.eval !== null);

  if (jobsWithEvals.length < 2) {
    return NextResponse.json(
      { error: "At least 2 selected jobs must have been evaluated first" },
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
    return NextResponse.json({ error: "No AI provider configured — add a key in Providers" }, { status: 400 });
  }

  const apiKey = decrypt(cred.encrypted_key);
  const model = cred.model ?? (cred.provider === "anthropic" ? "claude-opus-4-7" : cred.provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o");

  // Create task_run
  const { data: taskRun } = await supabase
    .from("task_runs")
    .insert({
      user_id: user.id,
      type: "compare",
      status: "running",
      input: { job_ids: jobIds, count: jobsWithEvals.length },
    })
    .select("id")
    .single();

  // Build and call
  const compareInputs = jobsWithEvals.map((j) => ({
    id: j.id,
    title: j.title,
    company: j.company,
    score: j.eval.score,
    decision: j.eval.decision,
    role_fit: j.eval.role_fit,
    compensation_analysis: j.eval.compensation_analysis,
    cv_match: j.eval.cv_match,
    legitimacy_check: j.eval.legitimacy_check,
  }));

  const userPrompt = buildComparePrompt(compareInputs);

  let rawOutput: string;
  try {
    rawOutput =
      await callProvider(cred.provider, apiKey, model, COMPARE_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    if (taskRun) {
      await supabase
        .from("task_runs")
        .update({ status: "failed", error: message, updated_at: new Date().toISOString() })
        .eq("id", taskRun.id);
    }
    return NextResponse.json({ error: message }, { status: 502 });
  }

  let result: CompareResult;
  try {
    result = parseJSON(rawOutput) as CompareResult;
  } catch {
    if (taskRun) {
      await supabase
        .from("task_runs")
        .update({
          status: "failed",
          error: "AI returned invalid JSON",
          updated_at: new Date().toISOString(),
        })
        .eq("id", taskRun.id);
    }
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  // Persist report
  const { data: report } = await supabase
    .from("reports")
    .insert({
      user_id: user.id,
      title: `Compare: ${jobsWithEvals.map((j) => j.company).join(" vs ")}`,
      type: "compare",
      content: {
        ...result,
        compared_jobs: jobsWithEvals.map((j) => ({
          id: j.id,
          title: j.title,
          company: j.company,
          score: j.eval.score,
          decision: j.eval.decision,
        })),
      } as unknown as Record<string, unknown>,
    })
    .select("id")
    .single();

  // Finalize task_run
  if (taskRun) {
    await supabase
      .from("task_runs")
      .update({
        status: "completed",
        output: {
          report_id: report?.id,
          winner_id: result.winner_id,
          count: jobsWithEvals.length,
        },
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskRun.id);
  }

  await supabase
    .from("provider_credentials")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", cred.id);

  return NextResponse.json({ ...result, report_id: report?.id });
}
