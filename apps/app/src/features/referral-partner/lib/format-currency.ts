/**
 * Format integer paise as an INR string. `Intl.NumberFormat('en-IN')`
 * is locale-aware and produces the same shape as the rest of the app
 * (₹1,23,456.00 grouping).
 */
export function formatPaise(paise: number): string {
  if (!Number.isFinite(paise)) return "₹0.00";
  const rupees = paise / 100;
  return `₹${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
