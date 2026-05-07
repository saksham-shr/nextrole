/**
 * POST /api/extension/suggest
 * Auth: Bearer <supabase_jwt>
 *
 * Generates AI-powered text for a job application form field (Starter+ only).
 * Uses Gemini Flash Lite via autofill route. Cost: 8 credits.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserFromJWT } from "@/lib/extension-auth";
import { callProvider } from "@/lib/ai/providers";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { canAccess, CREDIT_COSTS, STARTER_DAILY_LIMITS } from "@/lib/ai/gates";
import { resolveRoute, type AIRoute } from "@/lib/ai/router";
import type { UserTier } from "@/lib/db/types";

const SUGGEST_MAX_TOKENS = 600;

function buildPrompt(opts: {
  fieldType: string; fieldLabel: string; jobTitle: string; company: string;
  jobDescription: string; currentValue: string; fullName: string; baseCv: string;
  targetRoles: string[]; yearsExperience: number | null; seniority: string | null; email: string;
}) {
  const { fieldType, fieldLabel, jobTitle, company, jobDescription, currentValue, fullName, baseCv, targetRoles, yearsExperience, seniority, email } = opts;

  const cvCtx      = baseCv       ? `\nMy CV:\n${baseCv.slice(0, 3000)}`     : "";
  const jobCtx     = jobTitle     ? `\nJob: ${jobTitle} at ${company}${jobDescription ? `\nJD: ${jobDescription.slice(0, 1000)}` : ""}` : "";
  const profileCtx = [fullName && `Name: ${fullName}`, email && `Email: ${email}`, yearsExperience && `Experience: ${yearsExperience}yr`, seniority, targetRoles.length > 0 && `Roles: ${targetRoles.slice(0, 3).join(", ")}`].filter(Boolean).join(" | ");
  const continueNote = currentValue.length > 20 ? `\nExisting: "${currentValue.slice(0, 200)}" — expand or improve.` : "";

  const system = `You are a professional job application writer. Write concise, authentic first-person content for a form field. Return ONLY the text — no preamble, no quotes.`;

  let userPrompt: string;
  switch (fieldType) {
    case "cover_letter":
      userPrompt = `Write a tailored cover letter (3-4 paragraphs, under 320 words) for this application.\n${profileCtx}${cvCtx}${jobCtx}${continueNote}`;
      break;
    case "why_company":
      userPrompt = `Write 2-3 sentences for "${fieldLabel || "Why do you want to work here?"}". Be specific about this company and role.\n${profileCtx}${jobCtx}`;
      break;
    case "about_yourself":
      userPrompt = `Write a 2-3 sentence professional intro for "${fieldLabel || "Tell us about yourself"}".\n${profileCtx}${cvCtx}${jobCtx}`;
      break;
    default:
      userPrompt = `Fill in the field "${fieldLabel || fieldType}" with a concise professional response.\n${profileCtx}${cvCtx}${jobCtx}${continueNote}`;
  }

  return { system, userPrompt };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`ext-suggest:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveUserFromJWT(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: profile } = await admin
    .from("profiles")
    .select("full_name, email, base_cv, target_roles, years_experience, seniority, tier, credits_remaining")
    .eq("id", userId).single();

  const tier = ((profile?.tier as string | null) ?? "free") as UserTier;

  // Autofill requires Starter+
  if (!canAccess(tier as Parameters<typeof canAccess>[0], "autofill")) {
    return NextResponse.json({ error: "Autofill requires Starter plan or higher", upgrade: true }, { status: 402 });
  }

  // Starter: enforce 1 autofill/day
  if (tier === "starter") {
    const { data: usageRow } = await admin
      .from("daily_usage").select("autofills_count").eq("user_id", userId).eq("date", today).maybeSingle();
    const usedToday = (usageRow as { autofills_count?: number } | null)?.autofills_count ?? 0;
    if (usedToday >= STARTER_DAILY_LIMITS.autofills) {
      return NextResponse.json({ error: "Daily autofill limit reached — upgrade to Pro for unlimited", upgrade: true }, { status: 402 });
    }
  }

  // Deduct credits
  const { data: ok } = await admin.rpc("deduct_credit", { p_user_id: userId, p_amount: CREDIT_COSTS.autofill });
  if (!ok) return NextResponse.json({ error: "No credits remaining", upgrade: true }, { status: 402 });

  // Increment daily usage
  await admin.rpc("increment_daily_usage", { p_field: "autofills", p_user: userId });

  let route: AIRoute;
  try { route = resolveRoute("autofill"); }
  catch { return NextResponse.json({ error: "AI not configured" }, { status: 503 }); }

  const body = await req.json().catch(() => ({})) as {
    field_type?: string; field_label?: string; job_title?: string;
    company?: string; job_description?: string; current_value?: string;
  };

  const { system, userPrompt } = buildPrompt({
    fieldType: body.field_type ?? "other", fieldLabel: body.field_label ?? "",
    jobTitle: body.job_title ?? "", company: body.company ?? "",
    jobDescription: body.job_description ?? "", currentValue: body.current_value ?? "",
    fullName: (profile?.full_name as string | null) ?? "", baseCv: (profile?.base_cv as string | null) ?? "",
    targetRoles: (profile?.target_roles as string[] | null) ?? [],
    yearsExperience: (profile?.years_experience as number | null) ?? null,
    seniority: (profile?.seniority as string | null) ?? null,
    email: (profile?.email as string | null) ?? "",
  });

  let suggestion: string;
  try {
    suggestion = await callProvider({
      provider: route.provider,
      apiKey: route.apiKey, model: route.model,
      system, user: userPrompt, maxTokens: SUGGEST_MAX_TOKENS,
      json: false, fallbackModels: route.fallbackModels,
    });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI error" }, { status: 502 });
  }

  admin.from("usage_log").insert({ user_id: userId, task_type: "autofill", model: route.model, credits_used: CREDIT_COSTS.autofill, byok: false }).then(() => {});

  return NextResponse.json({ suggestion: suggestion.trim() });
}
