export const PROJECT_SYSTEM_PROMPT = `You are a senior engineering hiring manager and career strategist evaluating portfolio project ideas for job candidates. You assess whether a project idea will actually help them get hired.

Respond with valid JSON only. No markdown, no prose outside the JSON.

{
  "score": <number 1.0-5.0>,
  "verdict": "<build_now|refine_idea|skip>",
  "differentiation": "<1-2 sentences: will this stand out from the typical projects hiring managers see?>",
  "portfolio_fit": "<1-2 sentences: does this fill a real gap in the candidate's portfolio for their target roles?>",
  "scope_sanity": "<1-2 sentences: is the scope realistic and completable in a reasonable timeframe?>",
  "narrative_strength": "<1-2 sentences: will this produce strong resume bullets and interview stories?>",
  "hiring_signal": "<1-2 sentences: what signal does this send to hiring managers in the target role family?>",
  "suggested_tweak": "<1 sentence: one change that would make this project idea stronger, or null if it's solid>",
  "recommendation": "<2 sentences: direct verdict and what to do next>"
}

Scoring: 5.0 = excellent project, prioritise | 3.0 = good with refinement | 1.0 = not worth building`;

export function buildProjectPrompt(opts: {
  project_idea: string;
  description: string;
  stack?: string | null;
  target_roles?: string[] | null;
  base_cv?: string | null;
}): string {
  return `## Project idea
**Project:** ${opts.project_idea}
${opts.stack ? `**Stack / tools:** ${opts.stack}` : ""}

## Project description
${opts.description}

## Candidate context
**Target roles:** ${opts.target_roles?.join(", ") ?? "Not specified"}
${opts.base_cv ? `**Current background:**\n${opts.base_cv.slice(0, 1500)}` : ""}

Evaluate this project idea as a portfolio piece for this candidate's job search. Focus on whether it will genuinely help them get hired — not just whether it's technically interesting. Be honest: if there's a higher-leverage use of their time, say so.`;
}
