const DEFAULT_NUMBER_LOCALE = "en-IN";

/** Whole-number metrics (patient counts, subscribers, usage units). */
export function formatCountLocale(
  value: number,
  locale: string = DEFAULT_NUMBER_LOCALE,
): string {
  if (!Number.isFinite(value)) return "0";
  return Math.trunc(value).toLocaleString(locale);
}

/**
 * Numeric amounts shown beside a currency symbol (no FX).
 * Defaults to up to 2 fraction digits; tighten with opts for whole rupees/dollars.
 */
export function formatAmountLocale(
  value: number,
  locale: string = DEFAULT_NUMBER_LOCALE,
  opts?: { minimumFractionDigits?: number; maximumFractionDigits?: number },
): string {
  if (!Number.isFinite(value)) return "0";
  const minimumFractionDigits = opts?.minimumFractionDigits ?? 0;
  const maximumFractionDigits = opts?.maximumFractionDigits ?? 2;
  return value.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits,
  });
}
