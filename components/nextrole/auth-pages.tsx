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
import { BrandMark, BrandWordmark } from "@/components/nextrole/brand";
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

function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8">
      <div className="w-full" style={{ maxWidth: 420 }}>
        <div className="flex flex-col items-center mb-8">
          <BrandMark size={36} />
          <div
            className="mt-3 font-medium"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 17 }}
          >
            nextrole
          </div>
        </div>
        <div
          className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)]"
          style={{ padding: 32 }}
        >
          <h2
            className="font-semibold tracking-[-0.01em]"
            style={{ fontSize: 22, marginBottom: 6 }}
          >
            {title}
          </h2>
          <p
            className="text-[var(--muted-foreground)]"
            style={{ fontSize: 13.5, marginBottom: 24 }}
          >
            {subtitle}
          </p>
          {children}
        </div>
        {footer && (
          <div className="mt-5 text-center text-[11.5px] text-[var(--muted-foreground)]">
            {footer}
          </div>
        )}
      </div>
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
      className={`mt-4 rounded-[6px] border px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] ${styles[tone]}`}
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
      {label && (
        <div
          className="mb-1.5 uppercase text-[var(--muted-foreground)]"
          style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, letterSpacing: "0.12em" }}
        >
          {label}
        </div>
      )}
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete={autoComplete}
          className="w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 pr-10 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--line)]"
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

function OAuthButtons({ next }: { next: "/onboarding" | "/dashboard" }) {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${next}`,
      },
    });
  }

  return (
    <div>
      <div className="flex items-center gap-2.5 my-4">
        <div className="h-px flex-1 bg-[var(--line-soft)]" />
        <span
          className="text-[var(--muted-foreground-2)] uppercase"
          style={{ fontFamily: "var(--font-mono-stack)", fontSize: 10.5, letterSpacing: "0.1em" }}
        >
          or
        </span>
        <div className="h-px flex-1 bg-[var(--line-soft)]" />
      </div>
      <button
        type="button"
        onClick={signInWithGoogle}
        className="flex w-full items-center justify-center gap-2.5 rounded-[6px] border border-[var(--line-soft)] bg-[var(--surface)] py-2.5 text-sm font-medium text-[var(--foreground)] transition hover:border-[var(--line)]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        Continue with Google
      </button>
    </div>
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
    <button
      type="submit"
      disabled={loading}
      className="flex w-full items-center justify-center gap-2 rounded-[6px] bg-[var(--accent)] py-2.5 text-sm font-medium text-[#fffdf8] transition hover:bg-[var(--accent-hover)] disabled:opacity-60"
    >
      {loading ? (
        <>
          <Spinner className="h-3.5 w-3.5 border-white border-t-transparent" />
          {pendingLabel}
        </>
      ) : (
        label
      )}
    </button>
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
      subtitle="Sign in to continue your job search."
    >
      {error && <Alert tone="error" message={error} />}
      {message && <Alert tone="ok" message={message} />}

      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <label className="block">
          <div
            className="mb-1.5 uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, letterSpacing: "0.12em" }}
          >
            Email
          </div>
          <input
            name="email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--line)]"
          />
        </label>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span
              className="uppercase text-[var(--muted-foreground)]"
              style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, letterSpacing: "0.12em" }}
            >
              Password
            </span>
            <Link
              href="/forgot-password"
              className="text-[var(--accent)] hover:underline"
              style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }}
            >
              Forgot?
            </Link>
          </div>
          <PasswordInput
            label=""
            name="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <SubmitButton loading={loading} label="Sign in" pendingLabel="Signing in..." />
        <OAuthButtons next="/dashboard" />
      </form>
      <div className="mt-5 pt-5 border-t border-[var(--line-soft)] text-center text-[13px] text-[var(--muted-foreground)]">
        New here?{" "}
        <Link href="/signup" className="text-[var(--accent)] font-medium hover:underline">
          Create account
        </Link>
      </div>
    </AuthShell>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Signup — email confirmation is disabled; signUp() resolves immediately with
// a session and we redirect straight to /onboarding.
// ─────────────────────────────────────────────────────────────────────────────

const SIGNUP_BENEFITS: [string, string][] = [
  ["🎯", "See if a job is right for you, in seconds."],
  ["📄", "Tailor your resume to any role automatically."],
  ["💬", "Prep answers for likely interview questions."],
];

export function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirmPassword) { setError("Passwords do not match"); return; }
    setLoading(true);
    setError(undefined);

    const { error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); setLoading(false); return; }

    router.push("/onboarding");
    router.refresh();
  }

  return (
    <AuthShell
      title="Create your account"
      subtitle="Free forever. No card required."
    >
      {error && <Alert tone="error" message={error} />}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <label className="block">
          <div
            className="mb-1.5 uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, letterSpacing: "0.12em" }}
          >
            Email
          </div>
          <input
            name="email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--line)]"
          />
        </label>
        <PasswordInput
          label="Password"
          name="password"
          placeholder="8+ characters"
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
        <SubmitButton
          loading={loading}
          label="Create account"
          pendingLabel="Creating account..."
        />
        <OAuthButtons next="/onboarding" />
      </form>
      <div className="mt-5 pt-5 border-t border-[var(--line-soft)] text-center text-[13px] text-[var(--muted-foreground)]">
        Already have an account?{" "}
        <Link href="/login" className="text-[var(--accent)] font-medium hover:underline">
          Sign in
        </Link>
      </div>
      <p className="mt-4 text-center text-[11.5px] text-[var(--muted-foreground)]">
        By signing up you agree to our{" "}
        <Link href="/terms" className="text-[var(--accent)] hover:underline">Terms</Link>{" "}
        and{" "}
        <Link href="/privacy" className="text-[var(--accent)] hover:underline">Privacy Policy</Link>.
      </p>
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
      subtitle="We'll send a 6-digit code and a recovery link to your inbox."
    >
      {error && <Alert tone="error" message={error} />}
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
        <label className="block">
          <div
            className="mb-1.5 uppercase text-[var(--muted-foreground)]"
            style={{ fontFamily: "var(--font-mono-stack)", fontSize: 11, letterSpacing: "0.12em" }}
          >
            Email
          </div>
          <input
            name="email"
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full rounded-[6px] border border-[var(--line-soft)] bg-[var(--surface)] px-3 py-2.5 text-sm outline-none placeholder:text-[var(--muted-foreground-2)] focus:border-[var(--line)]"
          />
        </label>
        <SubmitButton loading={loading} label="Send recovery code" pendingLabel="Sending..." />
      </form>
      <div className="mt-5 pt-5 border-t border-[var(--line-soft)] text-center text-[13px] text-[var(--muted-foreground)]">
        <Link href="/login" className="text-[var(--accent)] font-medium hover:underline">
          Back to login
        </Link>
      </div>
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

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <div className="flex justify-center gap-2">
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
                "h-12 w-10 rounded-[6px] border text-center text-xl font-bold outline-none transition",
                "border-[var(--line-soft)] bg-[var(--surface-soft)] text-[var(--foreground)]",
                "focus:border-[var(--line)]",
                d ? "border-[var(--accent)]" : "",
              ].join(" ")}
            />
          ))}
        </div>
        <SubmitButton loading={loading} label="Verify code" pendingLabel="Verifying..." />
      </form>

      <div className="mt-5 pt-5 border-t border-[var(--line-soft)] text-center text-[13px] text-[var(--muted-foreground)]">
        {email && (
          <>
            <button
              type="button"
              onClick={handleResend}
              className="text-[var(--accent)] font-medium hover:underline"
            >
              Resend code
            </button>
            {" · "}
          </>
        )}
        <Link href="/login" className="text-[var(--accent)] font-medium hover:underline">
          Back to login
        </Link>
      </div>
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
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
        <SubmitButton loading={loading} label="Save and sign in" pendingLabel="Saving..." />
      </form>
      <div className="mt-5 pt-5 border-t border-[var(--line-soft)] text-center text-[13px] text-[var(--muted-foreground)]">
        <Link href="/login" className="text-[var(--accent)] font-medium hover:underline">
          Back to login
        </Link>
      </div>
    </AuthShell>
  );
}
