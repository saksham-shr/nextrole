"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign-out is the only auth action that lives server-side. The proxy needs the
 * sb-* cookies cleared on the response, which only happens reliably from a
 * server action that returns a redirect.
 *
 * Sign-in, sign-up, password reset and OTP verification all run client-side
 * via the browser Supabase client (see components/nextrole/auth-pages.tsx).
 * Doing those flows in the browser avoids the entire class of "cookies set
 * during a server action don't survive the redirect" bugs we hit before.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
