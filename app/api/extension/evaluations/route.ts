/**
 * GET /api/extension/evaluations?url=<job_url>
 * Auth: Bearer <extension token>
 *
 * Returns the user's recent evaluations for the apply-card evaluation picker.
 *
 * Behavior:
 *   1. If `url` query param is provided, first try to find an evaluation whose
 *      linked job has the same URL → return as `auto_match`.
 *   2. Always return up to 20 recent evaluations (newest first) for the dropdown.
 *
 * Response (200):
 * {
 *   auto_match?: {
 *     evaluation_id: string,
 *     job_id:        string,
 *     job_title:     string,
 *     company:       string,
 *     score:         number | null,
 *     decision:      "apply" | "skip" | "watch" | null
 *   },
 *   recent: Array<{
 *     evaluation_id: string,
 *     job_id:        string,
 *     job_title:     string,
 *     company:       string,
 *     score:         number | null,
 *     decision:      "apply" | "skip" | "watch" | null,
 *     created_at:    string
 *   }>
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`ext-evaluations:${ip}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;
  const admin = createAdminClient();
  const jobUrl = req.nextUrl.searchParams.get("url");

  // ── Recent evaluations (always returned) ────────────────────────────────────
  const { data: recentRows } = await admin
    .from("evaluations")
    .select("id, job_id, score, decision, created_at, jobs!inner(id, title, company, url)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(20);

  type EvalRow = {
    id: string;
    job_id: string;
    score: number | null;
    decision: "apply" | "skip" | "watch" | null;
    created_at: string;
    jobs: { id: string; title: string; company: string; url: string | null } | null;
  };

  const recent = ((recentRows ?? []) as unknown as EvalRow[]).map((r) => ({
    evaluation_id: r.id,
    job_id:        r.job_id,
    job_title:     r.jobs?.title ?? "",
    company:       r.jobs?.company ?? "",
    job_url:       r.jobs?.url ?? null,
    score:         r.score,
    decision:      r.decision,
    created_at:    r.created_at,
  }));

  // ── Auto-match by URL (loose match — substring of the job URL) ──────────────
  let auto_match = null;
  if (jobUrl) {
    // Match: exact, or the page URL starts with the stored job URL (some sites
    // add query params; others store with /apply suffix etc.)
    const normalized = jobUrl.split("?")[0].replace(/\/$/, "");
    const candidate = recent.find((r) => {
      if (!r.job_url) return false;
      const stored = r.job_url.split("?")[0].replace(/\/$/, "");
      return stored === normalized
          || normalized.startsWith(stored)
          || stored.startsWith(normalized);
    });
    if (candidate) {
      auto_match = {
        evaluation_id: candidate.evaluation_id,
        job_id:        candidate.job_id,
        job_title:     candidate.job_title,
        company:       candidate.company,
        score:         candidate.score,
        decision:      candidate.decision,
      };
    }
  }

  return NextResponse.json({ auto_match, recent });
}
