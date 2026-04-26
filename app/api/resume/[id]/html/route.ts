import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { data: resume } = await supabase
    .from("resumes")
    .select("html, title")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!resume?.html) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Inject auto-print script for the print/save-as-PDF flow
  const printable = resume.html.replace(
    "</body>",
    `<script>window.onload = function(){ window.print(); }</script></body>`,
  );

  return new NextResponse(printable, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="${resume.title ?? "resume"}.html"`,
    },
  });
}
