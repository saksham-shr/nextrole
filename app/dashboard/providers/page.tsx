import { createClient } from "@/lib/supabase/server";
import { decrypt, keyHint } from "@/lib/crypto";
import { ProvidersPageContent } from "@/components/nextrole/providers-page";
import type { CredentialInfo } from "@/components/nextrole/providers-page";
import { Display, Eyebrow } from "@/components/nextrole/ui";

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("provider_credentials")
    .select("*");

  const credentials: CredentialInfo[] = (rows ?? []).map((row) => {
    let hint: string | null = null;
    if (row.encrypted_key) {
      try {
        hint = keyHint(decrypt(row.encrypted_key));
      } catch {
        hint = "••••••••••••"; // decryption failed (wrong key env)
      }
    }
    return {
      provider: row.provider,
      model: row.model,
      is_active: row.is_active,
      last_used_at: row.last_used_at,
      key_hint: hint,
    };
  });

  return (
    <div>
      <div className="mb-8">
        <Eyebrow>NextRole workspace</Eyebrow>
        <Display className="mt-2 text-4xl sm:text-5xl">Providers</Display>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--muted-foreground)] sm:text-base">
          Choose API or manual execution mode and manage provider defaults.
        </p>
      </div>
      <ProvidersPageContent
        credentials={credentials}
        error={error}
        message={message}
      />
    </div>
  );
}
