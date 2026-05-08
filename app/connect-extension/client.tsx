"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/nextrole/brand";
import { createExtensionToken } from "./actions";

// ─── Google SVG ───────────────────────────────────────────────────────────────

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

// ─── Shared shell ─────────────────────────────────────────────────────────────

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

// ─── Main component ───────────────────────────────────────────────────────────

export function ConnectExtensionClient({ redirectTo }: { redirectTo: string }) {
  const [phase, setPhase] = useState<"checking" | "login" | "connecting" | "done" | "error">("checking");
  const [error, setError] = useState("");

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  const supabase = createClient();

  // On mount: check if already logged in
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        connectExtension();
      } else {
        setPhase("login");
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function connectExtension() {
    setPhase("connecting");
    const result = await createExtensionToken();
    if (!result.ok) {
      setError(result.error);
      setPhase("error");
      return;
    }
    setPhase("done");
    // Redirect back to extension with the token
    window.location.href = `${redirectTo}?token=${encodeURIComponent(result.token)}`;
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent("/connect-extension?redirect_to=" + encodeURIComponent(redirectTo))}`,
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
    connectExtension();
  }

  // ── Checking ──
  if (phase === "checking") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--line-soft)] border-t-[var(--accent)] animate-spin" />
          <p className="text-sm text-[var(--muted)]">Checking session…</p>
        </div>
      </Shell>
    );
  }

  // ── Connecting / Done ──
  if (phase === "connecting" || phase === "done") {
    return (
      <Shell>
        <div className="flex flex-col items-center gap-3 py-4">
          <div className="w-6 h-6 rounded-full border-2 border-[var(--line-soft)] border-t-[var(--accent)] animate-spin" />
          <p className="text-sm text-[var(--muted)]">Connecting extension…</p>
        </div>
      </Shell>
    );
  }

  // ── Error ──
  if (phase === "error") {
    return (
      <Shell>
        <h2 className="font-semibold text-sm text-center mb-1">Connection failed</h2>
        <p className="text-xs text-[var(--muted)] text-center mb-4">{error}</p>
        <button
          className="w-full py-2 rounded-[7px] bg-[var(--accent)] text-white text-xs font-medium"
          onClick={() => { setPhase("checking"); connectExtension(); }}
        >
          Retry
        </button>
      </Shell>
    );
  }

  // ── Login ──
  return (
    <Shell>
      <h2 className="font-semibold text-[15px] text-center mb-1 text-[var(--fg)]">
        Connect NextRole Extension
      </h2>
      <p className="text-xs text-[var(--muted)] text-center mb-5 leading-relaxed">
        Sign in to link your extension to your NextRole account.
      </p>

      {/* Google */}
      <button
        type="button"
        disabled={googleBusy || loginBusy}
        onClick={handleGoogle}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-[7px] border border-[var(--line-soft)] bg-[var(--surface)] text-sm font-medium text-[var(--fg)] mb-3 transition-colors hover:border-[var(--line)] disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <GoogleIcon />
        {googleBusy ? "Redirecting…" : "Continue with Google"}
      </button>

      {/* Divider */}
      <div className="flex items-center gap-2 mb-3 text-[10px] text-[var(--muted2)] uppercase tracking-wider"
           style={{ fontFamily: "var(--font-mono-stack)" }}>
        <span className="flex-1 h-px bg-[var(--line-soft)]" />
        or sign in with email
        <span className="flex-1 h-px bg-[var(--line-soft)]" />
      </div>

      {/* Email form */}
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

      <a
        href="/signup"
        className="block text-center text-xs text-[var(--accent)] mt-3 hover:underline"
      >
        Don&apos;t have an account? Sign up
      </a>
    </Shell>
  );
}
