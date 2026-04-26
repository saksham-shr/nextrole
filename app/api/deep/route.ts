import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { DEEP_SYSTEM_PROMPT, buildDeepPrompt } from "@/lib/deep/prompt";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  // If job_id provided, load job context
  if (job_id) {
    const { data: job } = await supabase
      .from("jobs").select("title, company, description").eq("id", job_id).eq("user_id", user.id).single();
    if (job) {
      company = job.company;
      title = job.title;
      description = job.description;
    }
  }

  if (!company) return NextResponse.json({ error: "company or job_id required" }, { status: 400 });

  const userPrompt = buildDeepPrompt({ company, title, description, focus });

  if (mode === "prompt_only") {
    return NextResponse.json({
      prompt: `SYSTEM\n${"─".repeat(60)}\n${DEEP_SYSTEM_PROMPT}\n\n${"─".repeat(60)}\nUSER\n${"─".repeat(60)}\n${userPrompt}`,
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
    raw = await callProvider(cred.provider, apiKey, model, DEEP_SYSTEM_PROMPT, userPrompt);
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
    user_id: user.id, type: "deep_research", status: "completed",
    linked_job_id: job_id ?? null,
    input: { company, job_id, provider: cred.provider, model },
    output: { company },
  });

  await supabase.from("provider_credentials")
    .update({ last_used_at: new Date().toISOString() }).eq("id", cred.id);

  return NextResponse.json({ company, dossier });
}
