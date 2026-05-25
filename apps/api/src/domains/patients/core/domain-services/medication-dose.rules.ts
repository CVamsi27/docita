const SIG_MAP: Record<string, number> = {
  QD: 1,
  BID: 2,
  TID: 3,
  QID: 4,
  Q4H: 6,
  Q6H: 4,
  Q8H: 3,
  Q12H: 2,
  QHS: 1,
  QAM: 1,
  QPM: 1,
  QOD: 0.5,
  QWK: 1 / 7,
  STAT: 1,
  AC: 3,
  PC: 3,
};

export function parseDosesPerDay(
  sigCode: string | null | undefined,
  frequency: string,
): number | null {
  if (sigCode && SIG_MAP[sigCode] !== undefined) {
    return SIG_MAP[sigCode];
  }

  const lower = frequency.toLowerCase();
  if (lower.includes('twice') || lower.includes('bid')) return 2;
  if (
    lower.includes('three') ||
    lower.includes('tid') ||
    lower.includes('thrice')
  )
    return 3;
  if (lower.includes('four') || lower.includes('qid')) return 4;
  if (lower.includes('once') || lower.includes('daily') || lower.includes('od'))
    return 1;
  return null;
}

export function parseDurationDays(duration: string): number | null {
  const lower = duration.toLowerCase();
  const match = lower.match(/(\d+)\s*(day|week|month)/);
  if (!match) return null;

  const value = parseInt(match[1], 10);
  const unit = match[2];

  if (unit === 'day') return value;
  if (unit === 'week') return value * 7;
  if (unit === 'month') return value * 30;

  return null;
}
