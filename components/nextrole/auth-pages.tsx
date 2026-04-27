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
  children,
}: {
  title: string;
  subtitle: string;
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
        <TrialBanner />
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
}: {
  error?: string;
  message?: string;
}) {
  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign back into your job search workspace. Your provider keys stay encrypted and only power your own runs."
    >
      {error && <Alert tone="error" message={error} />}
      {message && <Alert tone="ok" message={message} />}
      <form action={signIn}>
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
            placeholder="Enter your password"
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-4">
          <Link
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)]"
            href="/forgot-password"
          >
            Forgot password
          </Link>
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

export function SignupPage({
  error,
  message,
}: {
  error?: string;
  message?: string;
}) {
  return (
    <AuthShell
      title="Start your job search OS"
      subtitle="Create an account, add your base CV, choose API or manual execution mode, and evaluate the first role right away."
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
          ].map(([step, label]) => (
            <Surface key={step} className="p-4 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-[var(--muted-foreground)]">
                Step {step}
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
