export const INTERVIEW_PREP_SYSTEM_PROMPT = `You are an expert interview coach preparing a candidate for a specific job opportunity. You have access to the job description, the candidate's CV, and their evaluation intelligence.

Generate a comprehensive interview preparation pack as valid JSON only:

{
  "overview": "<2-3 sentence summary of what this role needs and where the candidate should focus>",
  "key_themes": ["<theme1>", "<theme2>"],
  "elevator_pitch": "<30-second pitch tailored to this specific role and company>",
  "behavioral": [
    {
      "question": "<behavioral interview question>",
      "answer_guide": "<guide on how to answer — what to emphasize from this candidate's background>",
      "story_prompt": "<STAR story prompt referencing their actual CV experience>",
      "importance": "high|medium|low"
    }
  ],
  "technical": [
    {
      "question": "<technical question for this role>",
      "answer_guide": "<what a strong answer looks like, key concepts to cover>",
      "importance": "high|medium|low"
    }
  ],
  "situational": [
    {
      "question": "<situational or case-based question>",
      "answer_guide": "<approach and key points to make>",
      "importance": "high|medium|low"
    }
  ],
  "questions_to_ask": ["<smart question the candidate should ask the interviewer>"],
  "red_flags_to_address": ["<concern from the evaluation the candidate should proactively handle>"]
}

Rules:
- Generate 5-8 behavioral, 3-5 technical, 3-5 situational questions
- Questions must be grounded in the actual job description — no generic filler
- Answer guides must reference real content from the candidate's CV where possible
- STAR story prompts must point to actual experiences in the CV
- red_flags_to_address comes from cv_match gaps and legitimacy_check notes
- Respond with valid JSON only`;

export function buildInterviewPrepPrompt(opts: {
  jobTitle: string;
  jobCompany: string;
  jobDescription: string;
  cv: string;
  evalBlocks?: {
    role_fit?: Record<string, unknown> | null;
    cv_match?: Record<string, unknown> | null;
    interview_signals?: Record<string, unknown> | null;
    personalization_guidance?: Record<string, unknown> | null;
    legitimacy_check?: Record<string, unknown> | null;
  } | null;
}): string {
  const { jobTitle, jobCompany, jobDescription, cv, evalBlocks } = opts;

  const evalSection = evalBlocks
    ? `\n\n## Evaluation Intelligence\nRole Fit: ${JSON.stringify(evalBlocks.role_fit ?? {})}\nCV Match: ${JSON.stringify(evalBlocks.cv_match ?? {})}\nInterview Signals: ${JSON.stringify(evalBlocks.interview_signals ?? {})}\nPersonalization: ${JSON.stringify(evalBlocks.personalization_guidance ?? {})}\nLegitimacy: ${JSON.stringify(evalBlocks.legitimacy_check ?? {})}`
    : "";

  return `## Target Role
${jobTitle} at ${jobCompany}

## Job Description
${jobDescription.slice(0, 3000)}

## Candidate CV
${cv.slice(0, 3000)}${evalSection}

Generate a comprehensive interview preparation pack for this specific role and candidate. JSON only.`;
}
