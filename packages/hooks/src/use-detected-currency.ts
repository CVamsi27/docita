"use client";

import { useCallback, useEffect, useState } from "react";

type SupportedCurrency = "INR" | "USD" | "EUR" | "GBP" | "AUD";

const CACHE_KEY = "docita_currency";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

const COUNTRY_TO_CURRENCY: Record<string, SupportedCurrency> = {
  IN: "INR",
  GB: "GBP",
  AU: "AUD",
  NZ: "AUD",
  AT: "EUR",
  BE: "EUR",
  CY: "EUR",
  EE: "EUR",
  FI: "EUR",
  FR: "EUR",
  DE: "EUR",
  GR: "EUR",
  HR: "EUR",
  IE: "EUR",
  IT: "EUR",
  LV: "EUR",
  LT: "EUR",
  LU: "EUR",
  MT: "EUR",
  NL: "EUR",
  PT: "EUR",
  SK: "EUR",
  SI: "EUR",
  ES: "EUR",
  US: "USD",
  CA: "USD",
  MX: "USD",
};

function readCache(): SupportedCurrency | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      currency: SupportedCurrency;
      exp: number;
    };
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
    // ignore storage failures
  }
}

export function guessCurrencyFromTimezone(): SupportedCurrency {
  if (typeof Intl === "undefined") return "USD";

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) {
      return "INR";
    }
    if (tz.startsWith("Australia/") || tz.startsWith("Pacific/Auckland")) {
      return "AUD";
    }
    if (tz.startsWith("Europe/London") || tz === "GB") {
      return "GBP";
    }
    if (tz.startsWith("Europe/")) {
      return "EUR";
    }
    if (tz.startsWith("America/")) {
      return "USD";
    }
  } catch {
    // ignore
  }

  return "USD";
}

export function countryCodeToCurrency(code: string): SupportedCurrency {
  return COUNTRY_TO_CURRENCY[code.toUpperCase()] ?? "USD";
}

export function useDetectedCurrency() {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    if (typeof window === "undefined") return "USD";
    return readCache() ?? guessCurrencyFromTimezone();
  });
  const [isDetecting, setIsDetecting] = useState(true);

  useEffect(() => {
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
        const detected = countryCodeToCurrency(data.country_code ?? "");
        setCurrencyState(detected);
        writeCache(detected);
      } catch {
        const fallback = guessCurrencyFromTimezone();
        if (!cancelled) {
          setCurrencyState(fallback);
          writeCache(fallback);
        }
      } finally {
        if (!cancelled) setIsDetecting(false);
      }
    };

    void detect();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const setCurrency = useCallback((next: SupportedCurrency) => {
    setCurrencyState(next);
    writeCache(next);
  }, []);

  return { currency, isDetecting, setCurrency };
}
