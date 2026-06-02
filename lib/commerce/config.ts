import { createAdminClient } from "@/lib/supabase/admin";
import { TOPUP_PACKS } from "@/lib/ai/gates";
import { INR_PRICES } from "@/lib/hooks/use-currency";
import type { CommerceConfigRow } from "@/lib/db/types";

export interface EffectiveCommerce {
  planPricesInr: Record<string, number>;
  topupPacks: Array<{ id: string; credits: number; inr: number }>;
  flags: { starter_enabled: boolean; pro_enabled: boolean; topups_enabled: boolean };
  updatedAt: string | null;
  updatedBy: string | null;
}

const DEFAULTS: EffectiveCommerce = {
  planPricesInr: { ...INR_PRICES },
  topupPacks: TOPUP_PACKS.map((p) => ({ id: p.id, credits: p.credits, inr: p.inr })),
  flags: { starter_enabled: true, pro_enabled: true, topups_enabled: true },
  updatedAt: null,
  updatedBy: null,
};

/**
 * Custom error thrown by getCommerceConfig() when the DB read fails AND no
 * last-known-good cache is available. Billing-critical callers
 * (/api/razorpay/create-order, /api/razorpay/verify-payment) should treat
 * this as "fail closed": return 503, not silently fall back to defaults
 * that may sell disabled plans or charge stale prices.
 *
 * Display-only callers (e.g. public /pricing) MAY catch this and fall back
 * to defaults for rendering, but should be honest about it.
 */
export class CommerceConfigUnavailableError extends Error {
  constructor(reason: string) {
    super(`Commerce config unavailable: ${reason}`);
    this.name = "CommerceConfigUnavailableError";
  }
}

// 30 s cache so admin updates propagate quickly without DB hammering.
// During the cache window we serve last-known-good even if the upstream
// query starts failing — that's safe (the previous read succeeded).
let cached: { value: EffectiveCommerce; at: number } | null = null;
const TTL_MS = 30_000;

// Last-known-good cache that is NEVER auto-invalidated by TTL. If a fresh
// read fails AND the live cache has expired, we serve from here with a
// warning rather than silently reverting to defaults. Only cleared when a
// successful read replaces it or when an admin explicitly invalidates.
let lastKnownGood: EffectiveCommerce | null = null;

export function invalidateCommerceCache() {
  cached = null;
}

export async function getCommerceConfig(): Promise<EffectiveCommerce> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return cached.value;

  let admin: ReturnType<typeof createAdminClient>;
  try {
    admin = createAdminClient();
  } catch (err) {
    // Admin client not configured at all (dev environment without service
    // role key, or env-var typo in prod). Serve last-known-good if we have
    // one; otherwise fail closed with an explicit error.
    if (lastKnownGood) {
      console.warn("[commerce/config] admin client unavailable; serving last-known-good", err);
      return lastKnownGood;
    }
    throw new CommerceConfigUnavailableError(
      err instanceof Error ? err.message : "admin client init failed"
    );
  }

  const { data, error } = await admin
    .from("commerce_config")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    if (lastKnownGood) {
      console.warn("[commerce/config] DB read failed; serving last-known-good:", error.message);
      return lastKnownGood;
    }
    throw new CommerceConfigUnavailableError(error.message);
  }

  const row = data as CommerceConfigRow | null;
  const overrides = row?.overrides ?? {};

  const sanitizedOverrides = Object.fromEntries(
    Object.entries(overrides.plan_prices_inr ?? {}).filter(([, v]) => typeof v === "number"),
  ) as Record<string, number>;

  const merged: EffectiveCommerce = {
    planPricesInr: { ...DEFAULTS.planPricesInr, ...sanitizedOverrides },
    topupPacks: overrides.topup_packs ?? DEFAULTS.topupPacks,
    flags: { ...DEFAULTS.flags, ...(overrides.flags ?? {}) },
    updatedAt: row?.updated_at ?? null,
    updatedBy: row?.updated_by ?? null,
  };

  cached = { value: merged, at: now };
  lastKnownGood = merged;
  return merged;
}

export function getCommerceDefaults(): EffectiveCommerce {
  return DEFAULTS;
}
