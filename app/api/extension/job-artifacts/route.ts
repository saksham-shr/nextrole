/**
 * GET /api/extension/job-artifacts
 * Auth: Bearer <extension_token>
 *
 * Returns the 8 most recent pipeline jobs (for the job picker) plus, when a
 * jobId is supplied, the full job record, latest evaluation, and latest tailored
 * resume — everything apply-card.js needs to populate its tabs.
 *
 * Query params:
 *   jobId  (optional) — UUID of the job to fetch details for
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`ext-artifacts:${ip}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;
  const admin = createAdminClient();
  const jobId = req.nextUrl.searchParams.get("jobId") ?? null;

  // Pull up to 15 recent jobs, join their latest evaluation, then trim to 8.
  // Returning eval_score + eval_decision lets the apply-card filter the
  // "load saved evaluation" picker to jobs that actually have an eval.
  const { data: jobsRaw } = await admin
    .from("jobs")
    .select("id, title, company, status, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(15);

  const jobIds = (jobsRaw ?? []).map((j) => j.id as string);
  let latestEvalByJob = new Map<string, { score: number | null; decision: string | null }>();
  if (jobIds.length > 0) {
    const { data: evalRows } = await admin
      .from("evaluations")
      .select("job_id, score, decision, created_at")
      .eq("user_id", userId)
      .in("job_id", jobIds)
      .order("created_at", { ascending: false });
    for (const e of (evalRows ?? []) as Array<{ job_id: string; score: number; decision: string }>) {
      if (!latestEvalByJob.has(e.job_id)) {
        latestEvalByJob.set(e.job_id, { score: e.score, decision: e.decision });
      }
    }
  }

  const recentJobs = (jobsRaw ?? []).slice(0, 8).map((j) => ({
    id:         j.id,
    title:      j.title,
    company:    j.company,
    status:     j.status,
    created_at: j.created_at,
    eval_score:    latestEvalByJob.get(j.id as string)?.score    ?? null,
    eval_decision: latestEvalByJob.get(j.id as string)?.decision ?? null,
  }));

  // Recent tailored resumes (latest 10) — for the resume picker dropdown.
  type ResumeListRow = {
    id: string;
    job_id: string | null;
    title: string | null;
    coverage: number | null;
    created_at: string;
    jobs: { title: string | null; company: string | null } | null;
  };
  const { data: recentResumesRaw } = await admin
    .from("resumes")
    .select("id, job_id, title, coverage, created_at, jobs!left(title, company)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10) as unknown as { data: ResumeListRow[] | null };

  const recentResumes = (recentResumesRaw ?? []).map((r) => ({
    id:         r.id,
    job_id:     r.job_id,
    title:      r.title ?? "",
    job_title:  r.jobs?.title   ?? "",
    company:    r.jobs?.company ?? "",
    coverage:   r.coverage,
    created_at: r.created_at,
  }));

  if (!jobId) {
    return NextResponse.json({
      ok: true,
      recent_jobs:    recentJobs,
      recent_resumes: recentResumes,
    });
  }

  type EvalRow = {
    id: string; score: number; decision: string;
    role_fit: string | null; compensation_analysis: string | null;
    cv_match: string | null; personalization_guidance: string | null;
    interview_signals: string | null; legitimacy_check: string | null;
    level_strategy: string | null; created_at: string;
  };
  type ResumeRow = { id: string; title: string | null; html: string | null; coverage: number | null; created_at: string; };

  // Fetch job details, latest evaluation, and latest resume in parallel
  const [{ data: job }, { data: evaluations }, { data: resumes }] = await Promise.all([
    admin
      .from("jobs")
      .select("id, title, company, url, description, status, created_at")
      .eq("id", jobId)
      .eq("user_id", userId)
      .single(),
    admin
      .from("evaluations")
      .select(
        "id, score, decision, role_fit, compensation_analysis, cv_match, " +
        "personalization_guidance, interview_signals, legitimacy_check, level_strategy, created_at",
      )
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1) as unknown as Promise<{ data: EvalRow[] | null; error: unknown }>,
    admin
      .from("resumes")
      .select("id, title, html, coverage, created_at")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1) as unknown as Promise<{ data: ResumeRow[] | null; error: unknown }>,
  ]);

  // Normalise the evaluation row so apply-card.js receives the same shape
  // whether the eval came from a fresh EVALUATE_JOB run (which returns nested
  // `blocks`) or from the DB (which stores flat columns).
  const evalRow = (evaluations as EvalRow[] | null)?.[0] ?? null;
  const normalizedEval = evalRow ? {
    id:       evalRow.id,
    score:    evalRow.score,
    decision: evalRow.decision,
    // Wrap the flat columns into a `blocks` object so renderEvalTab can use one path
    blocks: {
      role_fit:                 evalRow.role_fit,
      cv_match:                 evalRow.cv_match,
      compensation_analysis:    evalRow.compensation_analysis,
      personalization_guidance: evalRow.personalization_guidance,
      interview_signals:        evalRow.interview_signals,
      legitimacy_check:         evalRow.legitimacy_check,
      level_strategy:           evalRow.level_strategy,
    },
  } : null;

  return NextResponse.json({
    ok:             true,
    recent_jobs:    recentJobs,
    recent_resumes: recentResumes,
    job:            job ?? null,
    evaluation:     normalizedEval,
    resume:         (resumes as ResumeRow[] | null)?.[0] ?? null,
  });
}
