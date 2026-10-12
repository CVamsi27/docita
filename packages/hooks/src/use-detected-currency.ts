"use client";

import { useCallback, useEffect, useState } from "react";
import { isRecord, parseSupportedCurrency } from "@workspace/utils";

type SupportedCurrency =
  | "INR"
  | "USD"
  | "EUR"
  | "GBP"
  | "AUD"
  | "CAD"
  | "SGD"
  | "AED"
  | "ZAR";

const CACHE_KEY = "docita_currency";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function readCache(): SupportedCurrency | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    const exp =
      typeof parsed["exp"] === "number" ? parsed["exp"] : Number.NaN;
    const currency =
      typeof parsed["currency"] === "string"
        ? parseSupportedCurrency(parsed["currency"])
        : null;
    if (!currency || !Number.isFinite(exp) || Date.now() > exp) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }
    return currency;
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

function guessCurrencyFromTimezone(): SupportedCurrency {
  if (typeof Intl === "undefined") return "USD";

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) {
      return "INR";
    }
    if (tz.startsWith("Australia/") || tz.startsWith("Pacific/Auckland")) {
      return "AUD";
    }
    if (tz.startsWith("America/Toronto") || tz.startsWith("America/Vancouver")) {
      return "CAD";
    }
    if (tz.startsWith("Asia/Singapore")) {
      return "SGD";
    }
    if (tz.startsWith("Asia/Dubai")) {
      return "AED";
    }
    if (tz.startsWith("Africa/Johannesburg")) {
      return "ZAR";
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
    // Timezone access can be blocked by the browser; fall back to USD.
  }

  return "USD";
}

export function useDetectedCurrency() {
  const [currency, setCurrencyState] = useState<SupportedCurrency>(() => {
    if (typeof window === "undefined") return "USD";
    return readCache() ?? guessCurrencyFromTimezone();
  });
  /** Always false: currency comes from cache or timezone (no network geo lookup). */
  const isDetecting = false;

  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setCurrencyState(cached);
      return;
    }

    const fallback = guessCurrencyFromTimezone();
    setCurrencyState(fallback);
    writeCache(fallback);
  }, []);

  const setCurrency = useCallback((next: SupportedCurrency) => {
    setCurrencyState(next);
    writeCache(next);
  }, []);

  return { currency, isDetecting, setCurrency };
}
