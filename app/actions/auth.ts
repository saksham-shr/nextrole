"use server";

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

const ADMIN_EMAIL = (process.env.ADMIN_EMAIL ?? "").toLowerCase();

/** Returns true if the email is allowed during private beta. */
export async function checkBetaAccess(email: string): Promise<boolean> {
  return email.trim().toLowerCase() === ADMIN_EMAIL;
}

export async function signOut() {
  const supabase = await createClient();

  // Revoke the session on Supabase's end (global scope kills all devices).
  await supabase.auth.signOut({ scope: "global" });

  // Belt-and-suspenders: explicitly delete every sb-* cookie so a still-valid
  // JWT cannot cause a /login → /dashboard redirect loop after sign-out.
  // The server.ts setAll handler has a silent try/catch for Server Component
  // contexts — this bypasses it entirely and clears cookies directly.
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith("sb-")) {
      cookieStore.delete(cookie.name);
    }
  }

  redirect("/login");
}
