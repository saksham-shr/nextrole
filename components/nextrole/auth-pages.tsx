"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { BrandWordmark } from "@/components/nextrole/brand";
import {
  Badge,
  Button,
  Display,
  InputField,
  Spinner,
  Surface,
} from "@/components/nextrole/ui";
import {
  signIn,
  signUp,
  forgotPassword,
  resetPassword,
  resendConfirmation,
} from "@/app/actions/auth";

function AuthSubmitButton({
  label,
  pendingLabel,
}: {
  label: string;
  pendingLabel: string;
}) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" tone="accent" disabled={pending}>
      {pending ? (
        <span className="flex items-center gap-2">
          <Spinner className="h-3.5 w-3.5 border-white border-t-transparent" />
          {pendingLabel}
        </span>
      ) : (
        label
      )}
    </Button>
  );
}

function TrialBanner() {
  return (
    <div className="mt-6 rounded-[22px] border border-[var(--accent)] bg-[#fcefe7] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--accent)]">
        14-day free trial
      </p>
      <p className="mt-2 text-sm font-bold text-[var(--foreground)]">
        No credit card required.
      </p>
      <p className="mt-2 text-sm leading-7 text-[var(--muted-foreground)]">
        Start with onboarding, connect a provider or use manual mode, and run
        the full workflow before worrying about billing infrastructure.
      </p>
    </div>
  );
}

function AuthShell({
  title,
  subtitle,
  showTrialBanner,
  children,
}: {
  title: string;
  subtitle: string;
  showTrialBanner?: boolean;
  children: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <Surface className="w-full max-w-xl p-6 sm:p-8">
        <BrandWordmark />
        <Display className="mt-6 text-4xl sm:text-5xl">{title}</Display>
        <p className="mt-3 max-w-xl text-sm leading-7 text-[var(--muted-foreground)]">
          {subtitle}
        </p>
        {showTrialBanner && <TrialBanner />}
        {children}
      </Surface>
    </main>
  );
}

function Alert({
  tone,
  message,
}: {
  tone: "error" | "ok";
  message: string;
}) {
  const styles = {
    error: "border-[var(--bad)] bg-[#faebeb] text-[var(--bad)]",
    ok: "border-[var(--ok)] bg-[#eef8f0] text-[var(--ok)]",
  };
  return (
    <p
      className={`mt-4 rounded-[14px] border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] ${styles[tone]}`}
    >
      {message}
    </p>
  );
}

export function LoginPage({
  error,
  message,
  resend,
  email: prefillEmail,
}: {
  error?: string;
  message?: string;
  resend?: string;
  email?: string;
}) {
  // Show the resend form when:
  // 1. The ?resend=1 param is present (user clicked "Resend"), or
  // 2. The error message is about email confirmation
  const isConfirmationError =
    error?.toLowerCase().includes("email not confirmed") ||
    error?.toLowerCase().includes("confirm") ||
    error?.toLowerCase().includes("not confirmed");

  const showResendForm = resend === "1" || isConfirmationError;

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign back into your job search workspace. Your provider keys stay encrypted and only power your own runs."
    >
      {error && <Alert tone="error" message={error} />}
      {message && <Alert tone="ok" message={message} />}

      {/* ── Resend confirmation panel ── */}
      {showResendForm && (
        <div className="mt-6 rounded-[18px] border border-[var(--warn)] bg-[#fdf8ec] p-5">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[var(--warn)]">
            Email not confirmed
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--foreground)]">
            Your account exists but the confirmation link may have been sent to
            the wrong address or has expired. Enter your email below to get a
            fresh link.
          </p>
          <form action={resendConfirmation} className="mt-4 space-y-3">
            <InputField
              label="Email"
              name="email"
              type="email"
              placeholder="jane@example.com"
              defaultValue={prefillEmail ?? ""}
            />
            <AuthSubmitButton
              label="Resend confirmation email"
              pendingLabel="Sending…"
            />
          </form>
        </div>
      )}

      {/* ── Normal sign-in form ── */}
      <form action={signIn} className="mt-6">
        <div className="space-y-4">
          <InputField
            label="Email"
            name="email"
            type="email"
            placeholder="jane@example.com"
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            placeholder="Enter your password"
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]"
              href="/forgot-password"
            >
              Forgot password
            </Link>
            {!showResendForm && (
              <Link
                className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] hover:text-[var(--accent)]"
                href="/login?resend=1"
              >
                Resend confirmation
              </Link>
            )}
          </div>
          <Badge tone="accent">Encrypted keys</Badge>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <AuthSubmitButton label="Sign in" pendingLabel="Signing in..." />
          <Button href="/signup" ghost>
            Create account
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

// Detect the webmail URL for a given email address.
function inboxUrl(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com")
    return "https://mail.google.com";
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com" || domain === "msn.com")
    return "https://outlook.live.com";
  if (domain === "yahoo.com" || domain === "ymail.com")
    return "https://mail.yahoo.com";
  if (domain === "icloud.com" || domain === "me.com" || domain === "mac.com")
    return "https://www.icloud.com/mail";
  if (domain === "protonmail.com" || domain === "proton.me")
    return "https://mail.proton.me";
  // Fallback — open a Gmail search for the confirmation email
  return "https://mail.google.com";
}

function inboxLabel(email: string): string {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") return "Open Gmail";
  if (domain === "outlook.com" || domain === "hotmail.com" || domain === "live.com") return "Open Outlook";
  if (domain === "yahoo.com" || domain === "ymail.com") return "Open Yahoo Mail";
  if (domain === "icloud.com" || domain === "me.com") return "Open iCloud Mail";
  if (domain === "protonmail.com" || domain === "proton.me") return "Open Proton Mail";
  return "Open inbox";
}

function EmailConfirmScreen({ email }: { email: string }) {
  return (
    <div className="mt-8 space-y-6 text-center">
      {/* Icon */}
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-2xl text-white">
        ✉
      </div>

      <div>
        <h2 className="text-xl font-bold">Check your inbox</h2>
        <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
          We sent a confirmation link to{" "}
          <span className="font-bold text-[var(--foreground)]">{email}</span>.
          Click the link in that email to activate your account — it expires in 24 hours.
        </p>
      </div>

      {/* Primary CTA */}
      <a
        href={inboxUrl(email)}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-bold text-white transition hover:opacity-90"
      >
        {inboxLabel(email)} →
      </a>

      {/* Steps reminder */}
      <Surface className="p-4 text-left">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-foreground)]">
          What happens next
        </p>
        <ol className="mt-3 space-y-2">
          {[
            "Click the confirmation link in your email",
            "You'll land on the NextRole dashboard",
            "Add your CV and connect an AI provider",
            "Evaluate your first role",
          ].map((step, i) => (
            <li key={i} className="flex items-start gap-3 text-sm text-[var(--muted-foreground)]">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                {i + 1}
              </span>
              {step}
            </li>
          ))}
        </ol>
      </Surface>

      {/* Resend / wrong email */}
      <div className="flex flex-wrap justify-center gap-4 text-sm">
        <form action={resendConfirmation} className="contents">
          <input type="hidden" name="email" value={email} />
          <button
            type="submit"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)] hover:underline"
          >
            Resend email
          </button>
        </form>
        <Link
          href="/signup"
          className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
        >
          Wrong email? Sign up again
        </Link>
      </div>
    </div>
  );
}

export function SignupPage({
  error,
  message,
  step,
  email,
}: {
  error?: string;
  message?: string;
  step?: string;
  email?: string;
}) {
  // After form submission, redirect back here with step=confirm&email=...
  // Show the confirmation screen instead of the form.
  if (step === "confirm" && email) {
    return (
      <AuthShell
        title="Almost there"
        subtitle="One last step — confirm your email address to activate your account."
      >
        <EmailConfirmScreen email={email} />
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Start your job search OS"
      subtitle="Create an account, add your base CV, choose API or manual execution mode, and evaluate the first role right away."
      showTrialBanner
    >
      {error && <Alert tone="error" message={error} />}
      {message && <Alert tone="ok" message={message} />}
      <form action={signUp}>
        <div className="mt-8 space-y-4">
          <InputField
            label="Email"
            name="email"
            type="email"
            placeholder="jane@example.com"
          />
          <InputField
            label="Password"
            name="password"
            type="password"
            placeholder="8+ chars, one number"
          />
        </div>
        <label className="mt-5 flex items-start gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
          <input
            required
            name="agreeToTerms"
            type="checkbox"
            value="yes"
            className="mt-1 h-4 w-4 rounded border-[var(--line)] accent-[var(--accent)]"
          />
          <span className="text-sm leading-7 text-[var(--muted-foreground)]">
            I agree to the{" "}
            <Link href="/terms" className="font-bold text-[var(--accent)]">
              Terms of Use
            </Link>{" "}
            and acknowledge the{" "}
            <Link href="/privacy" className="font-bold text-[var(--accent)]">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[
            ["1", "Add your CV"],
            ["2", "Choose AI mode"],
            ["3", "Evaluate first role"],
          ].map(([s, label]) => (
            <Surface key={s} className="p-4 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                Step {s}
              </p>
              <p className="mt-2 text-sm font-bold">{label}</p>
            </Surface>
          ))}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <AuthSubmitButton label="Create account" pendingLabel="Creating account..." />
          <Button href="/login" ghost>
            I already have an account
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

export function ForgotPasswordPage({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  return (
    <AuthShell
      title="Forgot password"
      subtitle="We will send a reset link so you can get back into NextRole quickly."
    >
      {error && <Alert tone="error" message={error} />}
      {message && <Alert tone="ok" message={message} />}
      <form action={forgotPassword}>
        <div className="mt-8 space-y-4">
          <InputField
            label="Email"
            name="email"
            type="email"
            placeholder="jane@example.com"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <AuthSubmitButton label="Send reset link" pendingLabel="Sending..." />
          <Button href="/login" ghost>
            Back to login
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

export function ResetPasswordPage({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a fresh password and we will take you straight back into the app."
    >
      {error && <Alert tone="error" message={error} />}
      {message && <Alert tone="ok" message={message} />}
      <form action={resetPassword}>
        <div className="mt-8 space-y-4">
          <InputField
            label="New password"
            name="password"
            type="password"
            placeholder="Enter a new password"
          />
          <InputField
            label="Confirm password"
            name="confirm"
            type="password"
            placeholder="Confirm your password"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <AuthSubmitButton label="Save and sign in" pendingLabel="Saving..." />
          <Button href="/login" ghost>
            Back to login
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
