import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// This page is the landing point after email confirmation.
// The auth callback exchanged the code and set a session. We sign out here
// so the user lands on a clean login page — they should sign in deliberately.
export default async function ConfirmedPage() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect(
    "/login?message=" +
      encodeURIComponent("Email confirmed — sign in to get started"),
  );
}
