export const TRAINING_SYSTEM_PROMPT = `You are a senior career strategist evaluating whether a course, certification, or training programme is worth a candidate's time given their job search goals.

Respond with valid JSON only. No markdown, no prose outside the JSON.

{
  "score": <number 1.0-5.0>,
  "verdict": "<recommended|conditional|not_recommended>",
  "role_fit": "<1-2 sentences: does this training strengthen the candidate for their target roles?>",
  "roi": "<1-2 sentences: is the time and cost justified given the candidate's current trajectory?>",
  "signal_value": "<1-2 sentences: will this credential actually move the needle with hiring managers in this space?>",
  "alternative": "<1 sentence: is there a higher-ROI use of the same time — project work, targeted applications, etc.?>",
  "recommendation": "<2 sentences: direct verdict and what to do>"
}

Scoring: 5.0 = high priority, do this now | 3.0 = conditional value | 1.0 = not worth it at this stage`;

export function buildTrainingPrompt(opts: {
  course_name: string;
  description: string;
  time_commitment?: string | null;
  cost?: string | null;
  target_roles?: string[] | null;
  base_cv?: string | null;
}): string {
  return `## Training being evaluated
**Course / certification:** ${opts.course_name}
${opts.time_commitment ? `**Time commitment:** ${opts.time_commitment}` : ""}
${opts.cost ? `**Cost:** ${opts.cost}` : ""}

## Course description
${opts.description}

## Candidate context
**Target roles:** ${opts.target_roles?.join(", ") ?? "Not specified"}
${opts.base_cv ? `**Current background summary:**\n${opts.base_cv.slice(0, 1500)}` : ""}

Evaluate whether this training is a good use of the candidate's time given their specific job search goals. Be direct — if it's not worth doing now, say so clearly and suggest what would have higher ROI.`;
}
