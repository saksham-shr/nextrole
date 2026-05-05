import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { DEEP_SYSTEM_PROMPT, buildDeepPrompt } from "@/lib/deep/prompt";
import { requireFeature } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const guard = await requireFeature("deep_research");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

  const body = await request.json() as {
    company?: string;
    job_id?: string;
    focus?: string;
    mode?: "api" | "prompt_only";
  };

  const { company: companyParam, job_id, focus, mode = "api" } = body;

  let company = companyParam ?? "";
  let title: string | null = null;
  let description: string | null = null;

  if (job_id) {
    const { data: job } = await supabase
      .from("jobs").select("title, company, description").eq("id", job_id).eq("user_id", userId).single();
    if (job) { company = job.company; title = job.title; description = job.description; }
  }

  if (!company) return NextResponse.json({ error: "company or job_id required" }, { status: 400 });

  const userPrompt = buildDeepPrompt({ company, title, description, focus });

  if (mode === "prompt_only") {
    return NextResponse.json({
      prompt: `SYSTEM\n${"─".repeat(60)}\n${DEEP_SYSTEM_PROMPT}\n\n${"─".repeat(60)}\nUSER\n${"─".repeat(60)}\n${userPrompt}`,
    });
  }

  const route = await resolveAIRoute(userId).catch(() => null);
  if (!route) return NextResponse.json({ error: "AI provider error" }, { status: 500 });

  if (!route.byok) {
    const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: 15 });
    if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
  }

  let raw: string;
  try {
    raw = await callProvider(route.provider, route.apiKey, route.model, DEEP_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI call failed" }, { status: 502 });
  }

  let dossier: unknown;
  try {
    dossier = parseJSON(raw);
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw }, { status: 502 });
  }

  await supabase.from("task_runs").insert({
    user_id: userId, type: "deep_research", status: "completed",
    linked_job_id: job_id ?? null,
    input: { company, job_id, provider: route.provider, model: route.model },
    output: { company },
  });

  supabase.from("usage_log").insert({ user_id: userId, task_type: "deep_research", model: route.model, credits_used: route.byok ? 0 : 15, byok: route.byok }).then(() => {});

  return NextResponse.json({ company, dossier });
}
