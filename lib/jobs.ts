export function canonicalizeJobUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;

  try {
    const url = new URL(rawUrl.trim());
    url.hash = "";

    const keptParams = new URLSearchParams();
    for (const [key, value] of url.searchParams.entries()) {
      if (/^(gh_jid|gh_src|jobid|jk|lever-source|source|src)$/i.test(key)) {
        keptParams.set(key.toLowerCase(), value);
      }
    }

    const query = keptParams.toString();
    const normalizedPath = url.pathname.replace(/\/+$/, "") || "/";
    return `${url.origin.toLowerCase()}${normalizedPath}${query ? `?${query}` : ""}`;
  } catch {
    return rawUrl.trim().replace(/#.*$/, "").replace(/\/+$/, "");
  }
}

export function deriveAtsFamilyFromUrl(rawUrl: string | null | undefined): string | null {
  if (!rawUrl) return null;

  try {
    const host = new URL(rawUrl).hostname.toLowerCase();
    if (
      host.includes("myworkdayjobs.com") ||
      host === "jobs.careers.microsoft.com" ||
      host === "jobs.netflix.com" ||
      host === "explore.jobs.netflix.net"
    ) return "workday";
    if (host.includes("greenhouse.io") || host.includes("grnh.se")) return "greenhouse";
    if (host === "jobs.lever.co" || rawUrl.includes("lever.co/apply")) return "lever";
    if (host.includes("ashbyhq.com")) return "ashby";
    if (host.includes("successfactors.com") || host.includes("sapsf.com")) return "successfactors";
    if (host.includes("oraclecloud.com") || host.endsWith(".oracle.com")) return "oracle";
    if (host === "amazon.jobs" || host === "hiring.amazon.com" || host === "amazon.dejobs.org") return "amazon";
    if (host === "metacareers.com" || host === "careers.meta.com") return "meta";
    if (host === "career.infosys.com" || host === "digitalcareers.infosys.com") return "infosys";
    if (host.endsWith("linkedin.com")) return "linkedin";
    if (host.includes("indeed.com")) return "indeed";
    if (host.endsWith("naukri.com")) return "naukri";
    if (host.includes("forms.office.com") || host.includes("forms.microsoft.com")) return "ms_forms";
    if (host.includes("docs.google.com")) return "google_forms";
  } catch {}

  return null;
}

export function computeFollowupDueAt(appliedAt: string | Date): string {
  const base = typeof appliedAt === "string" ? new Date(appliedAt) : new Date(appliedAt);
  const next = new Date(base);
  next.setUTCDate(next.getUTCDate() + 14);
  return next.toISOString();
}
