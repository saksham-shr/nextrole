/**
 * GET /api/profile/suggestions?field=<field>&q=<query>
 *
 * Returns up to 8 autocomplete suggestions for the given profile field.
 * Fields: role | location | college | company | skill
 *
 * No auth required — data is entirely static, no user info exposed.
 * Rate-limited to prevent enumeration abuse.
 */

import { NextRequest, NextResponse } from "next/server";
import { getClientIp, rateLimit } from "@/lib/security/rate-limit";
import { getSuggestions, type SuggestionField } from "@/lib/suggestions/data";

const VALID_FIELDS = new Set<SuggestionField>(["role", "location", "college", "company", "skill", "degree", "field_of_study", "certification"]);

export async function GET(req: NextRequest) {
  const ip = getClientIp(req);
  const rl = await rateLimit(`suggestions:${ip}`, 60, 60_000);
  if (!rl.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const field = req.nextUrl.searchParams.get("field") as SuggestionField | null;
  const query = req.nextUrl.searchParams.get("q") ?? "";

  if (!field || !VALID_FIELDS.has(field)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }

  const suggestions = getSuggestions(field, query);
  return NextResponse.json({ suggestions }, {
    headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" },
  });
}
