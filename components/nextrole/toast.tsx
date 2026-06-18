"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

// ── Types ─────────────────────────────────────────────────────────────────

type ToastType = "success" | "error" | "warning" | "info";

interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  component?: string;
  dismissing?: boolean;
}

interface ToastOpts {
  duration?: number;
  component?: string;
}

interface ToastAPI {
  success: (msg: string, opts?: ToastOpts) => void;
  error: (msg: string, opts?: ToastOpts) => void;
  warning: (msg: string, opts?: ToastOpts) => void;
  info: (msg: string, opts?: ToastOpts) => void;
  confirm: (msg: string, opts?: { title?: string; confirmLabel?: string; cancelLabel?: string }) => Promise<boolean>;
}

interface ConfirmState {
  msg: string;
  title: string;
  confirmLabel: string;
  cancelLabel: string;
  resolve: (v: boolean) => void;
}

// ── Context ───────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastAPI | null>(null);

export function useToast(): ToastAPI {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

// ── Icons ─────────────────────────────────────────────────────────────────

function SuccessIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--ok)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" strokeWidth="2" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  );
}
function ErrorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--bad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
function WarningIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--warn)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
function InfoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="16" x2="12" y2="12" />
      <line x1="12" y1="8" x2="12.01" y2="8" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

const ICON: Record<ToastType, () => ReactNode> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
};

const BG: Record<ToastType, string> = {
  success: "var(--ok-bg)",
  error: "var(--bad-bg)",
  warning: "var(--warn-bg)",
  info: "var(--accent-soft)",
};

const BORDER: Record<ToastType, string> = {
  success: "rgba(47,122,58,0.25)",
  error: "rgba(181,58,58,0.25)",
  warning: "rgba(176,122,24,0.25)",
  info: "rgba(200,74,31,0.2)",
};

// ── Toast item component ──────────────────────────────────────────────────

function ToastCard({
  item,
  onDismiss,
}: {
  item: ToastItem;
  onDismiss: (id: string) => void;
}) {
  const [reported, setReported] = useState(false);
  const Icon = ICON[item.type];

  async function handleReport() {
    try {
      await fetch("/api/error-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          error_message: item.message,
          page_url: window.location.href,
          component: item.component ?? null,
        }),
      });
      setReported(true);
    } catch {
      // silently fail
    }
  }

  return (
    <div
      style={{
        background: "var(--surface)",
        border: `1px solid ${BORDER[item.type]}`,
        borderLeft: `3px solid ${BORDER[item.type].replace(/[\d.]+\)$/, "0.7)")}`,
        borderRadius: 12,
        padding: "10px 14px",
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        minWidth: 300,
        maxWidth: 460,
        boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
        animation: item.dismissing ? "toastOut 0.25s ease forwards" : "toastIn 0.3s ease",
        pointerEvents: "auto",
      }}
    >
      <span style={{ marginTop: 1, flexShrink: 0 }}><Icon /></span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, lineHeight: 1.5, color: "var(--foreground)", margin: 0, wordBreak: "break-word" }}>
          {item.message}
        </p>
        {item.type === "error" && (
          <div style={{ marginTop: 6 }}>
            {reported ? (
              <span style={{ fontSize: 11, color: "var(--ok)", fontWeight: 500 }}>Reported — thank you</span>
            ) : (
              <button
                onClick={handleReport}
                style={{
                  fontSize: 11,
                  color: "var(--muted-foreground)",
                  background: "var(--surface-soft)",
                  border: "1px solid var(--line-soft)",
                  borderRadius: 6,
                  padding: "2px 8px",
                  cursor: "pointer",
                  transition: "color 0.15s",
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.color = "var(--accent)"; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.color = "var(--muted-foreground)"; }}
              >
                Report this issue
              </button>
            )}
          </div>
        )}
      </div>
      <button
        onClick={() => onDismiss(item.id)}
        style={{
          flexShrink: 0,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--muted-foreground)",
          padding: 2,
          marginTop: -1,
          opacity: 0.6,
          transition: "opacity 0.15s",
        }}
        onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = "1"; }}
        onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = "0.6"; }}
      >
        <CloseIcon />
      </button>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────

function ConfirmDialog({ state, onResolve }: { state: ConfirmState; onResolve: (v: boolean) => void }) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onResolve(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onResolve]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.35)",
        animation: "fadeIn 0.15s ease",
      }}
      onClick={() => onResolve(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface)",
          borderRadius: 16,
          padding: "24px 28px",
          maxWidth: 400,
          width: "90%",
          boxShadow: "0 8px 40px rgba(0,0,0,0.12)",
          animation: "scaleIn 0.2s ease",
        }}
      >
        <h3 style={{ margin: "0 0 8px", fontSize: 15, fontWeight: 600, color: "var(--foreground)" }}>
          {state.title}
        </h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, lineHeight: 1.6, color: "var(--muted-foreground)" }}>
          {state.msg}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={() => onResolve(false)}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              borderRadius: 8,
              border: "1px solid var(--line-soft)",
              background: "var(--surface)",
              color: "var(--foreground)",
              cursor: "pointer",
              fontWeight: 500,
            }}
          >
            {state.cancelLabel}
          </button>
          <button
            ref={confirmRef}
            onClick={() => onResolve(true)}
            style={{
              padding: "7px 16px",
              fontSize: 13,
              borderRadius: 8,
              border: "none",
              background: "var(--bad)",
              color: "#fff",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {state.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Provider ──────────────────────────────────────────────────────────────

let idCounter = 0;
function nextId() { return `toast-${++idCounter}-${Date.now()}`; }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [confirmState, setConfirmState] = useState<ConfirmState | null>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, dismissing: true } : t));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 250);
    const timer = timers.current.get(id);
    if (timer) { clearTimeout(timer); timers.current.delete(id); }
  }, []);

  const push = useCallback((type: ToastType, message: string, opts?: ToastOpts) => {
    const id = nextId();
    const duration = opts?.duration ?? (type === "error" || type === "warning" ? 8000 : 4000);
    setToasts((prev) => [...prev, { id, type, message, duration, component: opts?.component }]);
    const timer = setTimeout(() => dismiss(id), duration);
    timers.current.set(id, timer);
  }, [dismiss]);

  const api: ToastAPI = {
    success: useCallback((msg, opts?) => push("success", msg, opts), [push]),
    error: useCallback((msg, opts?) => push("error", msg, opts), [push]),
    warning: useCallback((msg, opts?) => push("warning", msg, opts), [push]),
    info: useCallback((msg, opts?) => push("info", msg, opts), [push]),
    confirm: useCallback((msg, opts?) => {
      return new Promise<boolean>((resolve) => {
        setConfirmState({
          msg,
          title: opts?.title ?? "Are you sure?",
          confirmLabel: opts?.confirmLabel ?? "Confirm",
          cancelLabel: opts?.cancelLabel ?? "Cancel",
          resolve,
        });
      });
    }, []),
  };

  function handleConfirmResolve(value: boolean) {
    confirmState?.resolve(value);
    setConfirmState(null);
  }

  return (
    <ToastContext.Provider value={api}>
      {children}

      {/* Toast container */}
      <div
        style={{
          position: "fixed",
          top: 16,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 9999,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 8,
          pointerEvents: "none",
        }}
      >
        {toasts.map((t) => (
          <ToastCard key={t.id} item={t} onDismiss={dismiss} />
        ))}
      </div>

      {/* Confirm dialog */}
      {confirmState && (
        <ConfirmDialog state={confirmState} onResolve={handleConfirmResolve} />
      )}
    </ToastContext.Provider>
  );
}
