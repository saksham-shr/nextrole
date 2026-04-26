"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { encrypt } from "@/lib/crypto";
import type { ProviderType } from "@/lib/db/types";

export async function saveProviderKey(formData: FormData) {
  const provider = formData.get("provider") as ProviderType;
  const rawKey = (formData.get("key") as string | null)?.trim() ?? "";
  const model = (formData.get("model") as string | null)?.trim() ?? "";

  if (!rawKey) {
    redirect(`/dashboard/providers?error=API+key+is+required`);
  }

  if (!["anthropic", "openai", "gemini"].includes(provider)) {
    redirect(`/dashboard/providers?error=Invalid+provider`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  let encryptedKey: string;
  try {
    encryptedKey = encrypt(rawKey);
  } catch {
    redirect(
      `/dashboard/providers?error=Encryption+key+not+configured+on+server`,
    );
  }

  const { error } = await supabase.from("provider_credentials").upsert(
    {
      user_id: user.id,
      provider,
      encrypted_key: encryptedKey,
      model: model || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,provider" },
  );

  if (error) {
    redirect(
      `/dashboard/providers?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/dashboard/providers?message=${provider}+key+saved`);
}

export async function removeProvider(formData: FormData) {
  const provider = formData.get("provider") as ProviderType;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { error } = await supabase
    .from("provider_credentials")
    .delete()
    .eq("user_id", user.id)
    .eq("provider", provider);

  if (error) {
    redirect(
      `/dashboard/providers?error=${encodeURIComponent(error.message)}`,
    );
  }

  redirect(`/dashboard/providers?message=${provider}+key+removed`);
}
