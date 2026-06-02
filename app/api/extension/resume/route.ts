/**
 * POST /api/extension/resume
 * Auth: Bearer <supabase_jwt>
 *
 * Generates a standard tailored resume from the browser extension.
 * Free: 1/day via daily_usage. Starter/Pro: 10 credits.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { callProvider, parseJSON } from "@/lib/ai/providers";
import { RESUME_SYSTEM_PROMPT, buildResumePrompt } from "@/lib/resume/prompt";
import { renderResumeHtml } from "@/lib/resume/template";
import type { ResumeData } from "@/lib/resume/template";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { canAccess, FREE_DAILY_LIMITS, CREDIT_COSTS } from "@/lib/ai/gates";
import { resolveRoute, type AIRoute } from "@/lib/ai/router";
import type { UserTier } from "@/lib/db/types";
import { reserveExtensionAiCharge } from "@/lib/extension-ai";

export const maxDuration = 120;

const RESUME_MAX_TOKENS = 2500;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`ext-resume:${ip}`, 10, 60_000);
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
    job_id?: string;
    job_title?: string;
    company?: string;
    job_description?: string;
  };

  let jobTitle = (body.job_title ?? "").trim();
  let company  = (body.company  ?? "").trim();
  let jobDesc  = (body.job_description ?? "").slice(0, 8000);
  let jobId    = body.job_id ?? null;

  if (!jobTitle && !company && !jobId) {
    return NextResponse.json({ error: "job_title or job_id required" }, { status: 400 });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("base_cv, full_name, tier, credits_remaining")
    .eq("id", userId)
    .single();

  const tier = ((profile?.tier as string | null) ?? "free") as UserTier;

  if (!canAccess(tier as Parameters<typeof canAccess>[0], "resume_standard")) {
    return NextResponse.json({ error: "Resume tailoring not available on your plan", upgrade: true }, { status: 402 });
  }

  if (tier === "free") {
    const { data: usageRow } = await admin
      .from("daily_usage").select("resumes").eq("user_id", userId).eq("date", today).maybeSingle();
    const resumesToday = (usageRow as { resumes?: number } | null)?.resumes ?? 0;
    if (resumesToday >= FREE_DAILY_LIMITS.resumes) {
      return NextResponse.json({ error: "Daily resume limit reached â€” upgrade for more", upgrade: true, limit_reached: true }, { status: 402 });
    }
  } else {
    const creditsLeft = (profile?.credits_remaining as number | null) ?? 0;
    if (creditsLeft < CREDIT_COSTS.resume_standard) {
      return NextResponse.json({ error: "No credits remaining", upgrade: true }, { status: 402 });
    }
  }

  if (!profile?.base_cv) {
    return NextResponse.json({ error: "No CV in your profile â€” add it in NextRole â†’ CV first" }, { status: 400 });
  }

  if (jobId) {
    const { data: job } = await admin.from("jobs").select("title, company, description")
      .eq("id", jobId).eq("user_id", userId).single();
    if (job) {
      if (!jobTitle) jobTitle = job.title as string;
      if (!company)  company  = job.company as string;
      if (!jobDesc && job.description) jobDesc = (job.description as string).slice(0, 8000);
    }
  }

  if (!jobId) {
    const { data: newJob } = await admin.from("jobs").insert({
      user_id: userId, title: jobTitle || "Unknown Role", company: company || "Unknown Company",
      description: jobDesc || null, source: "extension_resume", status: "pending",
    }).select("id").single();
    jobId = newJob?.id ?? null;
  }

  let route: AIRoute;
  try { route = resolveRoute("resume_standard"); }
  catch { return NextResponse.json({ error: "AI not configured" }, { status: 503 }); }

  const userPrompt = buildResumePrompt({ title: jobTitle, company, description: jobDesc, base_cv: profile.base_cv as string });

  // Atomically reserve credits / daily usage BEFORE the AI call so parallel
  // requests can't both pass preflight and both burn provider tokens.
  let reservation;
  try {
    reservation = await reserveExtensionAiCharge(admin, {
      userId,
      tier,
      task: "resume_standard",
      freeUsageField: "resumes",
      freeDailyLimit: FREE_DAILY_LIMITS.resumes,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not reserve credits";
    return NextResponse.json(
      { error: msg === "INSUFFICIENT_CREDITS" ? "No credits remaining" :
               msg === "DAILY_LIMIT" ? "Daily resume limit reached â€” upgrade for more" :
               msg, upgrade: true, limit_reached: msg === "DAILY_LIMIT" },
      { status: 402 },
    );
  }

  let rawOutput: string;
  try {
    rawOutput = await callProvider({
      provider: route.provider,
      apiKey: route.apiKey, model: route.model,
      system: RESUME_SYSTEM_PROMPT, user: userPrompt,
      maxTokens: RESUME_MAX_TOKENS, cache: route.provider === "anthropic",
      json: true, fallbackModels: route.fallbackModels,
    });
  } catch (err) {
    await reservation.refund();
    return NextResponse.json({ error: err instanceof Error ? err.message : "AI call failed" }, { status: 502 });
  }

  let resumeData: ResumeData;
  try { resumeData = parseJSON(rawOutput) as ResumeData; }
  catch {
    await reservation.refund();
    return NextResponse.json({ error: "AI returned invalid response" }, { status: 502 });
  }

  const html     = renderResumeHtml(resumeData);
  const coverage = Math.max(0, Math.min(100, (resumeData as { coverage?: number }).coverage ?? 0));

  const { data: resume } = await admin.from("resumes").insert({
    user_id: userId, job_id: jobId, title: `${jobTitle} at ${company}`,
    content: JSON.stringify(resumeData), html, coverage, status: "draft", version: 1,
  }).select("id").single();

  await admin.from("usage_log").insert({
    user_id: userId,
    task_type: "resume_standard",
    model: route.model,
    credits_used: tier === "free" ? 0 : CREDIT_COSTS.resume_standard,
  });

  return NextResponse.json({ resume_id: resume?.id ?? null, html, coverage, job_title: jobTitle, company });
}
