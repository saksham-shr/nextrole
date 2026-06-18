export type Tier = "free" | "starter" | "pro";

// Daily credits per plan — reset every midnight while subscription is active.
export const DAILY_CREDITS: Record<Tier, number> = {
  free:    0,
  starter: 100,
  pro:     300,
};

// Credit cost per task type
export const CREDIT_COSTS = {
  evaluate:        5,
  resume_standard: 10,
  resume_premium:  25,
  autofill:        2,
  tailor:          8,   // One tailor session = up to 5 freeform fields, single AI call
} as const;

export type CreditTask = keyof typeof CREDIT_COSTS;

// Premium resume lifetime cap per user (regardless of tier)
export const PREMIUM_RESUME_LIFETIME_CAP = 10;

// Top-up packs — Pro only. Prices stored in INR; USD computed at display time.
export const TOPUP_PACKS = [
  { id: "mini",   credits: 100,  inr: 99  },
  { id: "small",  credits: 300,  inr: 249 },
  { id: "medium", credits: 750,  inr: 549 },
  { id: "large",  credits: 2000, inr: 1299 },
] as const;

export type TopupPackId = typeof TOPUP_PACKS[number]["id"];

// Feature gate matrix
const GATES: Record<string, Tier[]> = {
  // All tiers
  browser_extension: ["free", "starter", "pro"],
  evaluate:          ["free", "starter", "pro"],
  resume_standard:   ["free", "starter", "pro"],
  pipeline:          ["free", "starter", "pro"],

  // Starter+
  autofill:         ["starter", "pro"],
  tailor:           ["starter", "pro"],

  // Pro only
  resume_premium:   ["pro"],
  topup:            ["pro"],
};

export function canAccess(tier: Tier, feature: string): boolean {
  return GATES[feature]?.includes(tier) ?? false;
}

// Which tasks get expensive model routing
export function isPremiumTask(task: CreditTask): boolean {
  return task === "resume_premium";
}
