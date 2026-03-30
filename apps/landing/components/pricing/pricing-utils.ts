

// Actual per-currency rates — 20-30% below industry standard
// Base: INR pricing; other currencies reflect real purchasing-power-parity exchange
export const CURRENCY_RATES: Record<
  string,
  { symbol: string; rate: number; country: string }
> = {
  INR: { symbol: "₹", rate: 1, country: "India" },
  USD: { symbol: "$", rate: 0.012, country: "USA/Canada" },
  GBP: { symbol: "£", rate: 0.0094, country: "UK" },
  EUR: { symbol: "€", rate: 0.011, country: "Europe" },
  AUD: { symbol: "A$", rate: 0.018, country: "Australia" },
  CAD: { symbol: "C$", rate: 0.016, country: "Canada" },
  SGD: { symbol: "S$", rate: 0.016, country: "Singapore" },
  AED: { symbol: "AED", rate: 0.044, country: "UAE" },
  ZAR: { symbol: "R", rate: 0.23, country: "South Africa" },
};

// Country code → currency (ISO 3166-1 alpha-2)
const COUNTRY_CURRENCY: Record<string, string> = {
  IN: "INR",
  GB: "GBP",
  AU: "AUD", NZ: "AUD",
  AT: "EUR", BE: "EUR", CY: "EUR", EE: "EUR", FI: "EUR",
  FR: "EUR", DE: "EUR", GR: "EUR", HR: "EUR", IE: "EUR",
  IT: "EUR", LV: "EUR", LT: "EUR", LU: "EUR", MT: "EUR",
  NL: "EUR", PT: "EUR", SK: "EUR", SI: "EUR", ES: "EUR",
  US: "USD", CA: "USD", MX: "USD",
  SG: "SGD", AE: "AED", ZA: "ZAR",
};

export function detectCurrencyFromTimezone(): string {
  if (typeof window === "undefined") return "USD";

  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "";
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "INR";
    if (tz.startsWith("Australia/") || tz.startsWith("Pacific/Auckland")) return "AUD";
    if (tz.startsWith("Asia/Singapore")) return "SGD";
    if (tz.startsWith("Asia/Dubai")) return "AED";
    if (tz.startsWith("Africa/Johannesburg")) return "ZAR";
    if (tz.startsWith("Europe/London") || tz === "GB") return "GBP";
    if (tz.startsWith("Europe/")) return "EUR";
    if (tz.startsWith("America/")) return "USD";
  } catch {
    // ignore
  }
  return "USD";
}

const CACHE_KEY = "docita_lp_currency";
const CACHE_TTL = 24 * 60 * 60 * 1000;

function readCurrencyCache(): string | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { c: string; exp: number };
    if (Date.now() > parsed.exp) { localStorage.removeItem(CACHE_KEY); return null; }
    return parsed.c;
  } catch { return null; }
}

function writeCurrencyCache(c: string) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ c, exp: Date.now() + CACHE_TTL }));
  } catch { /* noop */ }
}

export async function detectCurrencyFromIP(): Promise<string> {
  const cached = readCurrencyCache();
  if (cached) return cached;

  try {
    const res = await fetch("https://ipapi.co/json/", { signal: AbortSignal.timeout(3000) });
    if (!res.ok) throw new Error("geo failed");
    const data = await res.json() as { country_code?: string };
    const cc = data.country_code?.toUpperCase() ?? "";
    const detected = COUNTRY_CURRENCY[cc] ?? detectCurrencyFromTimezone();
    writeCurrencyCache(detected);
    return detected;
  } catch {
    const fallback = detectCurrencyFromTimezone();
    writeCurrencyCache(fallback);
    return fallback;
  }
}

export function getCurrencySymbol(currency: string): string {
  return CURRENCY_RATES[currency]?.symbol || "$";
}

export function getCurrencyInfo(currency: string) {
  return CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
}

export function formatPriceWithCurrency(
  amount: number,
  currency: string,
): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
}

export function calculateMonthlyEquivalent(annualPrice: number): number {
  return Math.round(annualPrice / 12);
}
