/**
 * POST /api/extension/tailor
 * Auth: Bearer <extension token>
 *
 * Single-AI-call multi-field tailoring for a job application.
 *
 * Request body:
 * {
 *   job_id?:        string   // optional â€” pulls evaluation + job_description from DB
 *   evaluation_id?: string   // optional â€” pulls eval strengths/gaps/personalization
 *   jobTitle?:      string   // fallback if no job_id
 *   company?:       string
 *   jobDescription?:string
 *   fields_needed:  ("cover_letter" | "why_company" | "about_yourself" |
 *                    "experience" | "additional_info")[]
 * }
 *
 * Response (200):
 * {
 *   answers: { [field_type]: string },
 *   experience_bullets?: { [company]: string[] },  // tailored to JD
 *   skills_to_emphasize?: string[],                 // top 5â€“8 from profile matching JD
 *   tier:    "starter" | "pro",
 *   tailor_sessions_today: number,
 *   credits_remaining?:    number
 * }
 *
 * Tier gating:
 *   free    â†’ 403 with "upgrade" hint
 *   starter â†’ 1 tailor session per UTC day (counter on daily_usage)
 *   pro     â†’ CREDIT_COSTS.tailor credits per session (deduct_credit RPC)
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { callProvider } from "@/lib/ai/providers";
import { resolveRoute } from "@/lib/ai/router";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { CREDIT_COSTS, STARTER_DAILY_TAILOR_CAP, canAccess } from "@/lib/ai/gates";
import { reserveExtensionAiCharge } from "@/lib/extension-ai";
import { checkReferralThreshold } from "@/lib/credits/grant";

const ALLOWED_FIELDS = new Set([
  "cover_letter", "why_company", "about_yourself", "experience", "additional_info",
]);

const SYSTEM_PROMPT = `You are a professional job application writer.
You will receive a candidate's profile + CV, a specific job (title, company, description),
and (optionally) an evaluation that tells you their strengths and gaps for this role.

Your task: write FIRST-PERSON, authentic, concise content for each requested field.
NEVER lie or invent experience the candidate doesn't have. Lean on the eval's
strengths and personalization guidance.

Return ONLY valid JSON. No markdown. No code fences.

Use this exact shape (omit any key the caller didn't request):
{
  "answers": {
    "cover_letter":   "<3â€“4 paragraphs, under 280 words>",
    "why_company":    "<2â€“3 sentences, specific to this company/role>",
    "about_yourself": "<2â€“3 sentences professional intro>",
    "experience":     "<2â€“4 sentences highlighting the most relevant past work>",
    "additional_info":"<1â€“2 sentences with anything genuinely worth flagging>"
  },
  "experience_bullets": {
    "<company name>": ["<rewritten bullet 1>", "<rewritten bullet 2>"]
  },
  "skills_to_emphasize": ["<skill1>", "<skill2>", ...]
}

Rules:
- experience_bullets: rewrite the candidate's 1â€“2 most relevant past jobs as JD-aligned bullets
- skills_to_emphasize: pick 5â€“8 of the candidate's skills that match the JD keywords
- cover_letter must NOT include placeholders like "[Company]" â€” use the real name
- Speak as the candidate ("I'm a backend engineer withâ€¦")`;

interface EvalContent {
  role_fit?: { strengths?: string[]; concerns?: string[] };
  cv_match?: { strong_matches?: string[]; gaps?: string[] };
  personalization_guidance?: {
    angle?: string;
    tactics?: string[];
    hooks?: string[];
  };
}

function buildUserPrompt(opts: {
  profile: Record<string, unknown>;
  jobTitle: string;
  company: string;
  jobDescription: string;
  baseCv: string;
  evaluation: EvalContent | null;
  fields: string[];
}) {
  const { profile, jobTitle, company, jobDescription, baseCv, evaluation, fields } = opts;

  const profileSummary = [
    profile.full_name && `Name: ${profile.full_name}`,
    profile.seniority && `Seniority: ${profile.seniority}`,
    profile.years_experience && `Experience: ${profile.years_experience} yrs`,
    Array.isArray(profile.target_roles) && (profile.target_roles as string[]).length > 0
      && `Targeting: ${(profile.target_roles as string[]).slice(0, 3).join(", ")}`,
    Array.isArray(profile.skills) && (profile.skills as string[]).length > 0
      && `Skills: ${(profile.skills as string[]).slice(0, 15).join(", ")}`,
  ].filter(Boolean).join("\n");

  const recentWork = Array.isArray(profile.work_experience)
    ? (profile.work_experience as Record<string, unknown>[])
        .slice(0, 3)
        .map((w) => `- ${w.role} @ ${w.company} (${w.start ?? "?"}â€“${w.current ? "Present" : (w.end ?? "?")}): ${w.description ?? ""}`)
        .join("\n")
    : "";

  const evalBlock: string[] = [];
  if (evaluation) {
    const strengths = evaluation.cv_match?.strong_matches ?? evaluation.role_fit?.strengths ?? [];
    const gaps      = evaluation.cv_match?.gaps ?? evaluation.role_fit?.concerns ?? [];
    const angle     = evaluation.personalization_guidance?.angle ?? "";
    const tactics   = evaluation.personalization_guidance?.tactics ?? [];
    const hooks     = evaluation.personalization_guidance?.hooks ?? [];

    if (strengths.length) evalBlock.push(`Strengths for this role:\n- ${strengths.slice(0, 5).join("\n- ")}`);
    if (gaps.length)      evalBlock.push(`Gaps to address gracefully:\n- ${gaps.slice(0, 3).join("\n- ")}`);
    if (angle)            evalBlock.push(`Personalization angle: ${angle}`);
    if (tactics.length)   evalBlock.push(`Tactics:\n- ${tactics.slice(0, 4).join("\n- ")}`);
    if (hooks.length)     evalBlock.push(`Hooks:\n- ${hooks.slice(0, 3).join("\n- ")}`);
  }

  return [
    `JOB`,
    `Title: ${jobTitle}`,
    `Company: ${company}`,
    `Description:\n${jobDescription.slice(0, 2500)}`,
    ``,
    `CANDIDATE PROFILE`,
    profileSummary,
    recentWork ? `\nRecent work:\n${recentWork}` : "",
    baseCv ? `\nCV excerpt:\n${baseCv.slice(0, 2500)}` : "",
    ``,
    evalBlock.length > 0 ? `EVALUATION INSIGHTS\n${evalBlock.join("\n\n")}` : "",
    ``,
    `FIELDS REQUESTED: ${fields.join(", ")}`,
    `Always include "experience_bullets" and "skills_to_emphasize" in the response.`,
  ].filter(Boolean).join("\n");
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`ext-tailor:${ip}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;

  // â”€â”€ Parse + validate body â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  let body: Record<string, unknown>;
  try { body = (await req.json()) as Record<string, unknown>; }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const fieldsRaw = Array.isArray(body.fields_needed) ? body.fields_needed : [];
  const fields = (fieldsRaw as unknown[])
    .filter((f): f is string => typeof f === "string" && ALLOWED_FIELDS.has(f));

  if (fields.length === 0) {
    return NextResponse.json({ error: "fields_needed must contain at least one allowed field type" }, { status: 400 });
  }

  const jobId        = typeof body.job_id === "string" ? body.job_id : null;
  const evalId       = typeof body.evaluation_id === "string" ? body.evaluation_id : null;
  let   jobTitle     = typeof body.jobTitle === "string" ? body.jobTitle : "";
  let   company      = typeof body.company === "string" ? body.company : "";
  let   jobDescription = typeof body.jobDescription === "string" ? body.jobDescription : "";

  const admin = createAdminClient();

  // â”€â”€ Tier check + daily/credit gating â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const { data: profile } = await admin
    .from("profiles")
    .select("tier, daily_credits, topup_credits, full_name, seniority, years_experience, target_roles, skills, work_experience, base_cv")
    .eq("id", userId)
    .single();

  if (!profile) return NextResponse.json({ error: "Profile not found" }, { status: 404 });

  const tier = (profile.tier ?? "free") as "free" | "starter" | "pro";
  if (!canAccess(tier, "tailor")) {
    return NextResponse.json({
      error: "AI tailoring is a Starter / Pro feature. Upgrade to unlock.",
      upgrade: true,
    }, { status: 402 });
  }

  // Check today's usage
  const today = new Date().toISOString().slice(0, 10);
  const { data: usage } = await admin
    .from("daily_usage")
    .select("tailor_sessions")
    .eq("user_id", userId)
    .eq("date", today)
    .maybeSingle();

  const sessionsToday = usage?.tailor_sessions ?? 0;

  if (tier === "starter") {
    if (sessionsToday >= STARTER_DAILY_TAILOR_CAP) {
      return NextResponse.json({
        error: `Daily tailor limit reached (${STARTER_DAILY_TAILOR_CAP}/day on Starter). Resets at midnight UTC. Upgrade to Pro for unlimited credit-bound tailoring.`,
        cap_reached: true,
        tailor_sessions_today: sessionsToday,
      }, { status: 429 });
    }
  } else if (tier === "pro") {
    const creditsLeft = ((profile.daily_credits ?? 0) as number) + ((profile.topup_credits ?? 0) as number);
    if (creditsLeft < CREDIT_COSTS.tailor) {
      return NextResponse.json({
        error: `Insufficient credits (${CREDIT_COSTS.tailor} required). Top up or wait for daily reset.`,
        insufficient_credits: true,
      }, { status: 402 });
    }
  }

  // Atomic reservation BEFORE the AI call. Starter increments
  // tailor_sessions (capped at STARTER_DAILY_TAILOR_CAP); Pro deducts
  // CREDIT_COSTS.tailor via deduct_credit. Either way, two parallel
  // requests serialize on the same RPC instead of both passing the
  // read-only checks above and both burning provider tokens.
  let reservation;
  try {
    reservation = await reserveExtensionAiCharge(admin, {
      userId,
      tier,
      task: "tailor",
      starterUsageField: "tailor_sessions",
      starterDailyLimit: STARTER_DAILY_TAILOR_CAP,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not reserve";
    if (msg === "DAILY_LIMIT") {
      return NextResponse.json({
        error: `Daily tailor limit reached (${STARTER_DAILY_TAILOR_CAP}/day on Starter). Resets at midnight UTC. Upgrade to Pro for unlimited credit-bound tailoring.`,
        cap_reached: true,
        tailor_sessions_today: sessionsToday,
      }, { status: 429 });
    }
    if (msg === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({
        error: `Insufficient credits (${CREDIT_COSTS.tailor} required). Top up or wait for daily reset.`,
        insufficient_credits: true,
      }, { status: 402 });
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  // â”€â”€ Pull job + evaluation context if IDs were given â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  if (jobId && (!jobTitle || !company || !jobDescription)) {
    const { data: job } = await admin
      .from("jobs")
      .select("title, company, description")
      .eq("id", jobId)
      .eq("user_id", userId)
      .maybeSingle();
    if (job) {
      jobTitle       = jobTitle       || (job.title       as string);
      company        = company        || (job.company     as string);
      jobDescription = jobDescription || (job.description as string ?? "");
    }
  }

  let evaluation: EvalContent | null = null;
  if (evalId) {
    const { data: evalRow } = await admin
      .from("evaluations")
      .select("role_fit, cv_match, personalization_guidance")
      .eq("id", evalId)
      .eq("user_id", userId)
      .maybeSingle();
    if (evalRow) {
      evaluation = {
        role_fit:                 evalRow.role_fit as EvalContent["role_fit"]                 ?? undefined,
        cv_match:                 evalRow.cv_match as EvalContent["cv_match"]                 ?? undefined,
        personalization_guidance: evalRow.personalization_guidance as EvalContent["personalization_guidance"] ?? undefined,
      };
    }
  } else if (jobId) {
    // No explicit eval â€” try to find the most recent for this job
    const { data: evalRow } = await admin
      .from("evaluations")
      .select("role_fit, cv_match, personalization_guidance")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (evalRow) {
      evaluation = {
        role_fit:                 evalRow.role_fit as EvalContent["role_fit"]                 ?? undefined,
        cv_match:                 evalRow.cv_match as EvalContent["cv_match"]                 ?? undefined,
        personalization_guidance: evalRow.personalization_guidance as EvalContent["personalization_guidance"] ?? undefined,
      };
    }
  }

  if (!jobTitle || !company) {
    return NextResponse.json({
      error: "Job title and company are required (pass job_id or jobTitle+company)",
    }, { status: 400 });
  }

  // â”€â”€ Call AI â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  try {
    const route = resolveRoute("tailor");
    const userPrompt = buildUserPrompt({
      profile: profile as Record<string, unknown>,
      jobTitle, company, jobDescription,
      baseCv: (profile.base_cv as string | null) ?? "",
      evaluation,
      fields,
    });

    let raw: string;
    try {
      raw = await callProvider({
        provider:       route.provider,
        apiKey:         route.apiKey,
        model:          route.model,
        system:         SYSTEM_PROMPT,
        user:           userPrompt,
        maxTokens:      1800,
        json:           true,
        fallbackModels: route.fallbackModels,
      });
    } catch (err) {
      await reservation.refund();
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `Tailor failed: ${msg}` }, { status: 502 });
    }

    let parsed: Record<string, unknown>;
    try { parsed = JSON.parse(raw); }
    catch {
      const m = raw.match(/\{[\s\S]*\}/);
      try { parsed = m ? JSON.parse(m[0]) : {}; }
      catch {
        await reservation.refund();
        return NextResponse.json({ error: "AI returned an invalid response" }, { status: 502 });
      }
    }

    await admin.from("usage_log").insert({
      user_id: userId,
      task_type: "tailor",
      model: route.model,
      credits_used: reservation.charged,
    });

    // Check referral threshold after credit usage (fire-and-forget)
    checkReferralThreshold(admin, userId).catch(() => {});

    return NextResponse.json({
      answers:              (parsed.answers ?? {}) as Record<string, string>,
      experience_bullets:   (parsed.experience_bullets ?? {}) as Record<string, string[]>,
      skills_to_emphasize:  Array.isArray(parsed.skills_to_emphasize) ? parsed.skills_to_emphasize : [],
      tier,
      tailor_sessions_today: sessionsToday + 1,
      credits_remaining:     tier === "pro" ? Math.max(0, ((profile.daily_credits ?? 0) + (profile.topup_credits ?? 0)) - CREDIT_COSTS.tailor) : undefined,
    });
  } catch (err) {
    await reservation.refund();
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Tailor failed: ${msg}` }, { status: 500 });
  }
}
