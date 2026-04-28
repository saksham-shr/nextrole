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

  const email = formData.get("email") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password: formData.get("password") as string,
    options: {
      // After confirming, land on /auth/confirmed which signs the user out
      // and redirects to /login with a success message.
      emailRedirectTo: `${origin}/auth/callback?next=/auth/confirmed`,
    },
  });
  if (error) {
    redirect(`/signup?error=${encodeURIComponent(error.message)}`);
  }

  // If Supabase returned a live session, email confirmation is disabled —
  // the user is already signed in, send them straight to the dashboard.
  if (data.session) {
    redirect("/dashboard");
  }

  // Email confirmation is enabled — show the confirm screen on the same page.
  redirect(`/signup?step=confirm&email=${encodeURIComponent(email)}`);
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
    redirect(`/signup?step=confirm&email=&error=Please+enter+your+email+address`);
  }

  const supabase = await createClient();
  const headersList = await headers();
  const origin = getSiteOrigin(headersList.get("origin"));

  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/dashboard`,
    },
  });

  if (error) {
    redirect(
      `/signup?step=confirm&email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`,
    );
  }
  redirect(
    `/signup?step=confirm&email=${encodeURIComponent(email)}&message=${encodeURIComponent("New code sent — check your inbox")}`,
  );
}

export async function verifyOtp(formData: FormData) {
  const email = formData.get("email") as string;
  const token = (formData.get("token") as string)?.replace(/\s/g, "");

  if (!token || token.length !== 6) {
    redirect(
      `/signup?step=confirm&email=${encodeURIComponent(email)}&error=Enter+the+6-digit+code+from+your+email`,
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "signup",
  });

  if (error) {
    redirect(
      `/signup?step=confirm&email=${encodeURIComponent(email)}&error=${encodeURIComponent(error.message)}`,
    );
  }

  // Verification succeeded — user is now signed in, go to dashboard.
  // If for some reason the session wasn't created, fall back to login.
  if (!data.session) {
    redirect("/login?message=Email+verified+%E2%80%94+sign+in+to+continue");
  }

  redirect("/dashboard");
}
