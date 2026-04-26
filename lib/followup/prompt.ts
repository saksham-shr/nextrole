export type FollowupType =
  | "day7_bump"
  | "post_screen_thanks"
  | "post_interview_thanks"
  | "no_response_nudge"
  | "recruiter_intro";

export const FOLLOWUP_TYPE_LABELS: Record<FollowupType, string> = {
  day7_bump: "7-day application bump",
  post_screen_thanks: "Post-screen thank you",
  post_interview_thanks: "Post-interview thank you",
  no_response_nudge: "No-response nudge (2+ weeks)",
  recruiter_intro: "Cold recruiter introduction",
};

export const FOLLOWUP_SYSTEM_PROMPT = `You are a senior career coach writing professional follow-up messages for a job candidate. Your messages are:
- Short and respectful of the reader's time (3-5 sentences max unless it's a cover-style intro)
- Warm but professional — not sycophantic
- Specific to the company and role
- Easy to send as a LinkedIn message or brief email

Respond with only the message text, ready to copy and send. No subject line, no labels, no commentary.`;

export function buildFollowupPrompt(opts: {
  type: FollowupType;
  title: string;
  company: string;
  description: string;
  base_cv: string;
  candidate_name?: string | null;
}): string {
  const name = opts.candidate_name ?? "the candidate";

  const typeInstructions: Record<FollowupType, string> = {
    day7_bump: `Write a brief, friendly follow-up message for ${name} to send 7 days after applying for the ${opts.title} role at ${opts.company}. Express continued interest, add one specific sentence about why this role is a strong fit, and ask politely about next steps. 3-4 sentences.`,

    post_screen_thanks: `Write a thank-you message for ${name} to send within 24 hours of a recruiter or phone screen for the ${opts.title} role at ${opts.company}. Thank them for their time, reinforce one specific reason for excitement about the role, and confirm availability for next steps. 3 sentences.`,

    post_interview_thanks: `Write a post-interview thank-you message for ${name} to send within 24 hours of an interview for the ${opts.title} role at ${opts.company}. Express genuine enthusiasm, reference one specific thing discussed in the interview (leave a placeholder [mention something specific from the interview] for the candidate to fill in), and confirm strong interest in moving forward. 3-4 sentences.`,

    no_response_nudge: `Write a polite follow-up nudge for ${name} to send after 2-3 weeks of silence following their application to the ${opts.title} role at ${opts.company}. Acknowledge the team is busy, briefly restate interest, and ask whether the role is still active. Keep it under 3 sentences — short is key here.`,

    recruiter_intro: `Write a concise cold introduction message for ${name} to send to a recruiter or hiring manager at ${opts.company} about the ${opts.title} role. Open with a specific hook related to the company, state the most relevant credential from the CV in one sentence, and ask for a brief conversation. 3-4 sentences. This should feel personal and researched, not like a blast message.`,
  };

  return `## Target Role
**Title:** ${opts.title}
**Company:** ${opts.company}

## Job Description (for context)
${opts.description.slice(0, 2000)}${opts.description.length > 2000 ? "\n[truncated]" : ""}

## Candidate Background (for context)
${opts.base_cv.slice(0, 2000)}${opts.base_cv.length > 2000 ? "\n[truncated]" : ""}

## Your task
${typeInstructions[opts.type]}`;
}
