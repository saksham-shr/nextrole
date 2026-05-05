type Tier = "free" | "starter" | "pro" | "team" | "byok";

// Job pipeline limits per tier (-1 = unlimited)
export const JOB_LIMITS: Record<Tier, number> = {
  free:    5,
  starter: 25,
  pro:     -1,
  team:    -1,
  byok:    -1,
};

// Features available per tier
const GATES: Record<string, Tier[]> = {
  // Available to all
  resume_scan:      ["free", "starter", "pro", "team", "byok"],
  job_match_score:  ["free", "starter", "pro", "team", "byok"],
  browser_extension:["free", "starter", "pro", "team", "byok"],

  // Starter+
  job_comparison:   ["starter", "pro", "team", "byok"],
  resume_tailor:    ["starter", "pro", "team", "byok"],
  interview_prep:   ["starter", "pro", "team", "byok"],
  export:           ["starter", "pro", "team", "byok"],
  templates:        ["starter", "pro", "team", "byok"],
  apply:            ["starter", "pro", "team", "byok"],
  followup:         ["starter", "pro", "team", "byok"],
  contact_draft:    ["starter", "pro", "team", "byok"],
  story:            ["starter", "pro", "team", "byok"],
  training_eval:    ["starter", "pro", "team", "byok"],

  // Pro+
  cover_letter:     ["pro", "team", "byok"],
  negotiate:        ["pro", "team", "byok"],
  deep_research:    ["pro", "team", "byok"],
  batch:            ["pro", "team", "byok"],
  auto_evaluate:    ["pro", "team", "byok"],
  priority_queue:   ["pro", "team", "byok"],

  // Team only
  team_dashboard:   ["team"],
};

export function canAccess(tier: Tier, feature: string): boolean {
  return GATES[feature]?.includes(tier) ?? false;
}

export function isAdvancedAI(tier: Tier): boolean {
  return tier === "pro" || tier === "team" || tier === "byok";
}

export function jobLimit(tier: Tier): number {
  return JOB_LIMITS[tier];
}
