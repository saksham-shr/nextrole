import type { ReactNode } from "react";

function joinClasses(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function BrandMark({
  className,
  strokeClassName = "text-[var(--accent)]",
}: {
  className?: string;
  strokeClassName?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={joinClasses("inline-flex h-6 w-6 items-center justify-center", className)}
    >
      <svg viewBox="0 0 26 26" fill="none" className={joinClasses("h-full w-full", strokeClassName)}>
        <path
          d="M6 5L17 13L6 21"
          stroke="currentColor"
          strokeWidth="3.5"
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
  markToneClassName,
  suffix,
}: {
  className?: string;
  labelClassName?: string;
  markClassName?: string;
  markToneClassName?: string;
  suffix?: ReactNode;
}) {
  return (
    <span className={joinClasses("inline-flex items-center gap-3", className)}>
      <BrandMark className={markClassName} strokeClassName={markToneClassName} />
      <span className={joinClasses("font-[var(--font-caveat)] text-3xl font-bold leading-none", labelClassName)}>
        nextrole
      </span>
      {suffix}
    </span>
  );
}
