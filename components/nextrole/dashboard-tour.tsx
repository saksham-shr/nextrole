"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

export type DashboardTourHandle = { open: () => void };

type TourStep = {
  target: string;
  title: string;
  description: string;
  placement: "right" | "bottom";
};

const TOUR_STEPS: TourStep[] = [
  {
    target: '[data-tour="bucket-jobs"]',
    title: "Jobs",
    description: "Save job postings, evaluate fit, run the AI scanner, and compare roles side by side.",
    placement: "right",
  },
  {
    target: '[data-tour="bucket-resume"]',
    title: "Resume",
    description: "Upload your base CV and generate tailored resumes for each role automatically.",
    placement: "right",
  },
  {
    target: '[data-tour="bucket-prep"]',
    title: "Prep",
    description: "Practice interview answers, build a reusable story bank, draft cover letters, and follow up after applying.",
    placement: "right",
  },
  {
    target: '[data-tour="bucket-track"]',
    title: "Track",
    description: "Move jobs through every stage — applied, interview, offer — and never lose track of where things stand.",
    placement: "right",
  },
  {
    target: '[data-tour="bucket-settings"]',
    title: "Settings",
    description: "Manage your profile, CV, targeting preferences, and billing.",
    placement: "right",
  },
  {
    target: '[data-tour="search-bar"]',
    title: "Command palette",
    description: "Press ⌘K anywhere to jump to any page, trigger any action, or search across the workspace.",
    placement: "bottom",
  },
];

const TOOLTIP_W = 260;
const TOOLTIP_H = 148;
const GAP = 14;

function getTooltipPosition(
  rect: DOMRect,
  placement: "right" | "bottom",
): { top: number; left: number } {
  if (placement === "right") {
    return {
      top: Math.max(8, rect.top + rect.height / 2 - TOOLTIP_H / 2),
      left: Math.min(rect.right + GAP, window.innerWidth - TOOLTIP_W - 8),
    };
  }
  return {
    top: rect.bottom + GAP,
    left: Math.max(8, Math.min(rect.left, window.innerWidth - TOOLTIP_W - 8)),
  };
}

const STORAGE_KEY = "nr_tour_done";

export const DashboardTour = forwardRef<DashboardTourHandle>(function DashboardTour(_, ref) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);
  const [spotlightStyle, setSpotlightStyle] = useState<React.CSSProperties>({});
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const resizeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const open = useCallback(() => {
    setStep(0);
    setVisible(true);
  }, []);

  useImperativeHandle(ref, () => ({ open }), [open]);

  // Auto-show on first visit
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem(STORAGE_KEY)) {
      const t = setTimeout(() => open(), 800);
      return () => clearTimeout(t);
    }
  }, [open]);

  const positionForStep = useCallback((idx: number) => {
    const s = TOUR_STEPS[idx];
    if (!s) return;
    const el = document.querySelector(s.target);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setSpotlightStyle({
      position: "fixed",
      top: rect.top - 4,
      left: rect.left - 4,
      width: rect.width + 8,
      height: rect.height + 8,
      borderRadius: "14px",
      pointerEvents: "none",
      zIndex: 9998,
      boxShadow: "0 0 0 9999px rgba(0,0,0,0.48)",
      transition: "all 0.22s ease",
    });
    const pos = getTooltipPosition(rect, s.placement);
    setTooltipStyle({
      position: "fixed",
      top: pos.top,
      left: pos.left,
      width: TOOLTIP_W,
      zIndex: 9999,
      transition: "all 0.22s ease",
    });
  }, []);

  useEffect(() => {
    if (!visible) return;
    positionForStep(step);

    const onResize = () => {
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
      resizeTimer.current = setTimeout(() => positionForStep(step), 80);
    };
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      if (resizeTimer.current) clearTimeout(resizeTimer.current);
    };
  }, [visible, step, positionForStep]);

  const dismiss = useCallback(() => {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "1");
    }
  }, []);

  const next = useCallback(() => {
    if (step < TOUR_STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      dismiss();
    }
  }, [step, dismiss]);

  const prev = useCallback(() => {
    if (step > 0) setStep((s) => s - 1);
  }, [step]);

  if (!visible) return null;

  const current = TOUR_STEPS[step];
  const isLast = step === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Spotlight ring */}
      <div style={spotlightStyle} aria-hidden="true" />

      {/* Tooltip card */}
      <div style={tooltipStyle}>
        <div
          className="rounded-2xl border border-[var(--line-soft)] bg-[var(--surface)] p-4"
          style={{ boxShadow: "0 8px 24px rgba(0,0,0,0.14)" }}
        >
          {/* Step label */}
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-[var(--muted-foreground-2)]">
            {step + 1} / {TOUR_STEPS.length}
          </p>

          <p className="text-sm font-bold text-[var(--foreground)]">{current.title}</p>
          <p className="mt-1.5 text-[12.5px] leading-[1.55] text-[var(--muted-foreground)]">
            {current.description}
          </p>

          {/* Progress dots */}
          <div className="mt-3 flex items-center gap-1">
            {TOUR_STEPS.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all"
                style={{
                  width: i === step ? 18 : 6,
                  background: i === step ? "var(--accent)" : "var(--line-soft)",
                }}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="mt-3 flex items-center gap-2">
            <button
              onClick={dismiss}
              className="text-[11px] text-[var(--muted-foreground)] transition hover:text-[var(--foreground)]"
            >
              Skip
            </button>
            <div className="flex-1" />
            {step > 0 && (
              <button
                onClick={prev}
                className="rounded-lg border border-[var(--line-soft)] px-3 py-1.5 text-[11px] font-medium text-[var(--muted-foreground)] transition hover:border-[var(--line)] hover:text-[var(--foreground)]"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-white transition hover:opacity-88"
              style={{ background: "var(--accent)" }}
            >
              {isLast ? "Done" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
});
