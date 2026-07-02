export type Tier = "free" | "starter" | "pro";

// Daily credits replenished each midnight while subscription is active.
export const DAILY_CREDITS: Record<Tier, number> = {
  free:    0,
  starter: 100,
  pro:     300,
};

// Credit cost per task. autofill (plain) is always 0 — free for all tiers.
export const CREDIT_COSTS = {
  evaluate:        5,
  resume_standard: 10,
  resume_premium:  25,
  autofill:        0,   // plain fill from profile — no charge
  autofill_tailor: 10,  // AI rewrites all profile fields for the job
  suggest:         5,   // AI generates one custom Q answer — per field
} as const;

export type CreditTask = keyof typeof CREDIT_COSTS;

// Premium resume lifetime cap per user across all tiers.
export const PREMIUM_RESUME_LIFETIME_CAP = 10;

// Top-up packs — Pro only.
export const TOPUP_PACKS = [
  { id: "mini",   credits: 100,  inr: 99   },
  { id: "small",  credits: 300,  inr: 249  },
  { id: "medium", credits: 750,  inr: 549  },
  { id: "large",  credits: 2000, inr: 1299 },
] as const;

export type TopupPackId = typeof TOPUP_PACKS[number]["id"];

// Feature gate matrix.
// Credit-gated features (autofill_tailor, suggest, evaluate, resumes) are
// allowed on all tiers — credit availability is the natural gate for free users.
// Only features with a hard tier wall are listed as starter+/pro only.
const GATES: Record<string, Tier[]> = {
  browser_extension: ["free", "starter", "pro"],
  evaluate:          ["free", "starter", "pro"],
  resume_standard:   ["free", "starter", "pro"],
  pipeline:          ["free", "starter", "pro"],
  autofill:          ["free", "starter", "pro"],
  autofill_tailor:   ["free", "starter", "pro"],
  suggest:           ["free", "starter", "pro"],

  // Starter+ only
  explore:           ["starter", "pro"],

  // Pro only
  resume_premium:    ["pro"],
  topup:             ["pro"],
};

export function canAccess(tier: Tier, feature: string): boolean {
  return GATES[feature]?.includes(tier) ?? false;
}

export function isPremiumTask(task: CreditTask): boolean {
  return task === "resume_premium";
}
