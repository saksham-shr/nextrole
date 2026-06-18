/**
 * POST /api/extension/evaluate
 * Auth: Bearer <supabase_jwt>
 *
 * Runs a full AI job evaluation from the browser extension.
 * Free: up to 5/day. Starter/Pro: 5 credits (deducted only on success).
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { buildSystemPrompt, buildUserPrompt } from "@/lib/evaluate/prompt";
import { callProvider, parseJSON } from "@/lib/ai/providers";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { canAccess, CREDIT_COSTS, FREE_DAILY_LIMITS } from "@/lib/ai/gates";
import { resolveRoute } from "@/lib/ai/router";
import type { UserTier } from "@/lib/db/types";
import { reserveExtensionAiCharge } from "@/lib/extension-ai";
import { awardActionCredit, checkReferralThreshold } from "@/lib/credits/grant";

export const maxDuration = 60;

const EVAL_MAX_TOKENS = 3000;

function clampScore(score: unknown): number {
  const n = typeof score === "number" ? score : parseFloat(String(score));
  return Math.max(1.0, Math.min(5.0, isNaN(n) ? 1.0 : n));
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`ext-eval:${ip}`, 5, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;
  const admin = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);

  const body = await req.json().catch(() => ({})) as { job_id?: string };
  const jobId = body.job_id;
  if (!jobId) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  const [{ data: profile }, { data: job }] = await Promise.all([
    admin.from("profiles").select("*").eq("id", userId).single(),
    admin.from("jobs").select("*").eq("id", jobId).eq("user_id", userId).single(),
  ]);

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });
  if (!job.description) {
    return NextResponse.json(
      { error: "Job has no description â€” paste the JD before evaluating" },
      { status: 400 },
    );
  }
  if (!profile?.base_cv) {
    return NextResponse.json(
      { error: "No CV in your profile â€” add it in Settings first" },
      { status: 400 },
    );
  }

  const tier = ((profile?.tier as string | null) ?? "free") as UserTier;
  const credits = ((profile?.daily_credits as number | null) ?? 0) + ((profile?.topup_credits as number | null) ?? 0);

  // Feature gate
  if (!canAccess(tier as Parameters<typeof canAccess>[0], "evaluate")) {
    return NextResponse.json(
      { error: "Evaluation not available on your plan", upgrade: true },
      { status: 403 },
    );
  }

  // Preflight read-only checks â€” give a fast 402 before reserving anything,
  // but the real authoritative check is the atomic reservation below.
  if (tier === "free") {
    const { data: usageRow } = await admin
      .from("daily_usage")
      .select("evaluations")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle();
    const usedToday = (usageRow as { evaluations?: number } | null)?.evaluations ?? 0;
    if (usedToday >= FREE_DAILY_LIMITS.evaluations) {
      return NextResponse.json(
        { error: "Daily evaluation limit reached â€” upgrade for more", upgrade: true },
        { status: 402 },
      );
    }
  }

  if (tier !== "free" && credits < CREDIT_COSTS.evaluate) {
    return NextResponse.json(
      { error: "No credits remaining", upgrade: true },
      { status: 402 },
    );
  }

  // Atomically reserve the credit / increment daily usage BEFORE calling the
  // AI provider. Two parallel requests can both pass the read-only check
  // above; the deduct_credit RPC and increment_daily_usage RPC serialize
  // the actual write, so only one wins. The reservation is refunded if any
  // step between here and the success response fails.
  let reservation;
  try {
    reservation = await reserveExtensionAiCharge(admin, {
      userId,
      tier,
      task: "evaluate",
      freeUsageField: "evaluations",
      freeDailyLimit: FREE_DAILY_LIMITS.evaluations,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not reserve credits";
    const status = msg === "DAILY_LIMIT" || msg === "INSUFFICIENT_CREDITS" ? 402 : 500;
    return NextResponse.json(
      { error: msg === "INSUFFICIENT_CREDITS" ? "No credits remaining" :
               msg === "DAILY_LIMIT" ? "Daily evaluation limit reached â€” upgrade for more" :
               msg, upgrade: status === 402 },
      { status },
    );
  }

  let route;
  try { route = resolveRoute("evaluate"); }
  catch { return NextResponse.json({ error: "AI not configured" }, { status: 503 }); }

  const systemPrompt = buildSystemPrompt({
    applyThreshold: (profile.eval_score_apply as number | null) ?? 3.5,
    watchThreshold: (profile.eval_score_watch as number | null) ?? 2.5,
    customFocus: profile.custom_eval_focus as string | null,
    language: profile.preferred_language as string | null,
    archetypes: profile.custom_archetypes as string[] | null,
  });

  const userPrompt = buildUserPrompt({
    title: job.title as string,
    company: job.company as string,
    description: job.description as string,
    base_cv: profile.base_cv as string,
    archetype: job.archetype as string | null,
    seniority: profile.seniority as string | null,
    target_roles: profile.target_roles as string[] | null,
    current_comp: profile.current_comp as number | null,
    comp_min: profile.comp_min as number | null,
    comp_max: profile.comp_max as number | null,
    work_mode: profile.work_mode as string | null,
    target_locations: profile.target_locations as string[] | null,
  });

  let rawOutput: string;
  try {
    rawOutput = await callProvider({
      provider: route.provider,
      apiKey: route.apiKey,
      model: route.model,
      system: systemPrompt,
      user: userPrompt,
      maxTokens: EVAL_MAX_TOKENS,
      cache: route.provider === "anthropic",
      json: true,
      fallbackModels: route.fallbackModels,
    });
  } catch (err) {
    await reservation.refund();
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "AI call failed" },
      { status: 502 },
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let result: any;
  try { result = parseJSON(rawOutput); }
  catch {
    await reservation.refund();
    return NextResponse.json({ error: "AI returned an invalid response" }, { status: 502 });
  }

  const score    = clampScore(result.score);
  const decision = (["apply", "watch", "skip"].includes(result.decision) ? result.decision : "watch") as "apply" | "watch" | "skip";
  const archetype = result.archetype ?? null;

  // Persist evaluation row
  const { data: evaluation } = await admin.from("evaluations").insert({
    user_id: userId,
    job_id: jobId,
    score,
    decision,
    role_fit:                  result.blocks?.role_fit                  ?? null,
    compensation_analysis:     result.blocks?.compensation_analysis     ?? null,
    cv_match:                  result.blocks?.cv_match                  ?? null,
    personalization_guidance:  result.blocks?.personalization_guidance  ?? null,
    interview_signals:         result.blocks?.interview_signals         ?? null,
    legitimacy_check:          result.blocks?.legitimacy_check          ?? null,
    level_strategy:            result.blocks?.level_strategy            ?? null,
    raw_output: rawOutput,
    provider: route.provider,
    model: route.model,
  }).select("id").single();

  await admin.from("jobs").update({
    status: "evaluated",
    archetype: archetype ?? (job.archetype as string | null),
    updated_at: new Date().toISOString(),
  }).eq("id", jobId).eq("user_id", userId);

  await admin.from("usage_log").insert({
    user_id: userId,
    task_type: "evaluate",
    model: route.model,
    credits_used: tier === "free" ? 0 : CREDIT_COSTS.evaluate,
  });

  // Award first_evaluation grant + check referral threshold (fire-and-forget)
  awardActionCredit(admin, userId, "first_evaluation").catch(() => {});
  checkReferralThreshold(admin, userId).catch(() => {});

  return NextResponse.json({
    evaluation_id: evaluation?.id ?? null,
    score,
    decision,
    archetype,
    blocks: result.blocks ?? null,
  });
}
