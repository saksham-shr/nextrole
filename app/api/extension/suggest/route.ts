/**
 * POST /api/extension/suggest
 * Auth: Bearer <supabase_jwt>
 *
 * Generates AI-powered text for a job application form field (Starter+ only).
 * Uses Gemini Flash Lite via autofill route. Cost: 2 credits.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { callProvider } from "@/lib/ai/providers";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { canAccess, CREDIT_COSTS, STARTER_DAILY_AUTOFILL_CREDIT_CAP } from "@/lib/ai/gates";
import { resolveRoute, type AIRoute } from "@/lib/ai/router";
import type { UserTier } from "@/lib/db/types";

const SUGGEST_MAX_TOKENS = 600;

/**
 * Credit model:
 *  Free    → blocked (canAccess = false)
 *  Starter → 2 credits per AI call; daily cap of 16 credits (8 suggestions/day)
 *  Pro     → 2 credits per AI call; no daily cap
 */

function buildPrompt(opts: {
  fieldType: string; fieldLabel: string; jobTitle: string; company: string;
  jobDescription: string; currentValue: string; fullName: string; baseCv: string;
  targetRoles: string[]; yearsExperience: number | null; seniority: string | null; email: string;
  mode: "suggest" | "improve";
}) {
  const { fieldType, fieldLabel, jobTitle, company, jobDescription, currentValue, fullName, baseCv, targetRoles, yearsExperience, seniority, email, mode } = opts;

  const cvCtx      = baseCv   ? `\nMy CV:\n${baseCv.slice(0, 3000)}`   : "";
  const jobCtx     = jobTitle ? `\nJob: ${jobTitle} at ${company}${jobDescription ? `\nJD: ${jobDescription.slice(0, 1000)}` : ""}` : "";
  const profileCtx = [fullName && `Name: ${fullName}`, email && `Email: ${email}`, yearsExperience && `Experience: ${yearsExperience}yr`, seniority, targetRoles.length > 0 && `Roles: ${targetRoles.slice(0, 3).join(", ")}`].filter(Boolean).join(" | ");

  const system = `You are a professional job application writer. Write concise, authentic first-person content for a form field. Return ONLY the text — no preamble, no quotes.`;

  // "improve" mode: rewrite/expand what the user already wrote
  if (mode === "improve" && currentValue.length > 10) {
    const userPrompt = `The user wrote this draft for the "${fieldLabel || fieldType}" field:\n\n"${currentValue.slice(0, 600)}"\n\nRewrite and improve it — make it more specific, professional, and tailored to the role. Keep the same voice but strengthen it. Do NOT repeat their text verbatim.\n${profileCtx}${jobCtx}`;
    return { system, userPrompt };
  }

  // "suggest" mode: fresh generation
  let userPrompt: string;
  switch (fieldType) {
    case "cover_letter":
      userPrompt = `Write a tailored cover letter (3-4 paragraphs, under 320 words) for this application.\n${profileCtx}${cvCtx}${jobCtx}`;
      break;
    case "why_company":
      userPrompt = `Write 2-3 sentences for "${fieldLabel || "Why do you want to work here?"}". Be specific about this company and role.\n${profileCtx}${jobCtx}`;
      break;
    case "about_yourself":
      userPrompt = `Write a 2-3 sentence professional intro for "${fieldLabel || "Tell us about yourself"}".\n${profileCtx}${cvCtx}${jobCtx}`;
      break;
    default:
      userPrompt = `Fill in the field "${fieldLabel || fieldType}" with a concise professional response.\n${profileCtx}${cvCtx}${jobCtx}`;
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

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const body = await req.json().catch(() => ({})) as {
    field_type?: string; field_label?: string; job_title?: string;
    company?: string; job_description?: string; current_value?: string;
    /** "improve" = rewrite/expand current_value; "suggest" = fresh generation */
    mode?: "suggest" | "improve";
  };

  const [{ data: profile }] = await Promise.all([
    admin.from("profiles")
      .select("full_name, email, base_cv, target_roles, years_experience, seniority, tier, credits_remaining")
      .eq("id", userId).single(),
  ]);

  const tier = ((profile?.tier as string | null) ?? "free") as UserTier;

  // Autofill requires Starter+
  if (!canAccess(tier as Parameters<typeof canAccess>[0], "autofill")) {
    return NextResponse.json({ error: "Autofill requires Starter plan or higher", upgrade: true }, { status: 402 });
  }

  // ── Starter: 2 credits per call, daily cap of 16 credits ─────────────────
  let spentToday = 0;
  if (tier === "starter") {
    // Check daily credit spend on autofill
    const { data: usageRow } = await admin
      .from("daily_usage").select("autofill_credits_used").eq("user_id", userId).eq("date", today).maybeSingle();
    spentToday = (usageRow as { autofill_credits_used?: number } | null)?.autofill_credits_used ?? 0;
    if (spentToday + CREDIT_COSTS.autofill > STARTER_DAILY_AUTOFILL_CREDIT_CAP) {
      return NextResponse.json({ error: `Daily AI suggestion limit reached (${STARTER_DAILY_AUTOFILL_CREDIT_CAP} credits/day) — upgrade to Pro for unlimited`, upgrade: true }, { status: 402 });
    }
    // Check remaining credits
    const creditsLeft = (profile?.credits_remaining as number | null) ?? 0;
    if (creditsLeft < CREDIT_COSTS.autofill) {
      return NextResponse.json({ error: "No credits remaining — top up or upgrade your plan", upgrade: true }, { status: 402 });
    }
  }

  // ── Pro: 2 credits per AI call, no daily cap ──────────────────────────────
  if (tier === "pro") {
    const creditsLeft = (profile?.credits_remaining as number | null) ?? 0;
    if (creditsLeft < CREDIT_COSTS.autofill) {
      return NextResponse.json({ error: "No credits remaining — top up your plan", upgrade: true }, { status: 402 });
    }
  }

  let route: AIRoute;
  try { route = resolveRoute("autofill"); }
  catch { return NextResponse.json({ error: "AI not configured" }, { status: 503 }); }

  const { system, userPrompt } = buildPrompt({
    fieldType: body.field_type ?? "other", fieldLabel: body.field_label ?? "",
    jobTitle: body.job_title ?? "", company: body.company ?? "",
    jobDescription: body.job_description ?? "", currentValue: body.current_value ?? "",
    fullName: (profile?.full_name as string | null) ?? "", baseCv: (profile?.base_cv as string | null) ?? "",
    targetRoles: (profile?.target_roles as string[] | null) ?? [],
    yearsExperience: (profile?.years_experience as number | null) ?? null,
    seniority: (profile?.seniority as string | null) ?? null,
    email: (profile?.email as string | null) ?? "",
    mode: body.mode === "improve" ? "improve" : "suggest",
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
    // AI failed — no credits deducted
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI error" }, { status: 502 });
  }

  // ── AI succeeded — post-success accounting ────────────────────────────────
  let creditsCharged = 0;

  if (tier === "starter" || tier === "pro") {
    // Deduct 2 credits per AI call for both tiers
    await admin.rpc("deduct_credit", { p_user_id: userId, p_amount: CREDIT_COSTS.autofill });
    await admin.rpc("increment_daily_usage", { p_field: "autofills", p_user: userId });
    // Track daily credit spend for Starter cap enforcement
    if (tier === "starter") {
      await admin.from("daily_usage")
        .upsert({ user_id: userId, date: today, autofill_credits_used: spentToday + CREDIT_COSTS.autofill }, { onConflict: "user_id,date" })
        .then(() => {});
    }
    creditsCharged = CREDIT_COSTS.autofill;
  }

  admin.from("usage_log").insert({
    user_id: userId, task_type: "autofill", model: route.model,
    credits_used: creditsCharged, byok: false,
  }).then(() => {});

  return NextResponse.json({ suggestion: suggestion.trim() });
}
