import { formatCurrency } from "@workspace/utils";

/**
 * Format integer paise as an INR string via the canonical currency
 * formatter (`en-IN`, two decimals → `₹1,23,456.00`).
 */
export function formatPaise(paise: number): string {
  if (!Number.isFinite(paise)) return "₹0.00";
  return formatCurrency(paise / 100, {
    currency: "INR",
    fractionDigits: 2,
  });
}
