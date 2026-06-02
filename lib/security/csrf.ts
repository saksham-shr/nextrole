import { NextRequest } from "next/server";

function normalizeOrigin(origin: string): string {
  return origin.replace(/\/+$/, "").toLowerCase();
}

export function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const requestOrigin = new URL(request.url).origin;
  const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.APP_URL ?? requestOrigin;

  const normalizedOrigin = normalizeOrigin(origin);
  const isLocalhost =
    normalizedOrigin === "http://localhost" ||
    normalizedOrigin === "http://127.0.0.1" ||
    /^http:\/\/localhost:\d+$/.test(normalizedOrigin) ||
    /^http:\/\/127\.0\.0\.1:\d+$/.test(normalizedOrigin);
  return (
    normalizedOrigin === normalizeOrigin(requestOrigin) ||
    normalizedOrigin === normalizeOrigin(siteOrigin) ||
    isLocalhost
  );
}
