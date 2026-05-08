/**
 * Shared auth helper for all /api/extension/* routes.
 * Validates an opaque extension token sent as "Authorization: Bearer nrt_<hex>".
 * Returns { userId, tier } or null if unauthorized / expired.
 */

import { createHash } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserTier } from "@/lib/db/types";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function resolveExtensionUser(
  token: string,
): Promise<{ userId: string; tier: UserTier } | null> {
  if (!token.startsWith("nrt_")) return null;

  const admin = createAdminClient();
  const tokenHash = hashToken(token);

  const { data: row } = await admin
    .from("extension_tokens")
    .select("id, user_id, expires_at")
    .eq("token_hash", tokenHash)
    .single();

  if (!row) return null;
  if (new Date(row.expires_at) < new Date()) return null;

  // Fire-and-forget last_used_at update
  admin
    .from("extension_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => {});

  const { data: profile } = await admin
    .from("profiles")
    .select("tier")
    .eq("id", row.user_id)
    .single();

  const tier = ((profile?.tier as string | null) ?? "free") as UserTier;

  return { userId: row.user_id, tier };
}
