import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider } from "@/lib/evaluate/providers";
import { FOLLOWUP_SYSTEM_PROMPT, buildFollowupPrompt, type FollowupType } from "@/lib/followup/prompt";
import { requireFeature } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const guard = await requireFeature("followup");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

  const body = await request.json() as {
    job_id?: string;
    type?: FollowupType;
    mode?: "api" | "prompt_only";
  };

  const { job_id, type, mode = "api" } = body;
  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  const { data: job } = await supabase
    .from("jobs").select("*").eq("id", job_id).eq("user_id", userId).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.description) return NextResponse.json({ error: "Job has no description" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("base_cv, full_name").eq("id", userId).single();
  if (!profile?.base_cv) return NextResponse.json({ error: "No CV in profile — add it in Settings" }, { status: 400 });

  const userPrompt = buildFollowupPrompt({
    type, title: job.title, company: job.company,
    description: job.description, base_cv: profile.base_cv,
    candidate_name: profile.full_name,
  });

  if (mode === "prompt_only") {
    return NextResponse.json({
      prompt: `SYSTEM\n${"─".repeat(60)}\n${FOLLOWUP_SYSTEM_PROMPT}\n\n${"─".repeat(60)}\nUSER\n${"─".repeat(60)}\n${userPrompt}`,
    });
  }

  const route = await resolveAIRoute(userId).catch(() => null);
  if (!route) return NextResponse.json({ error: "AI provider error" }, { status: 500 });

  if (!route.byok) {
    const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: 3 });
    if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
  }

  let draft: string;
  try {
    draft = await callProvider(route.provider, route.apiKey, route.model, FOLLOWUP_SYSTEM_PROMPT, userPrompt, 512);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI call failed" }, { status: 502 });
  }

  await supabase.from("task_runs").insert({
    user_id: userId, type: "followup", status: "completed", linked_job_id: job_id,
    input: { job_id, type, provider: route.provider, model: route.model },
    output: { draft: draft.slice(0, 500) },
  });

  supabase.from("usage_log").insert({ user_id: userId, task_type: "followup", model: route.model, credits_used: route.byok ? 0 : 3, byok: route.byok }).then(() => {});

  return NextResponse.json({ draft });
}
