export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://nextrole.live").replace(/\/$/, "");
}
