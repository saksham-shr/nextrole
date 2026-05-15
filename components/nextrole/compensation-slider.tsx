"use client";

import { useState, useMemo } from "react";

// ─── Locale detection ─────────────────────────────────────────────────────────

export function useIsIndia(): boolean {
  return useMemo(() => {
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz === "Asia/Kolkata" || tz === "Asia/Calcutta";
    } catch { return false; }
  }, []);
}

// ─── Field wrapper (local copy — avoids cross-file primitive dep) ─────────────

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">{label}</div>
      {children}
      {hint && <div className="mt-1 text-[11px] text-[var(--muted-foreground)]">{hint}</div>}
    </div>
  );
}

// ─── CompensationSlider ───────────────────────────────────────────────────────

export function CompensationSlider({
  isIndia,
  currentComp,
  compMin,
  compMax,
}: {
  isIndia: boolean;
  currentComp?: number | null;
  compMin?: number | null;
  compMax?: number | null;
}) {
  const sliderMin = isIndia ? 1 : 30000;
  const sliderMax = isIndia ? 300 : 600000;
  const step      = isIndia ? 1 : 10000;

  function fmt(v: number) {
    if (isIndia) return `${v} LPA`;
    return `$${(v / 1000).toFixed(0)}k`;
  }

  const defaultMin     = compMin     ?? (isIndia ? 10  : 80000);
  const defaultMax     = compMax     ?? (isIndia ? 30  : 200000);
  const defaultCurrent = currentComp ?? (isIndia ? 15  : 100000);

  const [minVal,     setMinVal]     = useState(defaultMin);
  const [maxVal,     setMaxVal]     = useState(defaultMax);
  const [currentVal, setCurrentVal] = useState(defaultCurrent);

  const minPct = ((minVal     - sliderMin) / (sliderMax - sliderMin)) * 100;
  const maxPct = ((maxVal     - sliderMin) / (sliderMax - sliderMin)) * 100;
  const curPct = ((currentVal - sliderMin) / (sliderMax - sliderMin)) * 100;

  return (
    <div className="flex flex-col gap-6">

      {/* ── Current compensation ─────────────────────────────────────────── */}
      <Field label={`Current compensation (${isIndia ? "LPA" : "USD / yr"})`}>
        <input type="hidden" name="current_comp" value={currentVal} />
        <div className="flex items-center justify-between mb-2">
          <span className="text-[12px] text-[var(--muted-foreground)]">Current</span>
          <span className="font-mono text-[14px] font-medium text-[var(--foreground)]">{fmt(currentVal)}</span>
        </div>
        {/* Single-thumb slider */}
        <div className="relative" style={{ height: 32 }}>
          {/* Track */}
          <div
            className="absolute rounded-full"
            style={{ top: "50%", transform: "translateY(-50%)", left: 0, right: 0, height: 6, background: "var(--line-soft)" }}
          >
            <div
              className="absolute h-full rounded-full"
              style={{ left: 0, right: `${100 - curPct}%`, background: "var(--accent)" }}
            />
          </div>
          <input
            type="range"
            min={sliderMin}
            max={sliderMax}
            step={step}
            value={currentVal}
            onChange={(e) => setCurrentVal(Number(e.target.value))}
            className="nr-range-single absolute inset-0 w-full appearance-none bg-transparent cursor-pointer"
            style={{ height: "100%" }}
          />
          {/* Visible thumb dot */}
          <div
            className="absolute w-4 h-4 rounded-full border-2 border-[var(--accent)] bg-[var(--surface)] shadow pointer-events-none"
            style={{ top: "50%", transform: "translateY(-50%)", left: `calc(${curPct}% - 8px)` }}
          />
        </div>
        <div className="flex justify-between mt-2 text-[10px] text-[var(--muted-foreground)] font-mono">
          <span>{fmt(sliderMin)}</span>
          <span>{fmt(sliderMax)}</span>
        </div>
      </Field>

      {/* ── Target range (dual slider) ───────────────────────────────────── */}
      <Field
        label={`Target range (${isIndia ? "LPA" : "USD / yr"})`}
        hint="Drag both ends to set your min and max target"
      >
        <input type="hidden" name="comp_min" value={minVal} />
        <input type="hidden" name="comp_max" value={maxVal} />

        <div className="flex items-center justify-between mb-3">
          {/* Min value label */}
          <div className="text-center w-16">
            <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase mb-0.5">Min</div>
            <div className="font-mono text-[14px] font-medium text-[var(--accent)]">{fmt(minVal)}</div>
          </div>

          {/* Dual-range track */}
          <div className="flex-1 mx-4 relative" style={{ height: 32 }}>
            {/* Track */}
            <div
              className="absolute rounded-full"
              style={{ top: "50%", transform: "translateY(-50%)", left: 0, right: 0, height: 6, background: "var(--line-soft)" }}
            >
              {/* Filled segment between thumbs */}
              <div
                className="absolute h-full rounded-full"
                style={{ left: `${minPct}%`, right: `${100 - maxPct}%`, background: "var(--accent)" }}
              />
            </div>

            {/* Min thumb input
                — nr-range-thumb makes pointer-events active only on the ::-webkit-slider-thumb
                — zIndex 5 when values converge so min can still be dragged leftward */}
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={step}
              value={minVal}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v < maxVal) setMinVal(v);
              }}
              className="nr-range-thumb absolute inset-0 w-full appearance-none bg-transparent"
              style={{ zIndex: minVal >= maxVal - step ? 5 : 3, height: "100%" }}
            />

            {/* Max thumb input — rendered after min so it sits on top by default */}
            <input
              type="range"
              min={sliderMin}
              max={sliderMax}
              step={step}
              value={maxVal}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v > minVal) setMaxVal(v);
              }}
              className="nr-range-thumb absolute inset-0 w-full appearance-none bg-transparent"
              style={{ zIndex: 4, height: "100%" }}
            />

            {/* Visible thumb dots (pointer-events-none — purely decorative) */}
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-[var(--accent)] bg-[var(--surface)] shadow pointer-events-none"
              style={{ top: "50%", transform: "translateY(-50%)", left: `calc(${minPct}% - 8px)` }}
            />
            <div
              className="absolute w-4 h-4 rounded-full border-2 border-[var(--accent)] bg-[var(--surface)] shadow pointer-events-none"
              style={{ top: "50%", transform: "translateY(-50%)", left: `calc(${maxPct}% - 8px)` }}
            />
          </div>

          {/* Max value label */}
          <div className="text-center w-16">
            <div className="text-[10px] text-[var(--muted-foreground)] font-mono uppercase mb-0.5">Max</div>
            <div className="font-mono text-[14px] font-medium text-[var(--accent)]">{fmt(maxVal)}</div>
          </div>
        </div>

        <div className="flex justify-between text-[10px] text-[var(--muted-foreground)] font-mono">
          <span>{fmt(sliderMin)}</span>
          <span>{fmt(sliderMax)}</span>
        </div>
      </Field>

    </div>
  );
}
