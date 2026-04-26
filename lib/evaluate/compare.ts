export const COMPARE_SYSTEM_PROMPT = `You are a career comparison engine for senior technology professionals. You are given evaluations of multiple job opportunities and must rank them from best to worst fit for the candidate.

You MUST respond with valid JSON only — no markdown, no prose, no code fences. The JSON must match this exact structure:

{
  "ranked": [
    {
      "job_id": "<exact uuid from input>",
      "rank": <integer, 1 = best>,
      "title": "<job title>",
      "company": "<company name>",
      "score": <number 1.0–5.0>,
      "decision": "<apply|watch|skip>",
      "why": "<one sentence explaining this rank position>"
    }
  ],
  "winner_id": "<uuid of the rank-1 job>",
  "winner_rationale": "<2-3 sentences explaining why this is the best opportunity right now>",
  "summary": "<one sentence overview of the whole comparison>"
}

Rank by: overall fit score weighted with compensation signals, role alignment, growth potential, and legitimacy. Be direct — identify a clear winner even when scores are close. Every input job must appear in ranked.`;

interface EvalSummary {
  id: string;
  title: string;
  company: string;
  score: number | null;
  decision: string | null;
  role_fit: Record<string, unknown> | null;
  compensation_analysis: Record<string, unknown> | null;
  cv_match: Record<string, unknown> | null;
  legitimacy_check: Record<string, unknown> | null;
}

export function buildComparePrompt(jobs: EvalSummary[]): string {
  const parts = jobs.map((job, i) => {
    const rf = job.role_fit as { score?: number; summary?: string } | null;
    const ca = job.compensation_analysis as {
      score?: number;
      summary?: string;
      market_position?: string;
    } | null;
    const cv = job.cv_match as { score?: number; summary?: string; coverage?: string } | null;
    const lc = job.legitimacy_check as { score?: number; verdict?: string } | null;

    return `## Offer ${i + 1}: ${job.title} at ${job.company}
Job ID: ${job.id}
Overall score: ${job.score ?? "not scored"} / 5.0
Decision: ${job.decision ?? "none"}
A · Role fit: ${rf?.score ?? "?"}/5.0 — ${rf?.summary ?? "no data"}
B · Compensation: ${ca?.score ?? "?"}/5.0 — ${ca?.summary ?? "no data"} (${ca?.market_position ?? "unknown"} market)
C · CV match: ${cv?.score ?? "?"}/5.0 — ${cv?.summary ?? "no data"} (coverage: ${cv?.coverage ?? "unknown"})
G · Legitimacy: ${lc?.score ?? "?"}/5.0 — ${lc?.verdict ?? "unknown"}`;
  });

  return `${parts.join("\n\n")}

Compare these ${jobs.length} opportunities and rank them. Identify the clear winner. Return JSON only.`;
}
