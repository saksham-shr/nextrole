/**
 * POST /api/extension/suggest
 * Auth: Bearer <extension_token>
 *
 * AI-generates an answer for one custom screening question on an ATS form.
 * Available to all tiers — cost: 5 credits per call.
 * Free users consume signup_credits / bonus_credits until exhausted.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { callProvider } from "@/lib/ai/providers";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { CREDIT_COSTS } from "@/lib/ai/gates";
import { resolveRoute, type AIRoute } from "@/lib/ai/router";

const SUGGEST_MAX_TOKENS = 600;

function buildPrompt(opts: {
  fieldLabel:      string;
  fieldType:       string;
  jobTitle:        string;
  company:         string;
  jobDescription:  string;
  currentValue:    string;
  fullName:        string;
  baseCv:          string;
  targetRoles:     string[];
  yearsExperience: number | null;
  seniority:       string | null;
  email:           string;
  mode:            "suggest" | "improve";
}) {
  const {
    fieldLabel, fieldType, jobTitle, company, jobDescription,
    currentValue, fullName, baseCv, targetRoles, yearsExperience, seniority, email, mode,
  } = opts;

  const cvCtx      = baseCv   ? `\nMy CV:\n${baseCv.slice(0, 3000)}`   : "";
  const jobCtx     = jobTitle ? `\nJob: ${jobTitle} at ${company}${jobDescription ? `\nJD: ${jobDescription.slice(0, 1000)}` : ""}` : "";
  const profileCtx = [
    fullName && `Name: ${fullName}`,
    email    && `Email: ${email}`,
    yearsExperience && `Experience: ${yearsExperience}yr`,
    seniority,
    targetRoles.length > 0 && `Roles: ${targetRoles.slice(0, 3).join(", ")}`,
  ].filter(Boolean).join(" | ");

  const system = `You are a professional job application writer. Write concise, authentic first-person content for a form field. Return ONLY the text — no preamble, no quotes.`;

  if (mode === "improve" && currentValue.length > 10) {
    const userPrompt = `The user wrote this draft for the "${fieldLabel || fieldType}" field:\n\n"${currentValue.slice(0, 600)}"\n\nRewrite and improve it — make it more specific, professional, and tailored to the role. Keep the same voice but strengthen it. Do NOT repeat their text verbatim.\n${profileCtx}${jobCtx}`;
    return { system, userPrompt };
  }

  let userPrompt: string;
  switch (fieldType) {
    case "cover_letter":
      userPrompt = `Write a tailored cover letter (3–4 paragraphs, under 320 words) for this application.\n${profileCtx}${cvCtx}${jobCtx}`;
      break;
    case "why_company":
      userPrompt = `Write 2–3 sentences for "${fieldLabel || "Why do you want to work here?"}". Be specific about this company and role.\n${profileCtx}${jobCtx}`;
      break;
    case "about_yourself":
      userPrompt = `Write a 2–3 sentence professional intro for "${fieldLabel || "Tell us about yourself"}".\n${profileCtx}${cvCtx}${jobCtx}`;
      break;
    default:
      userPrompt = `Fill in the field "${fieldLabel || fieldType}" with a concise professional response.\n${profileCtx}${cvCtx}${jobCtx}`;
  }

  return { system, userPrompt };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`ext-suggest:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;
  const admin = createAdminClient();

  const body = await req.json().catch(() => ({})) as {
    field_type?:     string;
    field_label?:    string;
    job_title?:      string;
    company?:        string;
    job_description?: string;
    current_value?:  string;
    mode?:           "suggest" | "improve";
  };

  const cost = CREDIT_COSTS.suggest;

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email, base_cv, target_roles, years_experience, seniority, daily_credits, topup_credits, bonus_credits")
    .eq("id", userId)
    .single();

  const dailyCredits = (profile?.daily_credits  as number | null) ?? 0;
  const topupCredits = (profile?.topup_credits  as number | null) ?? 0;
  const bonusCredits = (profile?.bonus_credits  as number | null) ?? 0;
  const totalCredits = dailyCredits + topupCredits + bonusCredits;

  if (totalCredits < cost) {
    return NextResponse.json(
      { error: "Not enough credits — top up your plan to use AI field suggestions", upgrade: true },
      { status: 402 },
    );
  }

  // Atomically deduct credits before the AI call.
  const { data: deducted, error: deductErr } = await admin.rpc("deduct_credit", {
    p_user_id: userId,
    p_amount:  cost,
  });
  if (deductErr || deducted !== true) {
    return NextResponse.json(
      { error: "Not enough credits — top up your plan to use AI field suggestions", upgrade: true },
      { status: 402 },
    );
  }

  const refund = async () => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (admin.rpc as any)("refund_credit", { p_user_id: userId, p_amount: cost });
    } catch {
      try { await admin.rpc("add_credits", { p_user_id: userId, p_amount: cost }); } catch {}
    }
  };

  let route: AIRoute;
  try { route = resolveRoute("autofill"); }
  catch {
    await refund();
    return NextResponse.json({ error: "AI not configured" }, { status: 503 });
  }

  const { system, userPrompt } = buildPrompt({
    fieldType:       body.field_type      ?? "other",
    fieldLabel:      body.field_label     ?? "",
    jobTitle:        body.job_title       ?? "",
    company:         body.company         ?? "",
    jobDescription:  body.job_description ?? "",
    currentValue:    body.current_value   ?? "",
    fullName:        (profile?.full_name       as string | null) ?? "",
    baseCv:          (profile?.base_cv         as string | null) ?? "",
    targetRoles:     (profile?.target_roles    as string[])      ?? [],
    yearsExperience: (profile?.years_experience as number | null) ?? null,
    seniority:       (profile?.seniority       as string | null) ?? null,
    email:           (profile?.email           as string | null) ?? "",
    mode:            body.mode === "improve" ? "improve" : "suggest",
  });

  let suggestion: string;
  try {
    suggestion = await callProvider({
      provider:       route.provider,
      apiKey:         route.apiKey,
      model:          route.model,
      system,
      user:           userPrompt,
      maxTokens:      SUGGEST_MAX_TOKENS,
      json:           false,
      fallbackModels: route.fallbackModels,
    });
  } catch (err) {
    await refund();
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI error" }, { status: 502 });
  }

  // Log usage (fire-and-forget — don't block the response).
  Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (admin.from("usage_log") as any).insert({
      user_id:       userId,
      activity_type: "suggest",
      credits_used:  cost,
    }),
    admin.rpc("increment_daily_usage", { p_field: "suggest_credits_used", p_user: userId, p_amount: cost }),
  ]).catch(() => {});

  return NextResponse.json({
    suggestion:       suggestion.trim(),
    credits_used:     cost,
    daily_credits:    dailyCredits - (dailyCredits >= cost ? cost : 0),
    topup_credits:    topupCredits,
    bonus_credits:    bonusCredits,
  });
}
