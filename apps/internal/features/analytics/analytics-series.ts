export function computeTierEntries(
  subscriptionsByTier: Record<string, number> | undefined,
): [string, number][] {
  return subscriptionsByTier
    ? Object.entries(subscriptionsByTier).sort((a, b) => b[1] - a[1])
    : [];
}

export function computeTotalTierCount(tierEntries: [string, number][]): number {
  return tierEntries.reduce((sum, [, value]) => sum + value, 0);
}

export function computeRevenueByMonth(
  revenueByMonth: Array<{ month: string; revenue: number }> | undefined,
): Array<{ month: string; revenue: number }> {
  return revenueByMonth || [];
}

export function computeMaxRevenue(
  revenueByMonth: Array<{ month: string; revenue: number }>,
): number {
  return Math.max(...revenueByMonth.map((row) => row.revenue), 1);
}
