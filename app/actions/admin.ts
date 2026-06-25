"use server";

import { revalidatePath } from "next/cache";
import { createClient as createSupabaseAdminClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logAdminAction } from "@/lib/admin/audit";
import { invalidateCommerceCache } from "@/lib/commerce/config";
import type { Database, UserTier, CommerceConfigRow } from "@/lib/db/types";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();
const TIER_CREDITS: Partial<Record<UserTier, number>> = { pro: 300, starter: 100, free: 0 };

async function requireAdmin(): Promise<{ id: string; email: string } | { error: string }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Unauthorized" };
  const email = (user.email ?? "").toLowerCase();
  if (email !== ADMIN_EMAIL) return { error: "Forbidden" };
  return { id: user.id, email };
}

async function assertAdmin() {
  const r = await requireAdmin();
  if ("error" in r) throw new Error(r.error);
  return r;
}

// ── Delete a user account (form action; existing button uses this) ──────────
export async function deleteUser(formData: FormData) {
  const actor = await assertAdmin();

  const userId = formData.get("userId") as string;
  if (!userId) throw new Error("Missing userId");
  if (userId === actor.id) throw new Error("Cannot delete your own account");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) throw new Error("Service role key not configured");

  const admin = createSupabaseAdminClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const adminScoped = createAdminClient();
  const { data: profileBefore } = await adminScoped
    .from("profiles")
    .select("tier, credits_remaining, full_name, email")
    .eq("id", userId)
    .single();
  const { data: authUser } = await admin.auth.admin.getUserById(userId);
  const targetEmail = authUser?.user?.email ?? null;

  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(error.message);

  await logAdminAction({
    actorId:    actor.id,
    actorEmail: actor.email,
    action:     "delete_user",
    targetType: "user",
    targetId:   userId,
    before:     { ...(profileBefore as Record<string, unknown> | null), email: targetEmail },
    after:      null,
  });

  revalidatePath("/dashboard/admin");
}

// ── Grant a tier to a user ─────────────────────────────────────────────────
export async function grantTier(targetUserId: string, tier: UserTier, durationDays: number = 30) {
  const actor = await requireAdmin();
  if ("error" in actor) return { error: actor.error };

  const admin = createAdminClient();

  const { data: before } = await admin
    .from("profiles")
    .select("tier, credits_remaining, subscription_ends_at, subscription_status")
    .eq("id", targetUserId)
    .single();

  const credits = TIER_CREDITS[tier] ?? 0;
  const endsAt = tier === "free"
    ? null
    : new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await admin.from("profiles").update({
    tier,
    credits_remaining:    credits,
    subscription_ends_at: endsAt,
    subscription_status:  tier === "free" ? "expired" : "active",
  }).eq("id", targetUserId);

  if (error) return { error: error.message };

  await logAdminAction({
    actorId:    actor.id,
    actorEmail: actor.email,
    action:     "grant_tier",
    targetType: "user",
    targetId:   targetUserId,
    before:     before as Record<string, unknown> | null,
    after:      { tier, credits_remaining: credits, subscription_ends_at: endsAt },
    metadata:   { duration_days: durationDays },
  });

  revalidatePath("/dashboard/admin");
  return { ok: true };
}

// ── Add bonus credits (goes into bonus bucket, logged in usage_log) ────────
export async function addBonusCredits(targetUserId: string, amount: number) {
  const actor = await requireAdmin();
  if ("error" in actor) return { error: actor.error };
  if (amount <= 0 || amount > 100_000) return { error: "Amount must be 1–100000" };

  const admin = createAdminClient();

  const { data: before } = await admin
    .from("profiles")
    .select("credits_remaining, bonus_credits")
    .eq("id", targetUserId)
    .single();

  // add_credits RPC adds to bonus_credits + credits_remaining atomically
  const { error: rpcErr } = await admin.rpc("add_credits", {
    p_user_id: targetUserId,
    p_amount:  amount,
  });
  if (rpcErr) return { error: rpcErr.message };

  // Log in usage_log so it appears in the user's credit history
  await admin.from("usage_log").insert({
    user_id:       targetUserId,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activity_type: "admin_grant" as any,
    credits_used:  amount,
  });

  const { data: after } = await admin
    .from("profiles")
    .select("credits_remaining, bonus_credits")
    .eq("id", targetUserId)
    .single();

  await logAdminAction({
    actorId:    actor.id,
    actorEmail: actor.email,
    action:     "add_bonus_credits",
    targetType: "user",
    targetId:   targetUserId,
    before:     before as Record<string, unknown> | null,
    after:      after as Record<string, unknown> | null,
    metadata:   { amount },
  });

  revalidatePath("/dashboard/admin");
  return { ok: true };
}

// ── Update commerce config (prices, packs, flags) ──────────────────────────
export async function updateCommerceConfig(overrides: CommerceConfigRow["overrides"]) {
  const actor = await requireAdmin();
  if ("error" in actor) return { error: actor.error };

  // Validate shape — refuse bad data rather than corrupt the JSON column.
  if (overrides.plan_prices_inr) {
    for (const [key, val] of Object.entries(overrides.plan_prices_inr)) {
      if (typeof val !== "number" || val < 1 || val > 1_000_000) {
        return { error: `Invalid price for ${key}: must be 1–1,000,000 INR` };
      }
    }
  }
  if (overrides.topup_packs) {
    if (!Array.isArray(overrides.topup_packs) || overrides.topup_packs.length === 0) {
      return { error: "topup_packs must be a non-empty array" };
    }
    for (const p of overrides.topup_packs) {
      if (!p.id || typeof p.credits !== "number" || typeof p.inr !== "number") {
        return { error: "Each topup pack needs id, credits, inr" };
      }
      if (p.inr < 1 || p.inr > 100_000 || p.credits < 1 || p.credits > 100_000) {
        return { error: `Pack ${p.id}: inr 1–100000, credits 1–100000` };
      }
    }
    const ids = new Set(overrides.topup_packs.map((p) => p.id));
    if (ids.size !== overrides.topup_packs.length) {
      return { error: "Duplicate pack ids" };
    }
  }

  const admin = createAdminClient();

  const { data: before } = await admin
    .from("commerce_config")
    .select("overrides")
    .eq("id", 1)
    .maybeSingle();

  const { error } = await admin
    .from("commerce_config")
    .update({ overrides, updated_by: actor.id, updated_at: new Date().toISOString() })
    .eq("id", 1);

  if (error) return { error: error.message };

  invalidateCommerceCache();

  await logAdminAction({
    actorId:    actor.id,
    actorEmail: actor.email,
    action:     "commerce_update",
    targetType: "commerce",
    targetId:   "global",
    before:     (before as { overrides: unknown } | null)?.overrides as Record<string, unknown> | null,
    after:      overrides as Record<string, unknown>,
  });

  revalidatePath("/dashboard/admin");
  return { ok: true };
}
