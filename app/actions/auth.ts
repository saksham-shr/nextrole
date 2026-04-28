"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const email = formData.get("email") as string;
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: formData.get("password") as string,
  });
  if (error) {
    // If the account exists but isn't confirmed, clear any stale session
    // cookie and send them to the resend flow so they can get a fresh link.
    if (
      error.message.toLowerCase().includes("email not confirmed") ||
      error.message.toLowerCase().includes("not confirmed")
    ) {
      await supabase.auth.signOut();
      redirect(
        `/login?resend=1&error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}`,
      );
    }
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}

function getSiteOrigin(requestOrigin: string | null): string {
  // Prefer the explicit env var — always correct in production.
  // Fall back to the request Origin header, then localhost for local dev.
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    requestOrigin ??
    "http://localhost:3000"
  );
}

export async function signUp(formData: FormData) {
  const agreedToTerms = formData.get("agreeToTerms") === "yes";
  if (!agreedToTerms) {
    redirect("/signup?error=You+must+agree+to+the+Terms+of+Use");
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = getSiteOrigin(headersList.get("origin"));

  const { error } = await supabase.auth.signUp({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    options: {
      // After confirming email, land on onboarding so new users are guided
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard/onboarding`,
    },
  });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }
  // Stay on the signup page and show the confirmation screen with the email
  // pre-filled so the user can open their inbox or resend.
  redirect(`/signup?step=confirm&email=${encodeURIComponent(formData.get("email") as string)}`);
}

export async function forgotPassword(formData: FormData) {
  const supabase = await createClient();
  const headersList = await headers();
  const origin = getSiteOrigin(headersList.get("origin"));

  const { error } = await supabase.auth.resetPasswordForEmail(
    formData.get("email") as string,
    { redirectTo: `${origin}/auth/callback?next=/reset-password` },
  );
  if (error) {
    redirect(`/forgot-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/forgot-password?message=Reset+link+sent%2C+check+your+email");
}

export async function resetPassword(formData: FormData) {
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;
  if (password !== confirm) {
    redirect("/reset-password?error=Passwords+do+not+match");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/dashboard");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function resendConfirmation(formData: FormData) {
  const email = formData.get("email") as string;
  if (!email) {
    redirect("/login?resend=1&error=Please+enter+your+email+address");
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = getSiteOrigin(headersList.get("origin"));

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard/onboarding`,
    },
  });

  if (error) {
    redirect(
      `/login?resend=1&error=${encodeURIComponent(error.message)}&email=${encodeURIComponent(email)}`,
    );
  }
  redirect(
    `/login?message=${encodeURIComponent("Confirmation email resent — check your inbox")}`,
  );
}
