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
import { canAccess, CREDIT_COSTS } from "@/lib/ai/gates";
const STARTER_DAILY_AUTOFILL_CREDIT_CAP = 9999;
import { resolveRoute, type AIRoute } from "@/lib/ai/router";
import type { UserTier } from "@/lib/db/types";

const SUGGEST_MAX_TOKENS = 600;

// Standard fields are free for Starter/Pro. Custom questions (any other field_type) cost 2 credits.
const STANDARD_FIELD_TYPES = new Set([
  "cover_letter", "why_company", "about_yourself", "experience", "additional_info",
]);

/**
 * Credit model:
 *  Free                         â†' blocked (canAccess = false)
 *  Starter / Pro, standard field â†' 0 credits (free autofill)
 *  Starter / Pro, custom field   â†' 2 credits per AI call
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

  const system = `You are a professional job application writer. Write concise, authentic first-person content for a form field. Return ONLY the text  -  no preamble, no quotes.`;

  // "improve" mode: rewrite/expand what the user already wrote
  if (mode === "improve" && currentValue.length > 10) {
    const userPrompt = `The user wrote this draft for the "${fieldLabel || fieldType}" field:\n\n"${currentValue.slice(0, 600)}"\n\nRewrite and improve it  -  make it more specific, professional, and tailored to the role. Keep the same voice but strengthen it. Do NOT repeat their text verbatim.\n${profileCtx}${jobCtx}`;
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
  const rl = await rateLimit(`ext-suggest:${ip}`, 30, 60_000);
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
      .select("full_name, email, base_cv, target_roles, years_experience, seniority, tier, credits_remaining, created_at")
      .eq("id", userId).single(),
  ]);

  const tier = ((profile?.tier as string | null) ?? "free") as UserTier;

  // Free users: 7-day autofill trial from signup date
  if (tier === "free") {
    const daysSinceSignup = profile?.created_at
      ? Math.floor((Date.now() - new Date(profile.created_at as string).getTime()) / 86_400_000)
      : 999;
    if (daysSinceSignup >= 7) {
      return NextResponse.json({ error: "Your 7-day free autofill trial has ended — upgrade to continue", upgrade: true }, { status: 402 });
    }
    // Within trial — fall through, no credit charge
  } else if (!canAccess(tier as Parameters<typeof canAccess>[0], "autofill")) {
    return NextResponse.json({ error: "Autofill requires Starter plan or higher", upgrade: true }, { status: 402 });
  }

  // Custom questions (field_type not in the predefined set) cost 2 credits.
  // Standard fields (cover_letter, why_company, etc.) are free for Starter/Pro.
  const isCustomField = !STANDARD_FIELD_TYPES.has(body.field_type ?? "other");

  let credit_reservation: { refund: () => Promise<void>; charged: number } | null = null;

  if (isCustomField && (tier === "starter" || tier === "pro")) {
    const creditsLeft = (profile?.credits_remaining as number | null) ?? 0;
    if (creditsLeft < CREDIT_COSTS.autofill) {
      return NextResponse.json({ error: "No credits remaining  -  top up your plan", upgrade: true }, { status: 402 });
    }

    const { data: deducted, error: deductErr } = await admin.rpc("deduct_credit", {
      p_user_id: userId,
      p_amount: CREDIT_COSTS.autofill,
    });
    if (deductErr || deducted !== true) {
      return NextResponse.json({ error: "No credits remaining  -  top up your plan", upgrade: true }, { status: 402 });
    }

    const refundCredits = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error: rpcErr } = await (admin.rpc as any)("refund_credit", { p_user_id: userId, p_amount: CREDIT_COSTS.autofill });
        if (!rpcErr) return;
      } catch {}
      try { await admin.rpc("add_credits", { p_user_id: userId, p_amount: CREDIT_COSTS.autofill }); } catch {}
    };

    credit_reservation = { charged: CREDIT_COSTS.autofill, refund: refundCredits };
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
    if (credit_reservation) await credit_reservation.refund();
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI error" }, { status: 502 });
  }

  // Reservation was charged before the AI call. Only the autofills counter
  // is still post-success because it's informational and not gated on.
  if (tier === "starter" || tier === "pro") {
    await admin.rpc("increment_daily_usage", { p_field: "autofills", p_user: userId });
  }

  await admin.from("usage_log").insert({
    user_id: userId,
    activity_type: "autofill",
    credits_used: credit_reservation?.charged ?? 0,
  });

  return NextResponse.json({ suggestion: suggestion.trim() });
}
