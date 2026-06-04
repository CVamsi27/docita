import { parseDurationDays } from './medication-duration.rules';
import { parseFrequencyDoses } from './medication-frequency.rules';

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
  return parseFrequencyDoses(frequency);
}
export { parseDurationDays };
