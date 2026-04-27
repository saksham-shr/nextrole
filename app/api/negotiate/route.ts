import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import {
  NEGOTIATE_SYSTEM_PROMPT,
  buildNegotiatePrompt,
} from "@/lib/negotiate/prompt";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = (await request.json()) as {
    job_id?: string;
    offer_amount?: number;
    currency?: string;
    competing_offer?: number;
    location?: string;
    notes?: string;
  };

  if (!body.offer_amount || body.offer_amount <= 0) {
    return NextResponse.json({ error: "offer_amount is required" }, { status: 400 });
  }

  // Load profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("base_cv, current_comp, comp_min, comp_max, full_name")
    .eq("id", user.id)
    .single();

  // Load job if provided
  let job: { title: string; company: string } | null = null;
  if (body.job_id) {
    const { data } = await supabase
      .from("jobs")
      .select("title, company")
      .eq("id", body.job_id)
      .eq("user_id", user.id)
      .single();
    job = data;
  }

  // Load active provider
  const { data: providers } = await supabase
    .from("provider_credentials")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .in("provider", ["anthropic", "openai", "gemini"])
    .order("updated_at", { ascending: false })
    .limit(1);

  const cred = providers?.[0];
  if (!cred?.encrypted_key) {
    return NextResponse.json(
      { error: "No AI provider configured — add a key in Providers" },
      { status: 400 },
    );
  }

  const apiKey = decrypt(cred.encrypted_key);
  const model =
    cred.model ??
    (cred.provider === "anthropic"
      ? "claude-sonnet-4-6"
      : cred.provider === "gemini"
      ? "gemini-2.0-flash"
      : "gpt-4o");

  const userPrompt = buildNegotiatePrompt({
    job_title: job?.title,
    company: job?.company,
    offer_amount: body.offer_amount,
    currency: body.currency,
    competing_offer: body.competing_offer,
    location: body.location,
    current_comp: profile?.current_comp,
    target_comp: profile?.comp_max,
    base_cv: profile?.base_cv,
    notes: body.notes,
  });

  let rawOutput: string;
  try {
    rawOutput = await callProvider(
      cred.provider,
      apiKey,
      model,
      NEGOTIATE_SYSTEM_PROMPT,
      userPrompt,
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI call failed" },
      { status: 502 },
    );
  }

  let result: Record<string, unknown>;
  try {
    result = parseJSON(rawOutput) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw: rawOutput }, { status: 502 });
  }

  // Log task run
  await supabase.from("task_runs").insert({
    user_id: user.id,
    linked_job_id: body.job_id ?? null,
    type: "negotiate",
    status: "completed",
    input: {
      offer_amount: body.offer_amount,
      currency: body.currency,
      competing_offer: body.competing_offer ?? null,
      location: body.location ?? null,
      job_id: body.job_id ?? null,
    },
    output: {
      position_strength: result.position_strength,
      counter_offer: (result.counter_offer as Record<string, unknown>)?.recommended_amount,
    },
  });

  await supabase
    .from("provider_credentials")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", cred.id);

  return NextResponse.json({ result, job, raw: rawOutput });
}
