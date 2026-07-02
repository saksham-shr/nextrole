import { NextRequest, NextResponse } from "next/server";
import { lookup as dnsLookup } from "node:dns/promises";
import { createClient } from "@/lib/supabase/server";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";

export const maxDuration = 20;

// SEC-04: prevent SSRF via user-supplied job.url
// Refuse non-HTTP(S) schemes, well-known internal hostnames, and any host
// that resolves to a private / link-local / loopback IP. We resolve the
// host BEFORE fetching and reject if any A/AAAA points into private space.
//
// Note: this isn't immune to DNS-rebinding (the resolved IP could change
// between our check and the actual fetch). For complete protection, ops
// should also run this behind a network egress allowlist. The check below
// covers the common cases (metadata endpoints, RFC1918, IPv6 ULA).

const BLOCKED_HOST_RE = /^(localhost|metadata\.google\.internal|metadata|169\.254\.169\.254|0\.0\.0\.0)$/i;

function isPrivateIPv4(ip: string): boolean {
  const m = ip.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [parseInt(m[1], 10), parseInt(m[2], 10)];
  if (a === 10) return true;                          // 10/8
  if (a === 127) return true;                         // loopback
  if (a === 0) return true;                           // 0/8
  if (a === 169 && b === 254) return true;            // link-local (incl. cloud metadata)
  if (a === 172 && b >= 16 && b <= 31) return true;   // 172.16/12
  if (a === 192 && b === 168) return true;            // 192.168/16
  if (a >= 224) return true;                          // multicast + reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const low = ip.toLowerCase();
  if (low === "::1" || low === "::") return true;     // loopback / unspecified
  if (low.startsWith("fc") || low.startsWith("fd")) return true; // ULA fc00::/7
  if (low.startsWith("fe80")) return true;            // link-local
  if (low.startsWith("::ffff:")) {                    // IPv4-mapped — re-check
    return isPrivateIPv4(low.slice(7));
  }
  return false;
}

async function assertPublicHostname(url: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  let parsed: URL;
  try { parsed = new URL(url); } catch { return { ok: false, reason: "invalid_url" }; }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "bad_scheme" };
  }
  const host = parsed.hostname;
  if (!host) return { ok: false, reason: "no_host" };
  if (BLOCKED_HOST_RE.test(host)) return { ok: false, reason: "blocked_host" };

  // If the host is already a literal IP, check it directly.
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(host) && isPrivateIPv4(host)) {
    return { ok: false, reason: "private_ip" };
  }
  if (host.includes(":") && isPrivateIPv6(host)) {
    return { ok: false, reason: "private_ip" };
  }

  // Resolve DNS and reject if ANY answer is private/internal.
  try {
    const addrs = await dnsLookup(host, { all: true });
    for (const a of addrs) {
      if (a.family === 4 && isPrivateIPv4(a.address)) return { ok: false, reason: "private_ip" };
      if (a.family === 6 && isPrivateIPv6(a.address)) return { ok: false, reason: "private_ip" };
    }
  } catch {
    return { ok: false, reason: "dns_failed" };
  }
  return { ok: true };
}

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

  // Rate limit per-user — fetch-on-behalf endpoints are abuse-prone.
  const rl = await rateLimit(`liveness-user:${user.id}`, 30, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  const ipRl = await rateLimit(`liveness-ip:${getClientIp(request)}`, 60, 60_000);
  if (!ipRl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

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

  // SSRF guard: refuse non-public URLs before issuing a request.
  const guard = await assertPublicHostname(job.url);
  if (!guard.ok) {
    return NextResponse.json({ live: null, reason: guard.reason });
  }

  // Fetch the listing page
  let statusCode: number;
  let html: string;

  try {
    const res = await fetch(job.url, {
      method: "GET",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; Braevity-LivenessBot/1.0; +https://nextrole.app)",
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
    // Treat timeout / network error as unknown (not definitively closed).
    // Don't leak the raw network error message — it can confirm reachability
    // of internal hosts (SSRF probe) and otherwise just adds noise.
    console.warn("[liveness] fetch failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ live: null, reason: "fetch_error" });
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
