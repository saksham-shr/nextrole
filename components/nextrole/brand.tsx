import type { ReactNode } from "react";

function joinClasses(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Braevity symbol — the outline "B" mark.
 * Served from /braevity-icon.png (orange) and /braevity-icon-white.png (reverse).
 */
export function BrandMark({
  className,
  size = 22,
  tone = "orange",
}: {
  className?: string;
  size?: number;
  tone?: "orange" | "white";
}) {
  const src = tone === "white" ? "/braevity-icon-white.png" : "/braevity-icon.png";
  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={joinClasses("inline-block shrink-0 object-contain", className)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * Braevity wordmark — symbol + "Braevity" set in Archivo Expanded.
 */
export function BrandWordmark({
  className,
  labelClassName,
  markClassName,
  size = 22,
  tone = "orange",
  suffix,
}: {
  className?: string;
  labelClassName?: string;
  markClassName?: string;
  markToneClassName?: string;
  size?: number;
  tone?: "orange" | "white";
  suffix?: ReactNode;
}) {
  return (
    <span className={joinClasses("inline-flex items-center gap-2", className)}>
      <BrandMark className={markClassName} size={size} tone={tone} />
      <span
        className={joinClasses("nr-wordmark leading-none", labelClassName)}
        style={{ fontSize: Math.round(size * 0.82) }}
      >
        Braevity
      </span>
      {suffix}
    </span>
  );
}
