import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { callProvider, parseJSON } from "@/lib/ai/providers";
import { RESUME_SYSTEM_PROMPT, buildResumePrompt, buildGenericResumePrompt } from "@/lib/resume/prompt";
import { renderResumeHtml } from "@/lib/resume/template";
import type { ResumeData } from "@/lib/resume/template";
import { requireFeature } from "@/lib/ai/guard";
import { resolveRoute, type AIRoute } from "@/lib/ai/router";
import { CREDIT_COSTS, PREMIUM_RESUME_LIFETIME_CAP } from "@/lib/ai/gates";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkReferralThreshold } from "@/lib/credits/grant";
import { isSameOrigin } from "@/lib/security/csrf";

export const maxDuration = 120;

// Token caps by resume type
const STANDARD_MAX_TOKENS = 3500;
const PREMIUM_MAX_TOKENS  = 4000;

export async function POST(request: NextRequest) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const ip = getClientIp(request);
  const rl = await rateLimit(`resume:${ip}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await request.json().catch(() => null) as {
    job_id?: string;
    evaluation_id?: string;
    premium?: boolean;
    // Generic mode — no job_id required
    target_role?: string;
    target_company?: string;
  } | null;
  if (!body) return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });

  const isPremium = !!body.premium;
  const featureKey = isPremium ? "resume_premium" : "resume_standard";

  const guard = await requireFeature(featureKey);
  if (guard instanceof NextResponse) return guard;
  const { userId, tier, isAdmin } = guard;

  const supabase = await createClient();

  const jobId = body.job_id ?? null;
  const isGeneric = !jobId;

  // Generic mode requires target_role
  if (isGeneric && !body.target_role?.trim()) {
    return NextResponse.json({ error: "Provide job_id for a targeted resume or target_role for a generic one" }, { status: 400 });
  }

  let job: { title: string; company: string; description: string | null } | null = null;
  if (jobId) {
    const { data } = await supabase.from("jobs").select("title, company, description").eq("id", jobId).eq("user_id", userId).single();
    if (!data) return NextResponse.json({ error: "Job not found" }, { status: 404 });
    if (!data.description) return NextResponse.json({ error: "Job has no description — paste the JD first" }, { status: 400 });
    job = data;
  }

  const { data: profile, error: profileError } = await supabase.from("profiles").select("base_cv, credits_remaining").eq("id", userId).single();
  if (profileError) {
    console.error("[resume] profile query failed:", profileError.message, profileError.code, profileError.details);
    return NextResponse.json({ error: "Could not load your profile — please try again" }, { status: 500 });
  }
  if (!profile?.base_cv?.trim()) return NextResponse.json({ error: "No CV in your profile — add it in Settings first" }, { status: 400 });

  // Premium resume lifetime cap check
  if (isPremium && !isAdmin) {
    const { count } = await supabase
      .from("resumes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("status", "final"); // only count completed premium resumes
    if ((count ?? 0) >= PREMIUM_RESUME_LIFETIME_CAP) {
      return NextResponse.json({ error: "PREMIUM_RESUME_CAP_REACHED", cap: PREMIUM_RESUME_LIFETIME_CAP }, { status: 403 });
    }
  }

  // Fetch prior eval data for delta tailoring (only for job-tied resumes)
  let cvMatch: { strengths?: string[]; gaps?: string[] } | null = null;
  let personGuidance: { angle?: string; tactics?: string[] } | null = null;
  if (!isGeneric) {
    let evalData: { cv_match: Record<string, unknown> | null; personalization_guidance: Record<string, unknown> | null } | null = null;
    if (body.evaluation_id) {
      const { data } = await supabase.from("evaluations").select("cv_match, personalization_guidance").eq("id", body.evaluation_id).eq("user_id", userId).single();
      evalData = data ?? null;
    } else if (jobId) {
      const { data } = await supabase.from("evaluations").select("cv_match, personalization_guidance").eq("job_id", jobId).eq("user_id", userId).order("created_at", { ascending: false }).limit(1).single();
      evalData = data ?? null;
    }
    cvMatch = evalData?.cv_match as { strengths?: string[]; gaps?: string[] } | null;
    personGuidance = evalData?.personalization_guidance as { angle?: string; tactics?: string[] } | null;
  }

  // Resolve AI route based on premium vs standard
  let route: AIRoute;
  try {
    route = resolveRoute(isPremium ? "resume_premium" : "resume_standard");
  } catch (err) {
    return NextResponse.json({ error: (err instanceof Error ? err.message : "AI route error") }, { status: 503 });
  }

  // Pre-flight credit check — deduction happens after AI succeeds to avoid charging for failures
  if (!isAdmin && tier !== "free") {
    const creditAmount = isPremium ? CREDIT_COSTS.resume_premium : CREDIT_COSTS.resume_standard;
    const creditsLeft = profile?.credits_remaining ?? 0;
    if (creditsLeft < creditAmount) {
      return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
    }
  }

  const userPrompt = isGeneric
    ? buildGenericResumePrompt({
        target_role: body.target_role!,
        target_company: body.target_company,
        base_cv: profile.base_cv,
      })
    : buildResumePrompt({
        title: job!.title, company: job!.company, description: job!.description!,
        base_cv: profile.base_cv,
        eval_strengths: cvMatch?.strengths, eval_gaps: cvMatch?.gaps,
        personalization_angle: personGuidance?.angle, personalization_tactics: personGuidance?.tactics,
      });

  let rawOutput: string;
  try {
    rawOutput = await callProvider({
      provider: route.provider,
      apiKey: route.apiKey, model: route.model,
      system: RESUME_SYSTEM_PROMPT, user: userPrompt,
      maxTokens: isPremium ? PREMIUM_MAX_TOKENS : STANDARD_MAX_TOKENS,
      cache: route.provider === "anthropic",
      json: true,
      fallbackModels: route.fallbackModels,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "AI call failed";
    console.error("[resume] AI call failed:", message);
    return NextResponse.json({ error: "Resume generation failed — please try again in a moment." }, { status: 502 });
  }

  let resumeData: ResumeData;
  try {
    const parsed = parseJSON(rawOutput) as ResumeData;
    if (!parsed || typeof parsed !== "object") throw new Error("Not an object");
    if (!Array.isArray(parsed.experience)) parsed.experience = [];
    resumeData = parsed;
  } catch (parseErr) {
    console.error("[resume] JSON parse failed:", (parseErr as Error).message);
    console.error("[resume] raw AI output (first 500 chars):", rawOutput.slice(0, 500));
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  // AI succeeded — NOW deduct credits / increment usage
  const creditAmount = isPremium ? CREDIT_COSTS.resume_premium : CREDIT_COSTS.resume_standard;
  console.log(`[resume] credit deduction: tier=${tier} isAdmin=${isAdmin} isPremium=${isPremium} amount=${creditAmount} userId=${userId}`);
  if (!isAdmin) {
    const admin = createAdminClient();
    const { data: ok, error } = await admin.rpc("deduct_credit", {
      p_user_id: userId,
      p_amount: creditAmount,
    });
    console.log(`[resume] deduct_credit result: ok=${ok} error=${error?.message ?? null}`);
    if (error || ok !== true) {
      return NextResponse.json({ error: "NO_CREDITS" }, { status: 402 });
    }
  } else {
    console.log("[resume] admin user — credit deduction skipped");
  }

  const html = renderResumeHtml(resumeData);
  const coverage = Math.max(0, Math.min(100, resumeData.coverage ?? 0));

  const resumeTitle = isGeneric
    ? body.target_company
      ? `${body.target_role} at ${body.target_company}`
      : `${body.target_role} (Generic)`
    : `${job!.title} at ${job!.company}`;

  const { data: resume, error: resumeInsertError } = await supabase.from("resumes").insert({
    user_id: userId, job_id: jobId,
    title: resumeTitle,
    content: JSON.stringify(resumeData), html, coverage,
    status: isPremium ? "final" : "draft",
    source: isGeneric ? "custom" : "ai",
    version: 1,
  }).select("id").single();

  if (resumeInsertError || !resume?.id) {
    console.error("[resume] DB insert failed:", resumeInsertError?.message, resumeInsertError?.details, resumeInsertError?.hint);
    return NextResponse.json({ error: "Failed to save resume — please try again" }, { status: 500 });
  }

  {
    const adminForLog = createAdminClient();
    const { error: logErr } = await adminForLog.from("usage_log").insert({
      user_id: userId,
      activity_type: "tailor_resume",
      credits_used: isAdmin ? 0 : creditAmount,
    });
    if (logErr) console.error("[resume] usage_log insert failed:", logErr.message, logErr.code, logErr.details);
  }

  // Check referral threshold after credit usage (fire-and-forget)
  {
    const admin = createAdminClient();
    checkReferralThreshold(admin, userId).catch(() => {});
  }

  return NextResponse.json({ resume_id: resume?.id, coverage, html });
}
