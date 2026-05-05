/**
 * POST /api/extension/suggest
 * Auth: Bearer <extension_token>
 *
 * Generates AI-powered text for a job application form field.
 * Uses the user's stored CV + profile as context.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserFromJWT } from "@/lib/extension-auth";
import { decrypt } from "@/lib/crypto";
import { callProvider } from "@/lib/evaluate/providers";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { canAccess } from "@/lib/ai/gates";
import type { UserTier } from "@/lib/db/types";

// ─── Prompts per field type ───────────────────────────────────────────────────

function buildPrompt(opts: {
  fieldType: string;
  fieldLabel: string;
  jobTitle: string;
  company: string;
  jobDescription: string;
  currentValue: string;
  fullName: string;
  baseCv: string;
  targetRoles: string[];
  yearsExperience: number | null;
  seniority: string | null;
  email: string;
}) {
  const { fieldType, fieldLabel, jobTitle, company, jobDescription, currentValue, fullName, baseCv, targetRoles, yearsExperience, seniority, email } = opts;

  const cvContext = baseCv
    ? `\n\nMy resume / CV:\n${baseCv.slice(0, 4000)}`
    : "";

  const jobContext = jobTitle || company
    ? `\n\nJob I'm applying for: ${jobTitle || "this role"} at ${company || "this company"}${jobDescription ? `\n\nJob description excerpt:\n${jobDescription.slice(0, 1500)}` : ""}`
    : "";

  const profileContext = [
    fullName && `My name: ${fullName}`,
    email && `My email: ${email}`,
    yearsExperience && `Years of experience: ${yearsExperience}`,
    seniority && `Seniority level: ${seniority}`,
    targetRoles.length > 0 && `Target roles: ${targetRoles.join(", ")}`,
  ].filter(Boolean).join("\n");

  const continueNote = currentValue.length > 20
    ? `\n\nThe field already contains: "${currentValue.slice(0, 300)}"\nExpand or improve on this.`
    : "";

  const system = `You are a professional job application writing assistant.
Write concise, authentic, first-person content tailored to the specific role and company.
Never use generic filler phrases. Be specific. Sound human and confident.
Return ONLY the text to fill in the field — no preamble, no explanation, no quotes around it.`;

  let userPrompt: string;

  switch (fieldType) {
    case "cover_letter":
      userPrompt = `Write a tailored cover letter (3–4 short paragraphs) for this job application.
Focus on relevant experience, genuine interest in the company, and a clear value proposition.
Keep it under 350 words.
${profileContext}${cvContext}${jobContext}${continueNote}`;
      break;

    case "why_company":
      userPrompt = `Write 2–3 sentences for the field "${fieldLabel || "Why do you want to work here?"}".
Be specific about this company and role — reference what makes this opportunity compelling.
Sound genuine, not generic.
${profileContext}${jobContext}`;
      break;

    case "about_yourself":
      userPrompt = `Write a 2–3 sentence professional introduction for the field "${fieldLabel || "Tell us about yourself"}".
Highlight relevant background and what makes me a strong fit for this role.
${profileContext}${cvContext}${jobContext}`;
      break;

    case "experience":
      userPrompt = `Write 2–3 sentences summarising my most relevant experience for the field "${fieldLabel}".
Be specific and results-oriented.
${profileContext}${cvContext}${jobContext}`;
      break;

    case "additional_info":
      userPrompt = `Write a brief, thoughtful response for the field "${fieldLabel || "Anything else you'd like us to know?"}".
Keep it under 100 words. Highlight something genuinely valuable not covered elsewhere.
${profileContext}${cvContext}${jobContext}`;
      break;

    default:
      userPrompt = `Fill in the application form field: "${fieldLabel || fieldType}".
Write a concise, professional response in first person.
${profileContext}${cvContext}${jobContext}${continueNote}`;
  }

  return { system, userPrompt };
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`ext-suggest:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const resolved = await resolveUserFromJWT(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;

  // Load profile + active AI provider in parallel
  const [{ data: profile }, { data: providers }] = await Promise.all([
    admin
      .from("profiles")
      .select("full_name, email, base_cv, target_roles, years_experience, seniority, tier, subscription_ends_at")
      .eq("id", userId)
      .single(),
    admin
      .from("provider_credentials")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .in("provider", ["anthropic", "openai", "gemini"])
      .order("updated_at", { ascending: false })
      .limit(1),
  ]);

  const tier = ((profile?.tier as string | null) ?? "free") as UserTier;
  const isByok = tier === "byok";

  // Feature gate: AI field fill requires Starter+
  if (!canAccess(tier, "apply")) {
    return NextResponse.json(
      { error: "AI form fill requires Starter plan or higher", upgrade: true },
      { status: 402 },
    );
  }

  // Credit gate (BYOK users have unlimited credits at -1)
  if (!isByok) {
    const { data: ok } = await admin.rpc("deduct_credit", { p_user_id: userId, p_amount: 1 });
    if (!ok) {
      return NextResponse.json(
        { error: "No AI credits remaining — upgrade your NextRole plan", upgrade: true },
        { status: 402 },
      );
    }
  }

  const cred = providers?.[0];
  if (!cred?.encrypted_key) {
    return NextResponse.json(
      { error: "No AI provider configured — add a key in NextRole → Providers" },
      { status: 400 },
    );
  }

  // Parse request body
  const body = await req.json().catch(() => ({})) as {
    field_type?: string;
    field_label?: string;
    job_title?: string;
    company?: string;
    job_description?: string;
    current_value?: string;
  };

  const { system, userPrompt } = buildPrompt({
    fieldType: body.field_type ?? "other",
    fieldLabel: body.field_label ?? "",
    jobTitle: body.job_title ?? "",
    company: body.company ?? "",
    jobDescription: body.job_description ?? "",
    currentValue: body.current_value ?? "",
    fullName: (profile?.full_name as string | null) ?? "",
    baseCv: (profile?.base_cv as string | null) ?? "",
    targetRoles: (profile?.target_roles as string[] | null) ?? [],
    yearsExperience: (profile?.years_experience as number | null) ?? null,
    seniority: (profile?.seniority as string | null) ?? null,
    email: (profile?.email as string | null) ?? "",
  });

  const apiKey = decrypt(cred.encrypted_key);
  const model = cred.model ?? (
    cred.provider === "anthropic" ? "claude-haiku-4-5-20251001" :
    cred.provider === "gemini"    ? "gemini-2.0-flash" :
    "gpt-4o-mini"
  );

  let suggestion: string;
  try {
    suggestion = await callProvider(cred.provider, apiKey, model, system, userPrompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  return NextResponse.json({ suggestion: suggestion.trim() });
}
