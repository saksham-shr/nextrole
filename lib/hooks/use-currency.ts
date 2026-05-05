"use client";

import { useEffect, useState } from "react";

// ── Base prices in INR (matches Lemon Squeezy store currency) ─────────────────
export const INR_PRICES = {
  // Monthly prices
  starter_monthly:  749,
  pro_monthly:     2000,
  team_monthly:    5000,
  byok_monthly:     999,

  // Annual prices
  starter_yearly:  7200,   // ₹600/mo  (20% off)
  pro_yearly:     12000,   // ₹1,000/mo (50% off)
  team_yearly:    50000,   // ₹4,167/mo (17% off)
  byok_yearly:     8200,   // ₹683/mo  (32% off)
} as const;

export type PlanKey = keyof typeof INR_PRICES;

// ── INR → other currency rates (static, good enough for display) ──────────────
// 1 INR = X foreign currency
const INR_TO: Record<string, number> = {
  INR: 1,
  USD: 0.012,
  GBP: 0.0095,
  EUR: 0.011,
  CAD: 0.016,
  AUD: 0.018,
  SGD: 0.016,
  AED: 0.044,
  MYR: 0.057,
  BRL: 0.061,
  MXN: 0.21,
  JPY: 1.79,
  KRW: 15.8,
  NGN: 19.2,
  PKR: 3.33,
  BDT: 1.32,
};

const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  GBP: "£",
  EUR: "€",
  CAD: "CA$",
  AUD: "A$",
  SGD: "S$",
  AED: "AED ",
  MYR: "RM",
  BRL: "R$",
  MXN: "MX$",
  JPY: "¥",
  KRW: "₩",
  NGN: "₦",
  PKR: "₨",
  BDT: "৳",
};

export interface CurrencyInfo {
  code: string;
  symbol: string;
  isLocal: boolean;
}

export interface LocalPrice {
  display: string;
  isApprox: boolean; // true when converted from INR
}

let cached: CurrencyInfo | null = null;

async function detect(): Promise<CurrencyInfo> {
  if (cached) return cached;
  try {
    const res = await fetch("https://ipapi.co/currency/", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error();
    const code = (await res.text()).trim().toUpperCase();
    if (!INR_TO[code]) throw new Error();
    cached = { code, symbol: SYMBOLS[code] ?? code + " ", isLocal: true };
    return cached;
  } catch {
    cached = { code: "INR", symbol: "₹", isLocal: false };
    return cached;
  }
}

function convert(inrAmount: number, currency: CurrencyInfo): LocalPrice {
  if (currency.code === "INR") {
    return { display: `₹${inrAmount.toLocaleString("en-IN")}`, isApprox: false };
  }
  const raw = inrAmount * (INR_TO[currency.code] ?? INR_TO.USD);
  // Round to a clean display number
  const rounded =
    raw >= 1000 ? Math.round(raw / 100) * 100
    : raw >= 100 ? Math.round(raw / 10) * 10
    : raw >= 10  ? Math.round(raw)
    : parseFloat(raw.toFixed(2));
  return {
    display: `${currency.symbol}${rounded.toLocaleString()}`,
    isApprox: true,
  };
}

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyInfo>({
    code: "INR",
    symbol: "₹",
    isLocal: false,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detect().then((c) => {
      setCurrency(c);
      setLoading(false);
    });
  }, []);

  /** Convert an INR amount to the visitor's local currency */
  function price(inrAmount: number): LocalPrice {
    return convert(inrAmount, currency);
  }

  return { currency, loading, price };
}
