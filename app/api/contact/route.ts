import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider } from "@/lib/evaluate/providers";
import { CONTACT_SYSTEM_PROMPT, buildContactPrompt, ContactType } from "@/lib/contact/prompt";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as {
    job_id: string;
    type: ContactType;
    contact_name?: string;
    relationship_context?: string;
    mode?: "api" | "prompt_only";
  };

  const { job_id, type, contact_name, relationship_context, mode = "api" } = body;

  if (!job_id) return NextResponse.json({ error: "job_id required" }, { status: 400 });
  if (!type) return NextResponse.json({ error: "type required" }, { status: 400 });

  const { data: job } = await supabase
    .from("jobs").select("title, company, description").eq("id", job_id).eq("user_id", user.id).single();
  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  const { data: profile } = await supabase
    .from("profiles").select("base_cv, full_name").eq("id", user.id).single();

  if (!profile?.base_cv) return NextResponse.json({ error: "CV required — add your CV in Settings" }, { status: 400 });

  const userPrompt = buildContactPrompt({
    type,
    company: job.company,
    title: job.title,
    description: job.description ?? "",
    base_cv: profile.base_cv,
    contact_name: contact_name ?? null,
    relationship_context: relationship_context ?? null,
    candidate_name: profile.full_name ?? null,
  });

  if (mode === "prompt_only") {
    return NextResponse.json({
      prompt: `SYSTEM\n${"─".repeat(60)}\n${CONTACT_SYSTEM_PROMPT}\n\n${"─".repeat(60)}\nUSER\n${"─".repeat(60)}\n${userPrompt}`,
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

  let message: string;
  try {
    message = await callProvider(cred.provider, apiKey, model, CONTACT_SYSTEM_PROMPT, userPrompt, 512);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI call failed" }, { status: 502 });
  }

  await supabase.from("task_runs").insert({
    user_id: user.id, type: "contact_draft", status: "completed",
    linked_job_id: job_id,
    input: { job_id, type, provider: cred.provider, model },
    output: { company: job.company, contact_type: type },
  });

  await supabase.from("provider_credentials")
    .update({ last_used_at: new Date().toISOString() }).eq("id", cred.id);

  return NextResponse.json({ message });
}
