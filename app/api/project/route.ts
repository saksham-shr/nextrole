import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { PROJECT_SYSTEM_PROMPT, buildProjectPrompt } from "@/lib/project/prompt";
import { requireFeature } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const guard = await requireFeature("deep_research");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

  const body = await request.json() as {
    project_idea: string;
    description: string;
    stack?: string;
    mode?: "api" | "prompt_only";
  };

  const { project_idea, description, stack, mode = "api" } = body;
  if (!project_idea) return NextResponse.json({ error: "project_idea required" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "description required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("base_cv, target_roles").eq("id", userId).single();

  const userPrompt = buildProjectPrompt({
    project_idea, description, stack: stack ?? null,
    target_roles: (profile?.target_roles as string[] | null) ?? null,
    base_cv: profile?.base_cv ?? null,
  });

  if (mode === "prompt_only") {
    return NextResponse.json({
      prompt: `SYSTEM\n${"─".repeat(60)}\n${PROJECT_SYSTEM_PROMPT}\n\n${"─".repeat(60)}\nUSER\n${"─".repeat(60)}\n${userPrompt}`,
    });
  }

  const route = await resolveAIRoute(userId).catch(() => null);
  if (!route) return NextResponse.json({ error: "AI provider error" }, { status: 500 });

  if (!route.byok) {
    const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: 5 });
    if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
  }

  let raw: string;
  try {
    raw = await callProvider(route.provider, route.apiKey, route.model, PROJECT_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI call failed" }, { status: 502 });
  }

  let evaluation: unknown;
  try {
    evaluation = parseJSON(raw);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 502 });
  }

  await supabase.from("task_runs").insert({
    user_id: userId, type: "project_eval", status: "completed",
    linked_job_id: null,
    input: { project_idea, provider: route.provider, model: route.model },
    output: { project_idea },
  });

  supabase.from("usage_log").insert({ user_id: userId, task_type: "project_eval", model: route.model, credits_used: route.byok ? 0 : 5, byok: route.byok }).then(() => {});

  return NextResponse.json({ project_idea, evaluation });
}
