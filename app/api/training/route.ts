import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { TRAINING_SYSTEM_PROMPT, buildTrainingPrompt } from "@/lib/training/prompt";
import { requireFeature } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const guard = await requireFeature("training_eval");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

  const body = await request.json() as {
    course_name: string;
    description: string;
    time_commitment?: string;
    cost?: string;
    mode?: "api" | "prompt_only";
  };

  const { course_name, description, time_commitment, cost, mode = "api" } = body;
  if (!course_name) return NextResponse.json({ error: "course_name required" }, { status: 400 });
  if (!description) return NextResponse.json({ error: "description required" }, { status: 400 });

  const { data: profile } = await supabase
    .from("profiles").select("base_cv, target_roles").eq("id", userId).single();

  const userPrompt = buildTrainingPrompt({
    course_name, description,
    time_commitment: time_commitment ?? null,
    cost: cost ?? null,
    target_roles: (profile?.target_roles as string[] | null) ?? null,
    base_cv: profile?.base_cv ?? null,
  });

  if (mode === "prompt_only") {
    return NextResponse.json({
      prompt: `SYSTEM\n${"─".repeat(60)}\n${TRAINING_SYSTEM_PROMPT}\n\n${"─".repeat(60)}\nUSER\n${"─".repeat(60)}\n${userPrompt}`,
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
    raw = await callProvider(route.provider, route.apiKey, route.model, TRAINING_SYSTEM_PROMPT, userPrompt);
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
    user_id: userId, type: "training_eval", status: "completed",
    linked_job_id: null,
    input: { course_name, provider: route.provider, model: route.model },
    output: { course_name },
  });

  supabase.from("usage_log").insert({ user_id: userId, task_type: "training_eval", model: route.model, credits_used: route.byok ? 0 : 5, byok: route.byok }).then(() => {});

  return NextResponse.json({ course_name, evaluation });
}
