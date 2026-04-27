import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const maxDuration = 20;

// ─── Closed-job signal patterns ────────────────────────────────────────────────
// Ordered from most specific to least — stops at first match
const CLOSED_PATTERNS: RegExp[] = [
  /no longer accepting applications/i,
  /this position has been filled/i,
  /position has been filled/i,
  /this role has been filled/i,
  /job is no longer available/i,
  /listing is no longer available/i,
  /this listing (has been|is) (removed|closed|expired)/i,
  /this job (has been|is) (removed|closed|expired)/i,
  /application[s]? (period )?(is |are )?(now )?closed/i,
  /vacancy (is )?closed/i,
  /role (is )?no longer open/i,
  /position (is )?no longer open/i,
  /no longer (taking|accepting) applicants/i,
  /job posting (has been|is) removed/i,
  /this job posting (has expired|is closed)/i,
  /this opportunity (has been|is) (filled|closed)/i,
];

function detectClosed(html: string): string | null {
  // Trim to first 50 KB — the signals are near the top of the page
  const sample = html.slice(0, 50_000);
  for (const pattern of CLOSED_PATTERNS) {
    if (pattern.test(sample)) {
      return pattern.source;
    }
  }
  return null;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobId = request.nextUrl.searchParams.get("job_id");
  if (!jobId) return NextResponse.json({ error: "job_id required" }, { status: 400 });

  // Load job
  const { data: job } = await supabase
    .from("jobs")
    .select("id, url, title, company")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) return NextResponse.json({ error: "Job not found" }, { status: 404 });

  // No URL — can't check
  if (!job.url?.trim()) {
    return NextResponse.json({ live: null, reason: "no_url" });
  }

  // Fetch the listing page
  let statusCode: number;
  let html: string;

  try {
    const res = await fetch(job.url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; NextRole-LivenessBot/1.0; +https://nextrole.app)",
        Accept: "text/html,application/xhtml+xml,*/*;q=0.8",
      },
      signal: AbortSignal.timeout(12_000),
      redirect: "follow",
    });

    statusCode = res.status;

    // Definitive closed signals from HTTP status
    if (statusCode === 404 || statusCode === 410) {
      return NextResponse.json({
        live: false,
        reason: "http_not_found",
        status_code: statusCode,
      });
    }

    if (statusCode >= 400) {
      return NextResponse.json({
        live: false,
        reason: "http_error",
        status_code: statusCode,
      });
    }

    // Read body only for 2xx/3xx — cap at 200 KB to avoid huge pages
    const buffer = await res.arrayBuffer();
    html = new TextDecoder().decode(buffer.slice(0, 200_000));
  } catch (err) {
    const message = err instanceof Error ? err.message : "fetch failed";
    // Treat timeout or network error as unknown (not definitively closed)
    return NextResponse.json({ live: null, reason: "fetch_error", error: message });
  }

  // Content-level closed detection
  const matchedPattern = detectClosed(html);
  if (matchedPattern) {
    return NextResponse.json({
      live: false,
      reason: "content_closed",
      status_code: statusCode,
    });
  }

  return NextResponse.json({ live: true, reason: "ok", status_code: statusCode });
}
