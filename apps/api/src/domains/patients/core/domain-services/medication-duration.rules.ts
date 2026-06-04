const DURATION_MULTIPLIER: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
};

export function parseDurationDays(duration: string): number | null {
  const match = duration.toLowerCase().match(/(\d+)\s*(day|week|month)/);
  if (!match) return null;
  const value = parseInt(match[1], 10);
  const unit = match[2];
  return unit ? value * DURATION_MULTIPLIER[unit] : null;
}
