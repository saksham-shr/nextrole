"use server";

import { createHash, randomBytes } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function generateToken(): string {
  return "nrt_" + randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createExtensionToken(): Promise<
  { ok: true; token: string } | { ok: false; error: string }
> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not authenticated" };

  const admin = createAdminClient();
  const token = generateToken();
  const tokenHash = hashToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();

  const { error } = await admin
    .from("extension_tokens")
    .insert({
      user_id: user.id,
      token_hash: tokenHash,
      name: "Browser Extension",
      expires_at: expiresAt,
    });

  if (error) return { ok: false, error: error.message };
  return { ok: true, token };
}
