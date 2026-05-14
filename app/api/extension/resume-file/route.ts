/**
 * GET /api/extension/resume-file
 * Auth: Bearer <extension_token>
 *
 * Returns the latest tailored resume for a job as a downloadable file.
 *
 * Query params:
 *   jobId (required) — UUID of the job whose latest resume to fetch
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveExtensionUser } from "@/lib/extension-auth";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { renderResumePdf } from "@/lib/resume/pdf";
import { renderResumeRtf } from "@/lib/resume/rtf";
import type { ResumeData } from "@/lib/resume/template";
import { renderResumeDocx } from "@/lib/resume/docx";

export const runtime = "nodejs";

function parseResumeContent(content: unknown): ResumeData | null {
  if (!content) return null;
  if (typeof content === "string") {
    try {
      return JSON.parse(content) as ResumeData;
    } catch {
      return null;
    }
  }
  return content as ResumeData;
}

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
  const format = (req.nextUrl.searchParams.get("format") ?? "pdf").toLowerCase();
  if (!jobId) return NextResponse.json({ error: "jobId required" }, { status: 400 });

  const { data: resume } = await admin
    .from("resumes")
    .select("html, title, content")
    .eq("job_id", jobId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!resume?.html) {
    return NextResponse.json({ error: "No resume found for this job — generate one first" }, { status: 404 });
  }

  const html = resume.html as string;

  if (format === "html") {
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `attachment; filename="nextrole_resume.html"`,
        "Content-Length": String(Buffer.byteLength(html, "utf8")),
        "X-File-Name": "nextrole_resume.html",
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (format === "rtf") {
    const content = parseResumeContent(resume.content);
    if (!content) {
      return NextResponse.json({ error: "Resume content missing" }, { status: 500 });
    }
    const rtf = renderResumeRtf(content);
    return new NextResponse(rtf, {
      headers: {
        "Content-Type": "application/rtf",
        "Content-Disposition": `attachment; filename="nextrole_resume.rtf"`,
        "Content-Length": String(Buffer.byteLength(rtf, "utf8")),
        "X-File-Name": "nextrole_resume.rtf",
        "Cache-Control": "private, no-store",
      },
    });
  }

  if (format === "docx") {
    const content = parseResumeContent(resume.content);
    if (!content) {
      return NextResponse.json({ error: "Resume content missing" }, { status: 500 });
    }
    const docx = await renderResumeDocx(content);
    return new NextResponse(new Uint8Array(docx), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="nextrole_resume.docx"`,
        "Content-Length": String(docx.byteLength),
        "X-File-Name": "nextrole_resume.docx",
        "Cache-Control": "private, no-store",
      },
    });
  }

  const content = parseResumeContent(resume.content);
  if (!content) {
    return NextResponse.json({ error: "Resume content missing" }, { status: 500 });
  }

  const pdf = await renderResumePdf(content);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="nextrole_resume.pdf"`,
      "Content-Length": String(pdf.byteLength),
      "X-File-Name": "nextrole_resume.pdf",
      "Cache-Control": "private, no-store",
    },
  });
}
