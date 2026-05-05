/**
 * Shared auth helper for all /api/extension/* routes.
 * Validates a Supabase JWT sent as "Authorization: Bearer <token>".
 * Returns { userId, tier } or null if unauthorized.
 */

import { createAdminClient } from "@/lib/supabase/admin";
import type { UserTier } from "@/lib/db/types";

export async function resolveUserFromJWT(
  token: string,
): Promise<{ userId: string; tier: UserTier } | null> {
  const admin = createAdminClient();

  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  const { data: profile } = await admin
    .from("profiles")
    .select("tier")
    .eq("id", user.id)
    .single();

  const tier = ((profile?.tier as string | null) ?? "free") as UserTier;

  return { userId: user.id, tier };
}
