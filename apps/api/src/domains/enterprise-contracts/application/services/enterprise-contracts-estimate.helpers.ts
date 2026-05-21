interface EnterpriseUsageMeter {
  current: number;
  included: number;
  overage: number;
  chargeCents: number;
}

export function buildEnterpriseUsageMeter(
  current: number,
  included: number,
  rateCents: number,
): EnterpriseUsageMeter {
  const overage = Math.max(0, current - included);
  return { current, included, overage, chargeCents: overage * rateCents };
}

export function currentCalendarMonthPeriod(now: Date): {
  periodStart: Date;
  periodEnd: Date;
} {
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0,
    23,
    59,
    59,
  );
  return { periodStart, periodEnd };
}
