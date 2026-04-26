import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";

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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as { job_id?: string };
  if (!body.job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const { data: job } = await supabase
    .from("jobs")
    .select("title, company, description")
    .eq("id", body.job_id)
    .eq("user_id", user.id)
    .single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("base_cv")
    .eq("id", user.id)
    .single();
  if (!profile?.base_cv)
    return NextResponse.json({ error: "No CV set — add it in Settings" }, { status: 400 });

  const { data: evals } = await supabase
    .from("evaluations")
    .select("role_fit, cv_match, interview_signals")
    .eq("job_id", body.job_id)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const evalData = evals?.[0] ?? null;

  const { data: providers } = await supabase
    .from("provider_credentials")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("provider", ["anthropic", "openai", "gemini"])
    .order("updated_at", { ascending: false })
    .limit(1);
  const cred = providers?.[0];
  if (!cred?.encrypted_key)
    return NextResponse.json({ error: "No AI provider configured" }, { status: 400 });

  const apiKey = decrypt(cred.encrypted_key);
  const model = cred.model ?? (cred.provider === "anthropic" ? "claude-opus-4-7" : cred.provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o");

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
    const raw =
      await callProvider(cred.provider, apiKey, model, STORY_SYSTEM_PROMPT, userPrompt);
    story = parseJSON(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "AI returned invalid output" }, { status: 502 });
  }

  const { data: entry } = await supabase
    .from("story_bank_entries")
    .insert({
      user_id: user.id,
      job_id: body.job_id,
      title: String(story.title ?? "AI Generated Story"),
      situation: String(story.situation ?? ""),
      task: String(story.task ?? ""),
      action: String(story.action ?? ""),
      result: String(story.result ?? ""),
      reflection: String(story.reflection ?? ""),
      tags: Array.isArray(story.tags) ? story.tags.map(String) : [],
      difficulty: (["easy", "medium", "hard"].includes(String(story.difficulty))
        ? String(story.difficulty)
        : "medium") as "easy" | "medium" | "hard",
      status: "draft",
    })
    .select("id")
    .single();

  await supabase
    .from("provider_credentials")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", cred.id);

  return NextResponse.json({ entry_id: entry?.id, story });
}
