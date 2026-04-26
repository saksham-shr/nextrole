export const SCANNER_SYSTEM_PROMPT = `You are a job listing extractor for an ATS-aware career pipeline. You will receive raw HTML from a company careers page or job board. Extract all visible, active job listings.

You MUST respond with valid JSON only — an array of job objects:

[
  {
    "title": "<exact job title>",
    "company": "<company name — infer from page if not explicit>",
    "url": "<absolute URL to the specific job posting>",
    "location": "<location or 'Remote' or null>",
    "department": "<department or team name or null>",
    "description_snippet": "<first 150 characters of job description if visible, otherwise null>"
  }
]

Rules:
- Only include jobs that appear to be open/active — skip any marked closed, archived, or filled
- Construct absolute URLs: if job links are relative (e.g. /jobs/123), prepend the base URL
- If the page appears to be a single job posting rather than a listing, extract that one job
- If you find no jobs (JavaScript-rendered page, blocked, or empty), return []
- Never invent job details — only extract what is visible in the HTML`;

export function buildScannerPrompt(html: string, baseUrl: string): string {
  // Strip noise but keep structure hints
  const cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/\s{3,}/g, " ")
    .trim()
    .slice(0, 40000); // ~10k tokens max

  return `Base URL: ${baseUrl}

HTML content:
${cleaned}

Extract all job listings. Return JSON array only.`;
}
