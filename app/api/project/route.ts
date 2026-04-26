import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { PROJECT_SYSTEM_PROMPT, buildProjectPrompt } from "@/lib/project/prompt";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
    .from("profiles").select("base_cv, target_roles").eq("id", user.id).single();

  const userPrompt = buildProjectPrompt({
    project_idea,
    description,
    stack: stack ?? null,
    target_roles: (profile?.target_roles as string[] | null) ?? null,
    base_cv: profile?.base_cv ?? null,
  });

  if (mode === "prompt_only") {
    return NextResponse.json({
      prompt: `SYSTEM\n${"─".repeat(60)}\n${PROJECT_SYSTEM_PROMPT}\n\n${"─".repeat(60)}\nUSER\n${"─".repeat(60)}\n${userPrompt}`,
    });
  }

  const { data: providers } = await supabase
    .from("provider_credentials").select("*").eq("user_id", user.id)
    .eq("is_active", true).in("provider", ["anthropic", "openai", "gemini"])
    .order("updated_at", { ascending: false }).limit(1);

  const cred = providers?.[0];
  if (!cred?.encrypted_key) return NextResponse.json({ error: "No AI provider configured" }, { status: 400 });

  const apiKey = decrypt(cred.encrypted_key);
  const model = cred.model ?? (cred.provider === "anthropic" ? "claude-opus-4-7" : cred.provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o");

  let raw: string;
  try {
    raw = await callProvider(cred.provider, apiKey, model, PROJECT_SYSTEM_PROMPT, userPrompt);
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
    user_id: user.id, type: "project_eval", status: "completed",
    linked_job_id: null,
    input: { project_idea, provider: cred.provider, model },
    output: { project_idea },
  });

  await supabase.from("provider_credentials")
    .update({ last_used_at: new Date().toISOString() }).eq("id", cred.id);

  return NextResponse.json({ project_idea, evaluation });
}
