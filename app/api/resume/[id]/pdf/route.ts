import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { renderResumePdf } from "@/lib/resume/pdf";
import type { ResumeData } from "@/lib/resume/template";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });

  const { data: resume } = await supabase
    .from("resumes")
    .select("content, title")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!resume?.content) return new NextResponse("Not found", { status: 404 });

  let data: ResumeData;
  try {
    data = JSON.parse(resume.content) as ResumeData;
    if (!Array.isArray(data.experience)) data.experience = [];
  } catch {
    return new NextResponse("Invalid resume data", { status: 500 });
  }

  const pdfBuffer = await renderResumePdf(data);
  const filename = (resume.title ?? "resume").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "_");

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}.pdf"`,
    },
  });
}
