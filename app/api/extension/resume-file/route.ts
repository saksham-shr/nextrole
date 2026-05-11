/**
 * GET /api/extension/resume-file
 * Auth: Bearer <extension_token>
 *
 * Returns the latest tailored resume for a job as a downloadable .doc file
 * (HTML served with application/msword — accepted by Accenture and most ATS).
 *
 * Query params:
 *   jobId (required) — UUID of the job whose latest resume to fetch
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = rateLimit(`ext-resume-file:${ip}`, 20, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const auth = req.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const resolved = await resolveExtensionUser(token);
  if (!resolved) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { userId } = resolved;
  const admin = createAdminClient();
  const jobId = req.nextUrl.searchParams.get("jobId") ?? null;
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const { data: resume } = await admin
    .from("resumes")
    .select("html, title")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!resume?.html) {
    return NextResponse.json({ error: "No resume found for this job — generate one first" }, { status: 404 });
  }

  const html = resume.html as string;
  return new NextResponse(html, {
    headers: {
      "Content-Type": "application/msword",
      "Content-Disposition": `attachment; filename="nextrole_resume.doc"`,
      "Content-Length": String(Buffer.byteLength(html, "utf8")),
      "Cache-Control": "private, no-store",
    },
  });
}
