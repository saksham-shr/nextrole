import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { NEGOTIATE_SYSTEM_PROMPT, buildNegotiatePrompt } from "@/lib/negotiate/prompt";
import { requireFeature } from "@/lib/ai/guard";
import { resolveAIRoute } from "@/lib/ai/router";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const guard = await requireFeature("negotiate");
  if (guard instanceof NextResponse) return guard;
  const { userId } = guard;

  const supabase = await createClient();

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

  const { data: profile } = await supabase
    .from("profiles").select("base_cv, current_comp, comp_min, comp_max, full_name").eq("id", userId).single();

  let job: { title: string; company: string } | null = null;
  if (body.job_id) {
    const { data } = await supabase
      .from("jobs").select("title, company").eq("id", body.job_id).eq("user_id", userId).single();
    job = data;
  }

  const route = await resolveAIRoute(userId).catch(() => null);
  if (!route) return NextResponse.json({ error: "AI provider error" }, { status: 500 });

  if (!route.byok) {
    const { data: ok } = await supabase.rpc("deduct_credit", { p_user_id: userId, p_amount: 5 });
    if (!ok) return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
  }

  const userPrompt = buildNegotiatePrompt({
    job_title: job?.title, company: job?.company,
    offer_amount: body.offer_amount, currency: body.currency,
    competing_offer: body.competing_offer, location: body.location,
    current_comp: profile?.current_comp, target_comp: profile?.comp_max,
    base_cv: profile?.base_cv, notes: body.notes,
  });

  let rawOutput: string;
  try {
    rawOutput = await callProvider(route.provider, route.apiKey, route.model, NEGOTIATE_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI call failed" }, { status: 502 });
  }

  let result: Record<string, unknown>;
  try {
    result = parseJSON(rawOutput) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON", raw: rawOutput }, { status: 502 });
  }

  await supabase.from("task_runs").insert({
    user_id: userId, linked_job_id: body.job_id ?? null,
    type: "negotiate", status: "completed",
    input: { offer_amount: body.offer_amount, currency: body.currency, competing_offer: body.competing_offer ?? null, location: body.location ?? null, job_id: body.job_id ?? null },
    output: { position_strength: result.position_strength, counter_offer: (result.counter_offer as Record<string, unknown>)?.recommended_amount },
  });

  supabase.from("usage_log").insert({ user_id: userId, task_type: "negotiate", model: route.model, credits_used: route.byok ? 0 : 5, byok: route.byok }).then(() => {});

  return NextResponse.json({ result, job, raw: rawOutput });
}
