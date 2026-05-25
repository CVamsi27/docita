import { formatCountLocale } from "@workspace/utils";

/**
 * Radix Progress shows an empty track when value is 0. For meters with no
 * included quota (e.g. WhatsApp on tiers without a bundle), we still render a
 * full-width fill so the row does not look broken.
 */
export function usageProgressPercentForBar(
  current: number,
  included: number,
): number {
  if (included > 0) {
    return Math.min(100, (current / included) * 100);
  }
  return 100;
}

export function usageMeterHasNoIncludedQuota(included: number): boolean {
  return included <= 0;
}

export function formatUsageMeterCaption(
  current: number,
  included: number,
  unit: string,
  formatUsageValue: (n: number) => string = formatCountLocale,
): string {
  if (included > 0) {
    return `${formatUsageValue(current)} / ${formatUsageValue(included)} ${unit}`;
  }
  if (current > 0) {
    return `${formatUsageValue(current)} ${unit} (no included quota)`;
  }
  return "Not included on plan";
}
