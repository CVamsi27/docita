export function formatInternalTimestamp(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export function formatInternalListDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

export function formatDistanceToNow(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return String(Math.floor(days / 30)) + "mo ago";
  if (days > 0) return String(days) + "d ago";
  if (hours > 0) return String(hours) + "h ago";
  if (minutes > 0) return String(minutes) + "m ago";
  return "just now";
}

export function formatCurrency(
  amount: number,
  options?: { currency?: string; fractionDigits?: number }
): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: options?.currency ?? "INR",
    maximumFractionDigits: options?.fractionDigits ?? 2,
    minimumFractionDigits: options?.fractionDigits ?? 0,
  }).format(amount);
}

/**
 * Compact currency formatter for analytics cards ("₹1.2L", "$2.5M"). Uses
 * `Intl.NumberFormat` compact notation so the suffix is locale-correct
 * without the hand-rolled `value / 1000` math that loses precision and
 * breaks for sub-1K values. Falls back to the regular `formatCurrency` for
 * sub-1K amounts so the analytics card stays readable when there is no
 * revenue yet.
 */
export function formatCompactCurrency(
  amount: number,
  options?: { currency?: string; fractionDigits?: number }
): string {
  if (!Number.isFinite(amount)) return formatCurrency(0, options);
  if (Math.abs(amount) < 1_000) return formatCurrency(amount, options);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: options?.currency ?? "INR",
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(amount);
}

export function formatDate(date: string | Date, _format?: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-IN", {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
}
