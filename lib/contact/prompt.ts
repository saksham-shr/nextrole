export type ContactType =
  | "recruiter_intro"
  | "hiring_manager_outreach"
  | "peer_networking"
  | "referral_request"
  | "post_application_nudge";

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  recruiter_intro: "Recruiter introduction",
  hiring_manager_outreach: "Hiring manager outreach",
  peer_networking: "Peer networking note",
  referral_request: "Referral request",
  post_application_nudge: "Post-application nudge",
};

export const CONTACT_WHEN: Record<ContactType, string> = {
  recruiter_intro: "Cold outreach to a recruiter at a target company",
  hiring_manager_outreach: "Direct message to the hiring manager",
  peer_networking: "Connecting with someone in a similar role",
  referral_request: "Asking a contact for a referral",
  post_application_nudge: "Following up after an application with no response",
};

export const CONTACT_SYSTEM_PROMPT = `You are a senior career coach writing professional outreach messages for a job candidate. Messages must be:
- Short (3-5 sentences for most types, 4-6 for HM outreach)
- Specific to the company and role — not a mass blast
- Warm and human — not robotic or overly formal
- Opening with something specific, not "I saw you work at X"
- Easy to send via LinkedIn or email

Respond with only the message text, ready to copy and send.`;

export function buildContactPrompt(opts: {
  type: ContactType;
  company: string;
  title: string;
  description: string;
  base_cv: string;
  contact_name?: string | null;
  relationship_context?: string | null;
  candidate_name?: string | null;
}): string {
  const typeInstructions: Record<ContactType, string> = {
    recruiter_intro: `Write a cold LinkedIn intro from ${opts.candidate_name ?? "the candidate"} to a recruiter at ${opts.company}. Open with something specific about ${opts.company} (a product, milestone, or mission element from the JD). State the most compelling credential in one sentence. Express interest in the ${opts.title} role specifically. End with a soft ask for a brief call or response. 3-4 sentences.`,

    hiring_manager_outreach: `Write a direct LinkedIn or email message from ${opts.candidate_name ?? "the candidate"} to the hiring manager for the ${opts.title} role at ${opts.company}. Open with a specific insight about the team or problem they're solving (from JD context). Establish the candidate's most relevant credential. State genuine interest and ask for a 20-minute conversation. 4-5 sentences.`,

    peer_networking: `Write a peer networking note from ${opts.candidate_name ?? "the candidate"} to someone working in a similar role at ${opts.company}. Be curious and specific — reference what attracted them to ${opts.company} or this type of work. Ask one specific question about the team or culture. Keep it short and non-transactional. 3 sentences.`,

    referral_request: `Write a referral request message from ${opts.candidate_name ?? "the candidate"} to ${opts.contact_name ?? "a contact"} who works at ${opts.company}. Acknowledge the relationship context${opts.relationship_context ? ` (${opts.relationship_context})` : ""}. State which role they are applying for and why it's a strong fit. Ask politely if they'd be willing to refer or pass along their resume. 3-4 sentences.`,

    post_application_nudge: `Write a post-application follow-up from ${opts.candidate_name ?? "the candidate"} to a recruiter at ${opts.company}, sent after applying to the ${opts.title} role with no response after 1-2 weeks. Reference the application date (use a placeholder [date applied]). Briefly restate one key reason for fit. Ask politely if the role is still being filled. 3 sentences.`,
  };

  return `## Target
**Company:** ${opts.company}
**Role:** ${opts.title}${opts.contact_name ? `\n**Recipient:** ${opts.contact_name}` : ""}${opts.relationship_context ? `\n**Relationship context:** ${opts.relationship_context}` : ""}

## Job Description (for context)
${opts.description.slice(0, 1500)}

## Candidate Background (for context)
${opts.base_cv.slice(0, 1500)}

## Your task
${typeInstructions[opts.type]}`;
}
