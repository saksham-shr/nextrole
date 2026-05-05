import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { requireFeature } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";

export const maxDuration = 30;

const STORY_SYSTEM_PROMPT = `You are a career coach helping a candidate craft a compelling STAR+Reflection interview story relevant to a specific job. Generate one story as valid JSON only:

{
  "title": "<concise story title>",
  "situation": "<the context and challenge, 2-3 sentences>",
  "task": "<what the candidate was responsible for, 1-2 sentences>",
  "action": "<specific actions taken, 3-5 sentences with concrete details>",
  "result": "<quantified outcomes and impact, 2-3 sentences>",
  "reflection": "<what was learned and how it applies to the target role, 1-2 sentences>",
  "tags": ["<skill1>", "<skill2>"],
  "difficulty": "easy|medium|hard"
}

Rules:
- Never invent experience — only reframe and structure what is in the CV
- The story must relate to themes identified in the evaluation
- Tags must match skills in the job description
- JSON only`;

export async function POST(request: NextRequest) {
  const guard = await requireFeature("story");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

  const body = (await request.json()) as { job_id?: string };
  if (!body.job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const { data: job } = await supabase
    .from("jobs").select("title, company, description").eq("id", body.job_id).eq("user_id", userId).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles").select("base_cv").eq("id", userId).single();
  if (!profile?.base_cv) return NextResponse.json({ error: "No CV set — add it in Settings" }, { status: 400 });

  const { data: evals } = await supabase
    .from("evaluations").select("role_fit, cv_match, interview_signals")
    .eq("job_id", body.job_id).eq("user_id", userId)
    .order("created_at", { ascending: false }).limit(1);
  const evalData = evals?.[0] ?? null;

  const route = await resolveAIRoute(userId).catch(() => null);
  if (!route) return NextResponse.json({ error: "AI provider error" }, { status: 500 });

  if (!route.byok) {
    const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: 5 });
    if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
  }

  const userPrompt = `## Target Role
${job.title} at ${job.company}

## Job Description
${(job.description ?? "No description").slice(0, 2000)}

## Candidate CV
${profile.base_cv.slice(0, 2000)}

## Evaluation Intelligence
${JSON.stringify({ role_fit: evalData?.role_fit, cv_match: evalData?.cv_match, interview_signals: evalData?.interview_signals }, null, 2)}

Generate one strong STAR+Reflection story that showcases relevant experience for this role. JSON only.`;

  let story: Record<string, unknown>;
  try {
    const raw = await callProvider(route.provider, route.apiKey, route.model, STORY_SYSTEM_PROMPT, userPrompt);
    story = parseJSON(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "AI returned invalid output" }, { status: 502 });
  }

  const { data: entry } = await supabase.from("story_bank_entries").insert({
    user_id: userId, job_id: body.job_id,
    title: String(story.title ?? "AI Generated Story"),
    situation: String(story.situation ?? ""),
    task: String(story.task ?? ""),
    action: String(story.action ?? ""),
    result: String(story.result ?? ""),
    reflection: String(story.reflection ?? ""),
    tags: Array.isArray(story.tags) ? story.tags.map(String) : [],
    difficulty: (["easy", "medium", "hard"].includes(String(story.difficulty)) ? String(story.difficulty) : "medium") as "easy" | "medium" | "hard",
    status: "draft",
  }).select("id").single();

  supabase.from("usage_log").insert({ user_id: userId, task_type: "story", model: route.model, credits_used: route.byok ? 0 : 5, byok: route.byok }).then(() => {});

  return NextResponse.json({ entry_id: entry?.id, story });
}
