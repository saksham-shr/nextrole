import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import {
  FOLLOWUP_SYSTEM_PROMPT,
  buildFollowupPrompt,
  type FollowupType,
} from "@/lib/followup/prompt";

export const maxDuration = 60;

async function callAI(
  provider: string,
  apiKey: string,
  model: string,
  system: string,
  user: string,
): Promise<string> {
  if (provider === "anthropic") {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    if (!res.ok) throw new Error(`Anthropic ${res.status}: ${await res.text()}`);
    const data = await res.json() as { content: Array<{ text: string }> };
    return data.content[0].text;
  } else {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
    const data = await res.json() as { choices: Array<{ message: { content: string } }> };
    return data.choices[0].message.content;
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    job_id?: string;
    type?: FollowupType;
    mode?: "api" | "prompt_only";
  };

  const { job_id, type, mode = "api" } = body;
  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  // Load job
  const { data: job } = await supabase
    .from("jobs").select("*").eq("id", job_id).eq("user_id", user.id).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.description) return NextResponse.json({ error: "Job has no description" }, { status: 400 });

  // Load profile
  const { data: profile } = await supabase
    .from("profiles").select("base_cv, full_name").eq("id", user.id).single();
  if (!profile?.base_cv) return NextResponse.json({ error: "No CV in profile — add it in Settings" }, { status: 400 });

  const userPrompt = buildFollowupPrompt({
    type,
    title: job.title,
    company: job.company,
    description: job.description,
    base_cv: profile.base_cv,
    candidate_name: profile.full_name,
  });

  // Prompt-only mode
  if (mode === "prompt_only") {
    return NextResponse.json({
      prompt: `SYSTEM\n${"─".repeat(60)}\n${FOLLOWUP_SYSTEM_PROMPT}\n\n${"─".repeat(60)}\nUSER\n${"─".repeat(60)}\n${userPrompt}`,
    });
  }

  // Load provider
  const { data: providers } = await supabase
    .from("provider_credentials").select("*")
    .eq("user_id", user.id).eq("is_active", true)
    .in("provider", ["anthropic", "openai", "gemini"])
    .order("updated_at", { ascending: false }).limit(1);

  const cred = providers?.[0];
  if (!cred?.encrypted_key) return NextResponse.json({ error: "No AI provider configured" }, { status: 400 });

  const apiKey = decrypt(cred.encrypted_key);
  const model = cred.model ?? (cred.provider === "anthropic" ? "claude-opus-4-7" : cred.provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o");

  let draft: string;
  try {
    draft = await callAI(cred.provider, apiKey, model, FOLLOWUP_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  await supabase.from("task_runs").insert({
    user_id: user.id,
    type: "followup",
    status: "completed",
    linked_job_id: job_id,
    input: { job_id, type, provider: cred.provider, model },
    output: { draft: draft.slice(0, 500) },
  });

  await supabase.from("provider_credentials")
    .update({ last_used_at: new Date().toISOString() }).eq("id", cred.id);

  return NextResponse.json({ draft });
}
