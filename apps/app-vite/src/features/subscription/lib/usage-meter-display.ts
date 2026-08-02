export function usageMeterHasNoIncludedQuota(included: number): boolean {
  return included <= 0;
}

export function usageProgressPercentForBar(
  current: number,
  included: number,
): number {
  if (included <= 0) {
    return current > 0 ? 100 : 0;
  }
  return Math.min(100, Math.round((current / included) * 100));
}

export function formatUsageMeterCaption(
  current: number,
  included: number,
  unit: string,
  formatValue: (v: number) => string,
): string {
  if (included <= 0) {
    return current > 0 ? `${formatValue(current)} ${unit}` : `Unlimited`;
  }
  return `${formatValue(current)} / ${formatValue(included)} ${unit}`;
}
