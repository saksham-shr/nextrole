/**
 * POST /api/extension/resume
 * Auth: Bearer <extension_token>
 *
 * Generates a tailored resume for a job application from the browser extension.
 * Accepts either a stored job_id or raw job context (title + company + description).
 * Returns the rendered HTML so the extension can open it as a blob for print-to-PDF.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveUserFromJWT } from "@/lib/extension-auth";
import { decrypt } from "@/lib/crypto";
import { callProvider, parseJSON } from "@/lib/evaluate/providers";
import { RESUME_SYSTEM_PROMPT, buildResumePrompt } from "@/lib/resume/prompt";
import { renderResumeHtml } from "@/lib/resume/template";
import type { ResumeData } from "@/lib/resume/template";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { canAccess } from "@/lib/ai/gates";
import type { UserTier } from "@/lib/db/types";

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`ext-resume:${ip}`, 10, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const resolved = await resolveUserFromJWT(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;

  // Parse body
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

  // If job_id provided, load the stored description for richer context
  if (jobId) {
    const { data: job } = await admin
      .from("jobs")
      .select("title, company, description")
      .eq("id", jobId)
      .eq("user_id", userId)
      .single();
    if (job) {
      if (!jobTitle) jobTitle = job.title as string;
      if (!company)  company  = job.company as string;
      if (!jobDesc && job.description) jobDesc = (job.description as string).slice(0, 8000);
    }
  }

  if (!jobTitle && !company) {
    return NextResponse.json({ error: "job_title or job_id required" }, { status: 400 });
  }

  // Load profile base CV + tier
  const { data: profile } = await admin
    .from("profiles")
    .select("base_cv, full_name, tier")
    .eq("id", userId)
    .single();

  const tier = ((profile?.tier as string | null) ?? "free") as UserTier;
  const isByok = tier === "byok";

  // Feature gate: resume tailoring requires Starter+
  if (!canAccess(tier, "resume_tailor")) {
    return NextResponse.json(
      { error: "Resume tailoring requires Starter plan or higher", upgrade: true },
      { status: 402 },
    );
  }

  // Credit gate
  if (!isByok) {
    const { data: ok } = await admin.rpc("deduct_credit", { p_user_id: userId, p_amount: 5 });
    if (!ok) {
      return NextResponse.json(
        { error: "No AI credits remaining — upgrade your NextRole plan", upgrade: true },
        { status: 402 },
      );
    }
  }

  if (!profile?.base_cv) {
    return NextResponse.json(
      { error: "No CV in your profile — add it in NextRole → Settings first" },
      { status: 400 },
    );
  }

  // Load active AI provider
  const { data: providers } = await admin
    .from("provider_credentials")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .in("provider", ["anthropic", "openai", "gemini"])
    .order("updated_at", { ascending: false })
    .limit(1);

  const cred = providers?.[0];
  if (!cred?.encrypted_key) {
    return NextResponse.json(
      { error: "No AI provider configured — add a key in NextRole → Providers" },
      { status: 400 },
    );
  }

  // If no stored job_id, create a shadow job entry so the resume FK resolves
  if (!jobId) {
    const { data: newJob } = await admin
      .from("jobs")
      .insert({
        user_id:     userId,
        title:       jobTitle || "Unknown Role",
        company:     company  || "Unknown Company",
        description: jobDesc  || null,
        source:      "extension_resume",
        status:      "pending",
      })
      .select("id")
      .single();
    jobId = newJob?.id ?? null;
  }

  // Build and call AI
  const apiKey = decrypt(cred.encrypted_key);
  const model  = cred.model ?? (
    cred.provider === "anthropic" ? "claude-haiku-4-5-20251001" :
    cred.provider === "gemini"    ? "gemini-2.0-flash" :
    "gpt-4o-mini"
  );

  const userPrompt = buildResumePrompt({
    title:       jobTitle,
    company,
    description: jobDesc,
    base_cv:     profile.base_cv as string,
  });

  let rawOutput: string;
  try {
    rawOutput = await callProvider(cred.provider, apiKey, model, RESUME_SYSTEM_PROMPT, userPrompt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI call failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  let resumeData: ResumeData;
  try {
    resumeData = parseJSON(rawOutput) as ResumeData;
  } catch {
    return NextResponse.json({ error: "AI returned invalid JSON" }, { status: 502 });
  }

  const html     = renderResumeHtml(resumeData);
  const coverage = Math.max(0, Math.min(100, (resumeData as { coverage?: number }).coverage ?? 0));

  // Save to resumes table
  const { data: resume } = await admin
    .from("resumes")
    .insert({
      user_id:  userId,
      job_id:   jobId,
      title:    `${jobTitle} at ${company}`,
      content:  JSON.stringify(resumeData),
      html,
      coverage,
      status:   "draft",
      version:  1,
    })
    .select("id")
    .single();

  // Return both resume_id and full HTML so extension can open as blob (no session needed)
  return NextResponse.json({
    resume_id: resume?.id ?? null,
    html,
    coverage,
    job_title: jobTitle,
    company,
  });
}
