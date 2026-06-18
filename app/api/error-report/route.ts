import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export async function POST(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`error-report:${ip}`, 5, 60_000);
  if (!rl.ok) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: { error_message?: string; page_url?: string; component?: string; extra_context?: Record<string, unknown> };
  try {
    body = await req.json() as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const errorMessage = typeof body.error_message === "string" ? body.error_message.slice(0, 2000) : null;
  if (!errorMessage) {
    return NextResponse.json({ error: "error_message required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();
  const { error } = await admin.from("error_reports").insert({
    user_id: user?.id ?? null,
    error_message: errorMessage,
    page_url: typeof body.page_url === "string" ? body.page_url.slice(0, 500) : null,
    component: typeof body.component === "string" ? body.component.slice(0, 200) : null,
    user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    extra_context: body.extra_context ?? {},
  });

  if (error) {
    console.error("[error-report] insert failed:", error.message);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
