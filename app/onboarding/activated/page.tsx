/**
 * Landing page after Lemon Squeezy checkout success.
 * Marks onboarding complete and redirects to dashboard.
 * Configure LS "Redirect URL" to point here.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function ActivatedPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("tier, subscription_status")
    .eq("id", user.id)
    .single();

  const hasPaidSubscription =
    profile?.tier &&
    profile.tier !== "free" &&
    profile.subscription_status === "active";

  if (hasPaidSubscription) {
    // Paid tier was confirmed by webhook.
    await supabase
      .from("profiles")
      .update({ onboarding_completed: true })
      .eq("id", user.id);
  } else {
    // Checkout was skipped/abandoned or webhook hasn't granted paid status.
    // User proceeds on free tier until they upgrade.
    await supabase
      .from("profiles")
      .update({
        tier: "free",
        onboarding_completed: true,
      })
      .eq("id", user.id);
  }

  redirect("/dashboard");
}
