"use client";

import { useEffect, useState } from "react";
import { TOPUP_PACKS, type TopupPackId } from "@/lib/ai/gates";

// Base subscription prices in INR
export const INR_PRICES = {
  starter_monthly:  749,
  pro_monthly:     1999,
  starter_yearly:  7200,
  pro_yearly:     17999,
} as const;

// Top-up prices already defined in gates.ts (INR)

export type PlanKey = keyof typeof INR_PRICES;

// INR → foreign currency conversion rates (1 INR = X)
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
  INR: "₹", USD: "$", GBP: "£", EUR: "€", CAD: "CA$",
  AUD: "A$", SGD: "S$", AED: "AED ", MYR: "RM", BRL: "R$",
  MXN: "MX$", JPY: "¥", KRW: "₩", NGN: "₦", PKR: "₨", BDT: "৳",
};

export interface CurrencyInfo {
  code: string;
  symbol: string;
  countryCode: string;
  isIndia: boolean;
}

export interface LocalPrice {
  display: string;
  isApprox: boolean;
}

let _cached: CurrencyInfo | null = null;

async function detectCurrency(): Promise<CurrencyInfo> {
  if (_cached) return _cached;
  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error();
    const data = (await res.json()) as { currency?: string; country_code?: string };
    const code    = (data.currency ?? "INR").trim().toUpperCase();
    const country = (data.country_code ?? "").trim().toUpperCase();
    _cached = {
      code:        INR_TO[code] ? code : "INR",
      symbol:      SYMBOLS[code] ?? code + " ",
      countryCode: country,
      isIndia:     country === "IN",
    };
    return _cached;
  } catch {
    _cached = { code: "INR", symbol: "₹", countryCode: "IN", isIndia: true };
    return _cached;
  }
}

function convertFromINR(inrAmount: number, currency: CurrencyInfo): LocalPrice {
  if (currency.code === "INR") {
    return { display: `₹${inrAmount.toLocaleString("en-IN")}`, isApprox: false };
  }
  const raw = inrAmount * (INR_TO[currency.code] ?? INR_TO.USD);
  const rounded =
    raw >= 1000 ? Math.round(raw / 100) * 100
    : raw >= 100 ? Math.round(raw / 10) * 10
    : raw >= 10  ? Math.round(raw)
    : parseFloat(raw.toFixed(2));
  return { display: `${currency.symbol}${rounded.toLocaleString()}`, isApprox: true };
}

/**
 * Format a compensation value:
 * - India: display in LPA (Lakhs Per Annum), value in lakhs (e.g. "12 LPA")
 * - Outside India: standard number (e.g. "$120,000")
 */
export function formatComp(annualValue: number, isIndia: boolean, symbol = "$"): string {
  if (isIndia) {
    const lpa = annualValue / 100000;
    return `${lpa % 1 === 0 ? lpa.toFixed(0) : lpa.toFixed(1)} LPA`;
  }
  return `${symbol}${annualValue.toLocaleString()}`;
}

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyInfo>({
    code: "INR", symbol: "₹", countryCode: "IN", isIndia: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    detectCurrency().then((c) => { setCurrency(c); setLoading(false); });
  }, []);

  function price(inrAmount: number): LocalPrice {
    return convertFromINR(inrAmount, currency);
  }

  function topupPrice(packId: TopupPackId): LocalPrice {
    const pack = TOPUP_PACKS.find((p) => p.id === packId);
    if (!pack) return { display: "—", isApprox: false };
    return convertFromINR(pack.inr, currency);
  }

  return { currency, loading, price, topupPrice, isIndia: currency.isIndia };
}
