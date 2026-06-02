import { redirect } from "next/navigation";
import { randomBytes, createHash } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ConnectExtensionLoginClient, InstallExtensionPage } from "./client";

export const metadata = { title: "Connect Extension — NextRole" };

function isValidRedirectTo(value: string | null): value is string {
  if (!value) return false;
  try {
    const u = new URL(value);
    return u.protocol === "https:" && u.hostname.endsWith(".chromiumapp.org");
  } catch {
    return false;
  }
}

function generateToken(): string {
  return "nrt_" + randomBytes(32).toString("hex");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export default async function ConnectExtensionPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_to?: string; error?: string; force_login?: string }>;
}) {
  const { redirect_to, error, force_login } = await searchParams;

  if (!isValidRedirectTo(redirect_to ?? null)) {
    const supabase2 = await createClient();
    const { data: { user: u } } = await supabase2.auth.getUser();
    if (u) return <InstallExtensionPage />;
    redirect("/login");
  }

  const redirectTo = redirect_to as string;

  const supabase = await createClient();

  // Switch-account flow: extension passes force_login=1 to force the login UI
  // even if a session cookie is present (so the user can pick a different
  // account before the new token is minted).
  if (force_login === "1") {
    await supabase.auth.signOut({ scope: "local" });
    return <ConnectExtensionLoginClient redirectTo={redirectTo} error={error} />;
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    // Create token entirely server-side — no client fetch, no CSRF issues.
    // Keep redirect() calls OUTSIDE try/catch: Next.js redirect() throws NEXT_REDIRECT
    // internally, so wrapping it in catch causes an infinite redirect loop.
    let tokenValue: string | null = null;
    let tokenErrorMsg: string | null = null;

    try {
      const admin = createAdminClient();
      const token = generateToken();
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 90).toISOString();

      const { error: insertError } = await admin
        .from("extension_tokens")
        .insert({
          user_id: user.id,
          token_hash: tokenHash,
          name: "Browser Extension",
          expires_at: expiresAt,
        });

      if (insertError) {
        console.error("[connect-extension] insert error:", insertError.message, insertError.code);
        tokenErrorMsg = insertError.message;
      } else {
        tokenValue = token;
      }
    } catch (err) {
      console.error("[connect-extension] exception:", err);
      tokenErrorMsg = err instanceof Error ? err.message : "Failed to create token — please try again";
    }

    if (tokenErrorMsg) {
      redirect(`/connect-extension?redirect_to=${encodeURIComponent(redirectTo)}&error=${encodeURIComponent(tokenErrorMsg)}`);
    }

    redirect(`${redirectTo}?token=${encodeURIComponent(tokenValue!)}`);
  }

  // Not logged in — show login UI
  return <ConnectExtensionLoginClient redirectTo={redirectTo} error={error} />;
}
