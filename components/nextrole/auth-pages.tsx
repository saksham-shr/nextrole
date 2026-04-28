"use client";

/**
 * All auth flows run client-side via the browser Supabase client. This is the
 * pattern the reference repo (DeptDocs) uses — it avoids the
 * server-action-cookie-on-redirect race that kept breaking us.
 *
 * Each page owns its own form state and calls the supabase-js method directly.
 * On success we router.push() to the next route and router.refresh() so any
 * server components re-render with the new session cookies.
 */

import type { ReactNode } from "react";
import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { BrandWordmark } from "@/components/nextrole/brand";
import {
  Badge,
  Button,
  Display,
  InputField,
  Spinner,
  Surface,
} from "@/components/nextrole/ui";
import { createClient } from "@/lib/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// Shared layout primitives
// ─────────────────────────────────────────────────────────────────────────────

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

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  ) : (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function PasswordInput({
  label,
  name,
  placeholder,
  value,
  onChange,
  required,
  autoComplete,
}: {
  label: string;
  name: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  const toggle = useCallback(() => setShow((s) => !s), []);
  return (
    <label className="block">
      <p className="mb-2 block font-mono text-[10px] uppercase tracking-[0.28em] text-[var(--muted-foreground)]">
        {label}
      </p>
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          className="w-full rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 py-3 pr-12 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--accent)]"
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </label>
  );
}

function SubmitButton({
  loading,
  label,
  pendingLabel,
}: {
  loading: boolean;
  label: string;
  pendingLabel: string;
}) {
  return (
    <Button type="submit" tone="accent" disabled={loading}>
      {loading ? (
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

// ─────────────────────────────────────────────────────────────────────────────
// Login
// ─────────────────────────────────────────────────────────────────────────────

export function LoginPage({
  error: initialError,
  message,
}: {
  error?: string;
  message?: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>(initialError);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign back into your job search workspace. Your provider keys stay encrypted and only power your own runs."
    >
      {error && <Alert tone="error" message={error} />}
      {message && <Alert tone="ok" message={message} />}

      <form onSubmit={handleSubmit} className="mt-6">
        <div className="space-y-4">
          <InputField
            label="Email"
            name="email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PasswordInput
            label="Password"
            name="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
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
          <SubmitButton loading={loading} label="Sign in" pendingLabel="Signing in..." />
          <Button href="/signup" ghost>
            Create account
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Signup — link-based email confirmation. After signUp() succeeds, the user
// gets a confirmation email; clicking the link hits /auth/callback which
// swaps the code for a session and redirects to /dashboard.
// ─────────────────────────────────────────────────────────────────────────────

export function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // After a successful submit we show a "check your inbox" panel inline.
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setError("You must agree to the Terms of Use");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(undefined);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // If Supabase issued a session immediately (email confirmation disabled
    // in the project), just go to the dashboard.
    if (data.session) {
      router.push("/dashboard");
      router.refresh();
      return;
    }

    // Email confirmation enabled — show inline "check your inbox" success.
    setSubmittedEmail(email);
    setLoading(false);
  }

  if (submittedEmail) {
    return (
      <AuthShell
        title="Almost there"
        subtitle="One last step — confirm your email address to activate your account."
      >
        <div className="mt-8 space-y-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[var(--accent)] text-2xl text-white">
            ✉
          </div>
          <div>
            <h2 className="text-xl font-bold">Check your inbox</h2>
            <p className="mt-3 text-sm leading-7 text-[var(--muted-foreground)]">
              We sent a confirmation link to{" "}
              <span className="font-bold text-[var(--foreground)]">
                {submittedEmail}
              </span>
              . Click the link in that email to activate your account — it
              expires in 24 hours.
            </p>
          </div>
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
                <li
                  key={i}
                  className="flex items-start gap-3 text-sm text-[var(--muted-foreground)]"
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-bold text-white">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
          </Surface>
          <div className="flex flex-wrap justify-center gap-4">
            <button
              type="button"
              onClick={() => setSubmittedEmail(null)}
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              Wrong email? Sign up again
            </button>
            <Link
              href="/login"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)] hover:underline"
            >
              Back to sign in
            </Link>
          </div>
        </div>
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
      <form onSubmit={handleSubmit}>
        <div className="mt-8 space-y-4">
          <InputField
            label="Email"
            name="email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <PasswordInput
            label="Password"
            name="password"
            placeholder="8+ chars, one number"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <PasswordInput
            label="Confirm password"
            name="confirm_password"
            placeholder="Re-enter your password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <label className="mt-5 flex items-start gap-3 rounded-[18px] border border-[var(--line)] bg-[var(--surface-soft)] px-4 py-3">
          <input
            required
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
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
          <SubmitButton
            loading={loading}
            label="Create account"
            pendingLabel="Creating account..."
          />
          <Button href="/login" ghost>
            I already have an account
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Forgot password — sends recovery email, then routes to /verify-code with
// the email prefilled. The email contains both a link AND a 6-digit OTP.
// ─────────────────────────────────────────────────────────────────────────────

export function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(undefined);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push(`/verify-code?email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthShell
      title="Forgot password"
      subtitle="We'll send a 6-digit code and a recovery link to your inbox so you can get back into NextRole quickly."
    >
      {error && <Alert tone="error" message={error} />}
      <form onSubmit={handleSubmit}>
        <div className="mt-8 space-y-4">
          <InputField
            label="Email"
            name="email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <SubmitButton loading={loading} label="Send recovery code" pendingLabel="Sending..." />
          <Button href="/login" ghost>
            Back to login
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify code — used for password recovery. Six-digit OTP entry, on success
// redirects to /reset-password where the user picks a new password.
// ─────────────────────────────────────────────────────────────────────────────

export function VerifyCodePage({ email: initialEmail }: { email?: string }) {
  const router = useRouter();
  const supabase = createClient();
  const LENGTH = 6;
  const [email] = useState(initialEmail ?? "");
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const inputRefs = useRef<Array<HTMLInputElement | null>>(Array(LENGTH).fill(null));

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleChange(idx: number, value: string) {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit && idx < LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  }

  function handleKeyDown(idx: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[idx]) {
        const next = [...digits];
        next[idx] = "";
        setDigits(next);
      } else if (idx > 0) {
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, LENGTH);
    if (!pasted) return;
    const next = [...digits];
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, LENGTH - 1)]?.focus();
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = digits.join("");
    if (token.length !== LENGTH) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setLoading(true);
    setError(undefined);

    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "recovery",
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    // OTP verified — Supabase set the session cookies. Send the user to the
    // password-reset screen where they pick a new password.
    router.push("/reset-password");
    router.refresh();
  }

  async function handleResend() {
    if (!email) return;
    setError(undefined);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });
    if (error) setError(error.message);
  }

  return (
    <AuthShell
      title="Verify code"
      subtitle={
        email
          ? `We sent a 6-digit code to ${email}. Enter it below — it expires in 10 minutes.`
          : "Enter the 6-digit code we sent to your inbox."
      }
    >
      {error && <Alert tone="error" message={error} />}

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div className="flex justify-center gap-2 sm:gap-3">
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputRefs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              className={[
                "h-14 w-12 rounded-[14px] border text-center text-xl font-bold outline-none transition",
                "border-[var(--line)] bg-[var(--surface-soft)] text-[var(--foreground)]",
                "focus:border-[var(--accent)] focus:ring-2 focus:ring-[var(--accent)]/20",
                d ? "border-[var(--accent)]" : "",
              ].join(" ")}
            />
          ))}
        </div>

        <div className="flex flex-wrap gap-3">
          <SubmitButton loading={loading} label="Verify code" pendingLabel="Verifying..." />
          <Button href="/login" ghost>
            Back to login
          </Button>
        </div>
      </form>

      {email && (
        <div className="mt-5 flex flex-wrap gap-4">
          <button
            type="button"
            onClick={handleResend}
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--accent)] hover:underline"
          >
            Resend code
          </button>
          <Link
            href="/forgot-password"
            className="font-mono text-[11px] uppercase tracking-[0.18em] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          >
            Wrong email?
          </Link>
        </div>
      )}
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Reset password — user has a valid session here (either from clicking the
// recovery link → callback → here, or from /verify-code). updateUser() sets
// the new password against the live session.
// ─────────────────────────────────────────────────────────────────────────────

export function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(undefined);

    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell
      title="Set a new password"
      subtitle="Choose a fresh password and we'll take you straight back into the app."
    >
      {error && <Alert tone="error" message={error} />}
      <form onSubmit={handleSubmit}>
        <div className="mt-8 space-y-4">
          <PasswordInput
            label="New password"
            name="password"
            placeholder="Enter a new password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <PasswordInput
            label="Confirm password"
            name="confirm"
            placeholder="Confirm your password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <SubmitButton loading={loading} label="Save and sign in" pendingLabel="Saving..." />
          <Button href="/login" ghost>
            Back to login
          </Button>
        </div>
      </form>
    </AuthShell>
  );
}
