import type { ReactNode } from "react";

function joinClasses(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function BrandMark({
  className,
  size = 22,
}: {
  className?: string;
  size?: number;
}) {
  const radius = Math.round(size * 0.18);
  return (
    <span
      aria-hidden="true"
      className={joinClasses("inline-flex shrink-0 items-center justify-center bg-[var(--accent)]", className)}
      style={{ width: size, height: size, borderRadius: radius }}
    >
      <svg
        width={size * 0.55}
        height={size * 0.55}
        viewBox="0 0 24 24"
        fill="none"
      >
        <path
          d="M8 5L17 12L8 19"
          stroke="#fffdf8"
          strokeWidth="3.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function BrandWordmark({
  className,
  labelClassName,
  markClassName,
  size = 22,
  suffix,
}: {
  className?: string;
  labelClassName?: string;
  markClassName?: string;
  markToneClassName?: string;
  size?: number;
  suffix?: ReactNode;
}) {
  return (
    <span className={joinClasses("inline-flex items-center gap-2", className)}>
      <BrandMark className={markClassName} size={size} />
      <span
        className={joinClasses("font-[var(--font-mono-stack)] font-medium leading-none tracking-[-0.01em]", labelClassName)}
        style={{ fontSize: Math.round(size * 0.68) }}
      >
        nextrole
      </span>
      {suffix}
    </span>
  );
}
