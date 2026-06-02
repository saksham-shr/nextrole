"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/nextrole/brand";
import Link from "next/link";

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-8 bg-[var(--bg)]">
      <div className="w-full" style={{ maxWidth: 400 }}>
        <div className="flex flex-col items-center mb-7">
          <BrandMark size={34} />
          <div className="mt-2.5 font-medium text-[var(--fg)]"
               style={{ fontFamily: "var(--font-mono-stack)", fontSize: 15 }}>
            nextrole
          </div>
        </div>
        <div className="rounded-[8px] border border-[var(--line-soft)] bg-[var(--surface)]"
             style={{ padding: 28 }}>
          {children}
        </div>
      </div>
    </main>
  );
}

export function ConnectExtensionLoginClient({
  redirectTo,
  error: serverError,
}: {
  redirectTo: string;
  error?: string;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState(serverError ?? "");
  const [loginBusy, setLoginBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const supabase = createClient();

  async function handleGoogle() {
    setGoogleBusy(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // After OAuth, /auth/callback sets the session cookie then redirects back here.
        // The server component will then find the session and create the token.
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
          "/connect-extension?redirect_to=" + encodeURIComponent(redirectTo)
        )}`,
      },
    });
    if (error) {
      setLoginError(error.message);
      setGoogleBusy(false);
    }
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginBusy(true);
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoginError(error.message);
      setLoginBusy(false);
      return;
    }

    // Session cookie is now set. Reload the page so the server component
    // picks up the session and creates the token server-side.
    window.location.reload();
  }

  return (
    <Shell>
      <h2 className="font-semibold text-[15px] text-center mb-1 text-[var(--fg)]">
        Connect NextRole Extension
      </h2>
      <p className="text-xs text-[var(--muted)] text-center mb-5 leading-relaxed">
        Sign in to link your extension to your NextRole account.
      </p>

      <button
        type="button"
        disabled={googleBusy || loginBusy}
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[7px] border border-[var(--line-soft)] bg-[var(--surface)] text-sm font-medium text-[var(--fg)] mb-3 transition-colors hover:border-[var(--line)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {googleBusy ? "Redirecting…" : "Continue with Google"}
      </button>

      <div className="flex items-center gap-2 mb-3 text-[10px] text-[var(--muted2)] uppercase tracking-wider"
           style={{ fontFamily: "var(--font-mono-stack)" }}>
        <span className="flex-1 h-px bg-[var(--line-soft)]" />
        or sign in with email
        <span className="flex-1 h-px bg-[var(--line-soft)]" />
      </div>

      <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
        {loginError && (
          <div className="text-xs text-[#b53a3a] bg-[rgba(181,58,58,0.08)] border border-[rgba(181,58,58,0.25)] rounded-[6px] px-3 py-2 leading-relaxed">
            {loginError}
          </div>
        )}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-[var(--muted2)]"
                 style={{ fontFamily: "var(--font-mono-stack)" }}>
            Email
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--line-soft)] rounded-[6px] px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[10px] uppercase tracking-widest text-[var(--muted2)]"
                 style={{ fontFamily: "var(--font-mono-stack)" }}>
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-[var(--bg)] border border-[var(--line-soft)] rounded-[6px] px-3 py-2 text-sm text-[var(--fg)] outline-none focus:border-[var(--accent)] transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={loginBusy || googleBusy}
          className="w-full py-2.5 rounded-[7px] bg-[var(--accent)] text-white text-xs font-medium uppercase tracking-wider transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed mt-1"
          style={{ fontFamily: "var(--font-mono-stack)" }}
        >
          {loginBusy ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <a href="/signup" className="block text-center text-xs text-[var(--accent)] mt-3 hover:underline">
        Don&apos;t have an account? Sign up
      </a>
    </Shell>
  );
}

/* ── Install guide — shown when user clicks sidebar link without extension ── */
export function InstallExtensionPage() {
  const steps = [
    {
      n: 1, title: "Install",
      content: (
        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <a
            href="https://chrome.google.com/webstore"
            target="_blank"
            rel="noopener noreferrer"
            className="nr-btn nr-btn-primary nr-btn-sm"
            style={{ textDecoration: "none" }}
          >
            Add to Chrome
          </a>
          <button className="nr-btn nr-btn-ghost nr-btn-sm" disabled style={{ opacity: 0.5 }}>
            Firefox (coming soon)
          </button>
        </div>
      ),
    },
    {
      n: 2, title: "Open",
      content: <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 8 }}>Click the NextRole icon in your browser toolbar.</div>,
    },
    {
      n: 3, title: "Sign in",
      content: <div style={{ fontSize: 13, color: "var(--muted-foreground)", marginTop: 8 }}>Click <strong>Connect to NextRole</strong> in the extension popup.</div>,
    },
    {
      n: 4, title: "Done",
      content: (
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}>
          <span style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--success-surface)", color: "var(--ok)", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12l5 5L20 7" />
            </svg>
          </span>
          <span style={{ fontSize: 13, color: "var(--ok)", fontWeight: 500 }}>You&apos;re connected.</span>
        </div>
      ),
    },
  ];

  return (
    <div style={{ maxWidth: 600, margin: "0 auto", paddingTop: 40 }}>
      <div style={{ marginBottom: 16 }}>
        <BrandMark size={32} />
      </div>
      <h1 className="nr-display" style={{ fontSize: 26, marginBottom: 8 }}>Connect the NextRole Extension</h1>
      <p style={{ fontSize: 14, color: "var(--muted-foreground)", marginBottom: 32 }}>
        The extension autofills job applications and evaluates jobs from any site.
      </p>

      <div className="nr-card" style={{ padding: 0, marginBottom: 24 }}>
        {steps.map((s, i) => (
          <div key={s.n} style={{
            display: "flex", padding: "20px 24px", gap: 16,
            borderBottom: i < steps.length - 1 ? "1px solid var(--line-softer)" : "none",
          }}>
            <div className="nr-display" style={{ fontSize: 18, color: "var(--muted-foreground-2)", width: 20 }}>{s.n}</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>{s.title}</div>
              {s.content}
            </div>
          </div>
        ))}
      </div>

      <div className="nr-small" style={{ marginBottom: 8, color: "var(--muted-foreground)" }}>
        The extension re-authenticates in the background. If it ever shows as disconnected, click the extension icon and sign in again.
      </div>
      <Link href="/dashboard" style={{ fontSize: 13, color: "var(--accent)", textDecoration: "none" }}>
        ← Back to dashboard
      </Link>
    </div>
  );
}
