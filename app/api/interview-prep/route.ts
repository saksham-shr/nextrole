import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { INTERVIEW_PREP_SYSTEM_PROMPT, buildInterviewPrepPrompt } from "@/lib/interview/prompt";
import { requireFeature } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const guard = await requireFeature("interview_prep");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

  const body = (await request.json()) as { job_id?: string };
  if (!body.job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const { data: job } = await supabase
    .from("jobs").select("title, company, description").eq("id", body.job_id).eq("user_id", userId).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.description) return NextResponse.json({ error: "Job has no description — paste it in Pipeline first" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("base_cv").eq("id", userId).single();
  if (!profile?.base_cv) return NextResponse.json({ error: "No CV set — add it in Settings" }, { status: 400 });

  const { data: evals } = await supabase
    .from("evaluations")
    .select("role_fit, cv_match, interview_signals, personalization_guidance, legitimacy_check")
    .eq("job_id", body.job_id).eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(1);
  const evalData = evals?.[0] ?? null;

  const route = await resolveAIRoute(userId).catch(() => null);
  if (!route) return NextResponse.json({ error: "AI provider error" }, { status: 500 });

  if (!route.byok) {
    const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: 5 });
    if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
  }

  const userPrompt = buildInterviewPrepPrompt({
    jobTitle: job.title, jobCompany: job.company,
    jobDescription: job.description, cv: profile.base_cv,
    evalBlocks: evalData,
  });

  let content: Record<string, unknown>;
  try {
    const raw = await callProvider(route.provider, route.apiKey, route.model, INTERVIEW_PREP_SYSTEM_PROMPT, userPrompt);
    content = parseJSON(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "AI returned invalid output" }, { status: 502 });
  }

  const { data: pack } = await supabase.from("interview_prep_packs").insert({
    user_id: userId, job_id: body.job_id,
    title: `${job.title} at ${job.company}`,
    content, status: "ready",
    provider: route.provider, model: route.model,
  }).select("id").single();

  await supabase.from("task_runs").insert({
    user_id: userId, type: "interview_prep", status: "completed",
    linked_job_id: body.job_id,
    input: { job_id: body.job_id, job_title: job.title, company: job.company },
    output: { pack_id: pack?.id },
  });

  supabase.from("usage_log").insert({ user_id: userId, task_type: "interview_prep", model: route.model, credits_used: route.byok ? 0 : 5, byok: route.byok }).then(() => {});

  return NextResponse.json({ pack_id: pack?.id, content });
}
