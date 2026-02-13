/**
 * Pricing utilities and helpers
 * Shared functions for currency detection, price formatting, and conversion
 */

/**
 * Currency information with conversion rates and symbols
 */
export const CURRENCY_RATES: Record<
  string,
  { symbol: string; rate: number; country: string }
> = {
  INR: { symbol: "₹", rate: 1, country: "India" },
  USD: { symbol: "$", rate: 0.012, country: "USA/Canada" },
  GBP: { symbol: "£", rate: 0.0095, country: "UK" },
  EUR: { symbol: "€", rate: 0.011, country: "Europe" },
  AUD: { symbol: "A$", rate: 0.018, country: "Australia" },
};

/**
 * Detect currency from timezone synchronously
 * Returns a currency code (INR, USD, EUR, AUD, GBP)
 */
export function detectCurrencyFromTimezone(): string {
  if (typeof window === "undefined") return "USD";

  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (
      timezone.includes("Asia/Kolkata") ||
      timezone.includes("Asia/Calcutta")
    ) {
      return "INR";
    } else if (timezone.includes("Europe")) {
      return "EUR";
    } else if (timezone.includes("Australia")) {
      return "AUD";
    } else if (
      timezone.includes("America/New_York") ||
      timezone.includes("America/Los_Angeles")
    ) {
      return "USD";
    }
  } catch {
    // Fallback to USD
  }
  return "USD";
}

/**
 * Get currency symbol from currency code
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_RATES[currency]?.symbol || "$";
}

/**
 * Get currency information including country
 */
export function getCurrencyInfo(currency: string) {
  return CURRENCY_RATES[currency] || CURRENCY_RATES.USD;
}

/**
 * Format price with currency symbol and locale
 */
export function formatPriceWithCurrency(
  amount: number,
  currency: string
): string {
  const symbol = getCurrencySymbol(currency);
  return `${symbol}${amount.toLocaleString()}`;
}

/**
 * Calculate monthly equivalent from annual price
 */
export function calculateMonthlyEquivalent(annualPrice: number): number {
  return Math.round(annualPrice / 12);
}
