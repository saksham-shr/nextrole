"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: "100%", minHeight: "100vh",
      display: "grid", gridTemplateColumns: "1fr 1fr",
    }}>
      <div style={{
        background: "var(--surface-soft)", padding: 40,
        display: "flex", flexDirection: "column",
      }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{
            width: 28, height: 28, borderRadius: 7, background: "var(--accent)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fffdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
            </svg>
          </div>
          <span style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--foreground)" }}>NextRole</span>
        </Link>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 14, maxWidth: 360, margin: "0 auto" }}>
          <div className="nr-card" style={{ padding: 24, maxWidth: 320 }}>
            <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 17, color: "var(--muted-foreground)", lineHeight: 1.4, marginBottom: 14 }}>
              "I cut my application time from 25 minutes to 90 seconds. NextRole basically replaced my Saturday."
            </p>
            <div className="nr-small">— Priya M., Backend Engineer</div>
          </div>
          <div className="nr-card" style={{ padding: 24, maxWidth: 320, opacity: 0.65 }}>
            <p style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 17, color: "var(--muted-foreground)", lineHeight: 1.4, marginBottom: 14 }}>
              "The fit score saved me hours. I stopped wasting time on roles that were never going to call back."
            </p>
            <div className="nr-small">— Rohan K., Product Manager</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: "var(--muted-foreground-2)" }}>© 2026 NextRole</div>
      </div>

      <div style={{ background: "var(--background)", display: "flex", alignItems: "center", justifyContent: "center", padding: 40 }}>
        <div style={{ width: "100%", maxWidth: 360 }}>{children}</div>
      </div>
    </div>
  );
}

function ErrBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: 13,
      background: "var(--bad-bg)", color: "var(--bad)", border: "1px solid var(--danger-border)",
    }}>{msg}</div>
  );
}

function OkBanner({ msg }: { msg: string }) {
  return (
    <div style={{
      padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: 13,
      background: "var(--ok-bg)", color: "var(--ok)", border: "1px solid var(--success-border)",
    }}>{msg}</div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      {open
        ? <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><path d="M1 1l22 22"/></>
        : <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>
      }
    </svg>
  );
}

function PasswordField({
  label = "Password",
  value,
  onChange,
  autoComplete = "current-password",
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  autoComplete?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ marginBottom: 16 }}>
      <label className="nr-field-label">{label}</label>
      <div style={{ position: "relative" }}>
        <input
          className="nr-input"
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="••••••••"
          required
          autoComplete={autoComplete}
          style={{ paddingRight: 40 }}
        />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          style={{
            position: "absolute", right: 0, top: 0, height: 38, width: 38,
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "var(--muted-foreground-2)", background: "none", border: "none", cursor: "pointer",
          }}
        >
          <EyeIcon open={show} />
        </button>
      </div>
    </div>
  );
}

/* ── Login ─────────────────────────────────────────── */
export function LoginPage({ error, message }: { error?: string; message?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(error ?? "");

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const supabase = createClient();
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
    if (signInErr) {
      setErr(signInErr.message);
      setLoading(false);
    } else {
      router.push("/dashboard");
      router.refresh();
    }
  }

  return (
    <AuthLayout>
      <h1 className="nr-display" style={{ fontSize: 26, marginBottom: 8 }}>Welcome back</h1>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 24 }}>Sign in to your NextRole account</p>

      {err && <ErrBanner msg={err} />}
      {!err && message && <OkBanner msg={message} />}

      <button
        type="button"
        onClick={handleGoogle}
        style={{
          width: "100%", height: 42, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, border: "1px solid var(--line-soft)", borderRadius: 8, background: "var(--surface-soft)",
          cursor: "pointer", fontSize: 14, color: "var(--foreground)", fontWeight: 500,
        }}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--line-softer)" }} />
        <span style={{ fontSize: 12, color: "var(--muted-foreground-2)" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "var(--line-softer)" }} />
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label className="nr-field-label">Email</label>
          <input className="nr-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required autoComplete="email" />
        </div>
        <PasswordField value={password} onChange={setPassword} />
        <div style={{ textAlign: "right", marginBottom: 24 }}>
          <Link href="/forgot-password" style={{ fontSize: 13, color: "var(--accent)" }}>Forgot password?</Link>
        </div>
        <button className="nr-btn nr-btn-primary" type="submit" disabled={loading} style={{ width: "100%", height: 42 }}>
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p style={{ marginTop: 24, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
        Don&apos;t have an account? <Link href="/signup" style={{ color: "var(--accent)" }}>Sign up</Link>
      </p>
    </AuthLayout>
  );
}

/* ── Signup ─────────────────────────────────────────── */
export function SignupPage({ error }: { error?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const ref = searchParams.get("ref");
    if (ref) localStorage.setItem("nr_referral_code", ref.toUpperCase());
  }, [searchParams]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(error ?? "");
  const [done, setDone] = useState(false);

  async function handleGoogle() {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setErr("Passwords don't match."); return; }
    if (password.length < 8) { setErr("Password must be at least 8 characters."); return; }
    setLoading(true);
    setErr("");
    const supabase = createClient();
    const { error: signUpErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    if (signUpErr) {
      setErr(signUpErr.message);
      setLoading(false);
    } else {
      setDone(true);
    }
  }

  if (done) {
    return (
      <AuthLayout>
        <div style={{ textAlign: "center" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%", margin: "0 auto 16px",
            background: "var(--ok-bg)", color: "var(--ok)",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "1px solid var(--success-border)",
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7"/>
            </svg>
          </div>
          <h1 className="nr-display" style={{ fontSize: 22, marginBottom: 8 }}>Check your email</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
            We sent a confirmation link to <strong>{email}</strong>.
          </p>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout>
      <h1 className="nr-display" style={{ fontSize: 26, marginBottom: 8 }}>Create your account</h1>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 24 }}>Land your next role with NextRole.</p>

      {err && <ErrBanner msg={err} />}

      <button
        type="button"
        onClick={handleGoogle}
        style={{
          width: "100%", height: 42, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 10, border: "1px solid var(--line-soft)", borderRadius: 8, background: "var(--surface-soft)",
          cursor: "pointer", fontSize: 14, color: "var(--foreground)", fontWeight: 500,
        }}
      >
        <GoogleIcon />
        Continue with Google
      </button>

      <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "16px 0" }}>
        <div style={{ flex: 1, height: 1, background: "var(--line-softer)" }} />
        <span style={{ fontSize: 12, color: "var(--muted-foreground-2)" }}>or</span>
        <div style={{ flex: 1, height: 1, background: "var(--line-softer)" }} />
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 16 }}>
          <label className="nr-field-label">Email</label>
          <input className="nr-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required autoComplete="email" />
        </div>
        <PasswordField label="Password" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />

        <label style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--muted-foreground)", marginBottom: 20, cursor: "pointer" }}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} style={{ accentColor: "var(--accent)", marginTop: 2 }} required />
          <span>
            I agree to the{" "}
            <Link href="/terms" style={{ color: "var(--accent)" }}>Terms</Link>
            {" "}and{" "}
            <Link href="/privacy" style={{ color: "var(--accent)" }}>Privacy Policy</Link>
          </span>
        </label>

        <button className="nr-btn nr-btn-primary" type="submit" disabled={loading || !agreed} style={{ width: "100%", height: 42 }}>
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
        Already have an account? <Link href="/login" style={{ color: "var(--accent)" }}>Sign in</Link>
      </p>
    </AuthLayout>
  );
}

/* ── Forgot password ─────────────────────────────────────────── */
export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr("");
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) { setErr(error.message); setLoading(false); }
    else setDone(true);
  }

  return (
    <AuthLayout>
      {done ? (
        <div style={{ textAlign: "center" }}>
          <h1 className="nr-display" style={{ fontSize: 22, marginBottom: 8 }}>Check your inbox</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)" }}>
            A password reset link was sent to <strong>{email}</strong>.
          </p>
        </div>
      ) : (
        <>
          <h1 className="nr-display" style={{ fontSize: 26, marginBottom: 8 }}>Reset your password</h1>
          <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 24 }}>
            Enter your email and we&apos;ll send a reset link.
          </p>
          {err && <ErrBanner msg={err} />}
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label className="nr-field-label">Email</label>
              <input className="nr-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" required autoComplete="email" />
            </div>
            <button className="nr-btn nr-btn-primary" type="submit" disabled={loading} style={{ width: "100%", height: 42 }}>
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </form>
          <p style={{ marginTop: 20, fontSize: 13, color: "var(--muted-foreground)", textAlign: "center" }}>
            <Link href="/login" style={{ color: "var(--muted-foreground)" }}>← Back to sign in</Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}

/* ── Verify code (OTP / email link confirmation) ─────────────── */
export function VerifyCodePage({ email }: { email?: string }) {
  return (
    <AuthLayout>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 52, height: 52, borderRadius: "50%", margin: "0 auto 16px",
          background: "var(--ok-bg)", color: "var(--ok)",
          display: "flex", alignItems: "center", justifyContent: "center",
          border: "1px solid var(--success-border)",
        }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
          </svg>
        </div>
        <h1 className="nr-display" style={{ fontSize: 22, marginBottom: 8 }}>Check your email</h1>
        <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 8 }}>
          We sent a confirmation link{email ? <> to <strong>{email}</strong></> : " to your email"}.
        </p>
        <p style={{ fontSize: 13, color: "var(--muted-foreground)" }}>
          Click the link to complete sign-up. Check spam if you don&apos;t see it.
        </p>
      </div>
    </AuthLayout>
  );
}

/* ── Reset password ─────────────────────────────────────────── */
export function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setErr("Passwords don't match."); return; }
    setLoading(true);
    setErr("");
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) { setErr(error.message); setLoading(false); }
    else router.push("/dashboard");
  }

  return (
    <AuthLayout>
      <h1 className="nr-display" style={{ fontSize: 26, marginBottom: 8 }}>Set a new password</h1>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 24 }}>
        Choose a strong password you don&apos;t use elsewhere.
      </p>
      {err && <ErrBanner msg={err} />}
      <form onSubmit={handleSubmit}>
        <PasswordField label="New password" value={password} onChange={setPassword} autoComplete="new-password" />
        <PasswordField label="Confirm password" value={confirm} onChange={setConfirm} autoComplete="new-password" />
        <button className="nr-btn nr-btn-primary" type="submit" disabled={loading} style={{ width: "100%", height: 42, marginTop: 8 }}>
          {loading ? "Updating…" : "Set new password"}
        </button>
      </form>
    </AuthLayout>
  );
}
