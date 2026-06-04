export function formatCurrency(amount: number): string {
  if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`;
  return `₹${amount.toFixed(0)}`;
}

export function formatChange(
  value: number | undefined | null,
): string | undefined {
  if (!value) return undefined;
  return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
}

export function resolveTrend(
  value: number | undefined | null,
): "up" | "down" | "neutral" {
  if (!value) return "neutral";
  if (value > 0) return "up";
  return "down";
}
