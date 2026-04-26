export type ApplyQuestion =
  | "why_company"
  | "why_role"
  | "about_yourself"
  | "salary_expectations"
  | "notable_project"
  | "cover_letter";

export const APPLY_QUESTION_LABELS: Record<ApplyQuestion, string> = {
  why_company: "Why this company?",
  why_role: "Why this role?",
  about_yourself: "Tell us about yourself",
  salary_expectations: "Salary expectations",
  notable_project: "Notable project",
  cover_letter: "Cover letter opening",
};

export const APPLY_SYSTEM_PROMPT = `You are a senior career coach writing tailored job application answers for a candidate. You write in first person as the candidate. Your answers are:
- Concise and confident (2-4 sentences unless stated otherwise)
- Specific to the company and role — no generic filler
- Grounded in the candidate's actual CV and evaluation insights
- Professional but human — not overly formal

Respond with only the answer text. No commentary, no labels, no preamble.`;

export function buildApplyPrompt(opts: {
  question: ApplyQuestion;
  title: string;
  company: string;
  description: string;
  base_cv: string;
  eval_summary?: string | null;
  comp_min?: number | null;
  comp_max?: number | null;
}): string {
  const questionInstructions: Record<ApplyQuestion, string> = {
    why_company: `Write a 2-3 sentence answer to "Why do you want to work at ${opts.company}?" that feels personal and researched, not generic. Draw on signals from the job description and the candidate's professional interests from their CV.`,
    why_role: `Write a 2-3 sentence answer to "Why are you interested in this ${opts.title} role?" that connects the candidate's specific background to this role's requirements. Be concrete.`,
    about_yourself: `Write a 3-4 sentence professional pitch that works as a spoken or written "tell me about yourself" answer. Highlight the 2-3 most relevant aspects of the candidate's background for this specific role.`,
    salary_expectations: `Write 2-3 sentences addressing salary expectations for this role. ${opts.comp_min && opts.comp_max ? `The candidate's target range is £${opts.comp_min.toLocaleString()}–£${opts.comp_max.toLocaleString()} (or equivalent in local currency).` : "State the candidate is open to discussion based on the full package."} Be confident but leave room to negotiate.`,
    notable_project: `Write 3-4 sentences describing the most relevant project from the candidate's CV for this role. Use the STAR structure implicitly (situation, action, result) but write it as flowing prose, not a list. Make it specific and quantified where possible.`,
    cover_letter: `Write a strong 3-sentence opening paragraph for a cover letter for this role. The first sentence should hook with something specific about the company or role. The second should establish the candidate's core relevant experience. The third should signal enthusiasm and fit. Do not start with "I am writing to apply…"`,
  };

  return `## Role
**Title:** ${opts.title}
**Company:** ${opts.company}

## Job Description
${opts.description}

## Candidate CV
${opts.base_cv}
${opts.eval_summary ? `\n## Evaluation Insight\n${opts.eval_summary}` : ""}

## Your task
${questionInstructions[opts.question]}`;
}
