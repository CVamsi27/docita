"use client";

import { useCallback, useEffect, useState } from "react";
import type { SupportedCurrency } from "@workspace/types";

const CACHE_KEY = "docita_currency";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

// Maps ISO 3166-1 alpha-2 country codes → supported currency
const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  // Indian Rupee
  IN: "INR",
  // British Pound
  GB: "GBP",
  // Australian Dollar
  AU: "AUD",
  NZ: "AUD",
  // Euro — Eurozone members
  AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", FI: "EUR",
  FR: "EUR", DE: "EUR", GR: "EUR", HR: "EUR", IE: "EUR",
  IT: "EUR", LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR",
  NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR",
  // USD — North America + rest of world as default
  US: "USD", CA: "USD", MX: "USD",
};

function readCache(): SupportedCurrency | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { currency: SupportedCurrency; exp: number };
    if (Date.now() > parsed.exp) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return parsed.currency;
  } catch {
    return null;
  }
}

function writeCache(currency: SupportedCurrency) {
  try {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ currency, exp: Date.now() + CACHE_TTL_MS }),
    );
  } catch {
    // Storage unavailable — silently skip
  }
}

function guessFromTimezone(): SupportedCurrency {
  if (typeof Intl === "undefined") return "USD";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "INR";
    if (tz.startsWith("Australia/") || tz.startsWith("Pacific/Auckland")) return "AUD";
    if (tz.startsWith("Europe/London") || tz === "GB") return "GBP";
    if (tz.startsWith("Europe/")) return "EUR";
    if (tz.startsWith("America/")) return "USD";
  } catch {
    // ignore
  }
  return "USD";
}

function countryToCurrency(code: string): SupportedCurrency {
  return COUNTRY_TO_CURRENCY[code.toUpperCase()] ?? "USD";
}

export function useLocaleCurrency() {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    if (typeof window === "undefined") return "USD";
    return readCache() ?? guessFromTimezone();
  });
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
    // If we have a valid cache, use it immediately
    const cached = readCache();
    if (cached) {
      setCurrencyState(cached);
      setIsDetecting(false);
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const detect = async () => {
      try {
        const res = await fetch("https://ipapi.co/json/", {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error("geo-lookup failed");
        const data = (await res.json()) as { country_code?: string };
        if (cancelled) return;
        const detected = countryToCurrency(data.country_code ?? "");
        setCurrencyState(detected);
        writeCache(detected);
      } catch {
        // ipapi unavailable — fall back to timezone heuristic
        const fallback = guessFromTimezone();
        if (!cancelled) {
          setCurrencyState(fallback);
          writeCache(fallback);
        }
      } finally {
        if (!cancelled) setIsDetecting(false);
      }
    };

    detect();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  // Allow manual override (persists to cache)
  const setCurrency = useCallback((c: SupportedCurrency) => {
    setCurrencyState(c);
    writeCache(c);
  }, []);

  return { currency, isDetecting, setCurrency };
}
