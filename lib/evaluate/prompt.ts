// ============================================================
// Evaluate prompt — 7-block scoring with archetype detection
// Supports custom thresholds, language, and focus injection
// ============================================================

export const BASE_ARCHETYPES = [
  "FDE",           // Field / Developer Engineer
  "SA",            // Solutions Architect
  "PM",            // Product Manager
  "LLMOps",        // LLM / AI Operations
  "Agentic",       // AI Agent / Agentic systems
  "Transformation",// Digital Transformation / Consulting
  "Backend",
  "Frontend",
  "Fullstack",
  "Platform",
  "Product Eng",
  "Data / ML",
  "DevOps / SRE",
  "EM",            // Engineering Manager
  "Other",
] as const;

export type Archetype = (typeof BASE_ARCHETYPES)[number];

function decisionGuide(applyThreshold = 3.5, watchThreshold = 2.5): string {
  return `apply — Score >= ${applyThreshold} with no critical red flags; strong candidate-role alignment
watch — Score ${watchThreshold}-${applyThreshold - 0.01}, or good fit but timing/comp/red-flag issues; worth monitoring
skip  — Score < ${watchThreshold} or critical disqualifiers; not worth pursuing now`;
}

export function buildSystemPrompt(opts?: {
  applyThreshold?: number;
  watchThreshold?: number;
  customFocus?: string | null;
  language?: string | null;
  archetypes?: string[] | null;
}): string {
  const applyT = opts?.applyThreshold ?? 3.5;
  const watchT = opts?.watchThreshold ?? 2.5;
  const lang = opts?.language ?? "en";
  const archetypeList = (opts?.archetypes ?? BASE_ARCHETYPES).join(" | ");

  const langInstruction = lang !== "en"
    ? `\n\nIMPORTANT: Write all "summary", "details", "rationale", "notes", and "preparation_notes" fields in ${lang === "es" ? "Spanish" : lang === "fr" ? "French" : lang === "de" ? "German" : lang === "pt" ? "Portuguese" : lang === "zh" ? "Chinese (Simplified)" : lang === "ja" ? "Japanese" : lang === "ar" ? "Arabic" : lang === "hi" ? "Hindi" : `language code: ${lang}`}. Field keys stay in English.`
    : "";

  const focusInstruction = opts?.customFocus
    ? `\n\nCUSTOM EVALUATION FOCUS (apply these criteria especially in role_fit and cv_match):\n${opts.customFocus}`
    : "";

  return `You are a career intelligence engine evaluating job opportunities. You analyse roles across 8 structured blocks and produce a rigorous, honest assessment.

You MUST respond with valid JSON only — no markdown, no prose, no code fences. The JSON must match this exact structure:

{
  "blocks": {
    "role_fit": {
      "score": <number 1.0-5.0>,
      "summary": "<one sentence verdict>",
      "details": "<2-4 sentences of analysis>",
      "signals": ["<positive or negative signal>"]
    },
    "compensation_analysis": {
      "score": <number 1.0-5.0>,
      "summary": "<verdict on comp fit>",
      "details": "<analysis of compensation signals in the JD>",
      "market_position": "<below|at|above market>"
    },
    "cv_match": {
      "score": <number 1.0-5.0>,
      "summary": "<match verdict>",
      "coverage": "<estimated % of JD requirements the candidate meets>",
      "gaps": ["<missing skill or experience>"],
      "strengths": ["<matching strength from CV>"]
    },
    "personalization_guidance": {
      "summary": "<key hook to personalise the application>",
      "tactics": ["<specific tactic to tailor CV or cover letter>"],
      "angle": "<the single most powerful angle to lead with>"
    },
    "interview_signals": {
      "likely_topics": ["<probable interview focus area>"],
      "red_flags": ["<concern or warning from the JD>"],
      "preparation_notes": "<what to prepare for>"
    },
    "legitimacy_check": {
      "score": <number 1.0-5.0>,
      "verdict": "<legitimate|suspicious|unknown>",
      "notes": "<company health, role legitimacy, JD quality signals>"
    },
    "level_strategy": {
      "score": <number 1.0-5.0>,
      "summary": "<one sentence on career level and progression fit>",
      "seniority_fit": "<overleveled|right_level|underleveled>",
      "progression_value": "<high|medium|low>",
      "notes": "<2-3 sentences on how this role fits the candidate's career trajectory and whether taking it is a strategic move>"
    },
    "decision": {
      "score": <number 1.0-5.0>,
      "decision": "<apply|watch|skip>",
      "rationale": "<2-3 sentence synthesis explaining the recommendation>",
      "priority": "<high|medium|low>"
    }
  },
  "score": <number 1.0-5.0 — weighted average of role_fit, compensation_analysis, cv_match, legitimacy_check scores>,
  "decision": "<apply|watch|skip>",
  "archetype": "<best matching archetype from: ${archetypeList}>"
}

Scoring guide:
5.0 — Exceptional fit, strong signals across all dimensions
4.0-4.9 — Strong fit, minor gaps or unknowns
3.0-3.9 — Moderate fit, notable gaps or concerns
2.0-2.9 — Weak fit, significant misalignment
1.0-1.9 — Poor fit or serious red flags

Decision guide:
${decisionGuide(applyT, watchT)}

Archetype guide: pick the single closest archetype from the list above based on the job description's primary responsibilities and required skills.${langInstruction}${focusInstruction}`;
}

// Legacy export — uses defaults, keeps backward compat
export const SYSTEM_PROMPT = buildSystemPrompt();

export function buildUserPrompt(opts: {
  title: string;
  company: string;
  description: string;
  base_cv: string;
  archetype?: string | null;
  seniority?: string | null;
  target_roles?: string[] | null;
  current_comp?: number | null;
  comp_min?: number | null;
  comp_max?: number | null;
  work_mode?: string | null;
  target_locations?: string[] | null;
}): string {
  const compContext = [
    opts.current_comp ? `Current comp: ${opts.current_comp.toLocaleString()}` : null,
    opts.comp_min && opts.comp_max
      ? `Target range: ${opts.comp_min.toLocaleString()} – ${opts.comp_max.toLocaleString()}`
      : opts.comp_min
        ? `Minimum: ${opts.comp_min.toLocaleString()}`
        : null,
  ]
    .filter(Boolean)
    .join(" | ");

  return `## Role
**Title:** ${opts.title}
**Company:** ${opts.company}${opts.archetype ? `\n**Archetype hint:** ${opts.archetype}` : ""}

## Job Description
${opts.description}

## Candidate Profile
${opts.seniority ? `**Seniority:** ${opts.seniority}` : ""}
${opts.target_roles?.length ? `**Target roles:** ${opts.target_roles.join(", ")}` : ""}
${opts.work_mode ? `**Work mode preference:** ${opts.work_mode}` : ""}
${opts.target_locations?.length ? `**Target locations:** ${opts.target_locations.join(", ")}` : ""}
${compContext ? `**Compensation context:** ${compContext}` : ""}

### CV
${opts.base_cv}

Evaluate this role against the candidate's profile across all 7 blocks. Be direct and honest — a "skip" verdict when warranted is more valuable than false optimism. Detect the correct archetype. Respond with JSON only.`;
}
