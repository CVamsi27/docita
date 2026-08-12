export interface SeedBillingPeriods {
  cycleStart: Date;
  cycleEnd: Date;
  cycleKey: string;
  legacyUtcCycleKey: string;
  subscriptionStart: Date;
  subscriptionEnd: Date;
}

export function getMonthRange(date = new Date()): { start: Date; end: Date } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
  const end = new Date(
    date.getFullYear(),
    date.getMonth() + 1,
    0,
    23,
    59,
    59,
    999,
  );
  return { start, end };
}

export function getSeedBillingPeriods(): SeedBillingPeriods {
  const { start: cycleStart, end: cycleEnd } = getMonthRange();
  const cycleKey = `${cycleStart.getFullYear()}-${String(
    cycleStart.getMonth() + 1,
  ).padStart(2, '0')}`;
  const subscriptionStart = new Date();
  subscriptionStart.setHours(0, 0, 0, 0);
  const subscriptionEnd = new Date(subscriptionStart);
  subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
  const legacyUtcCycleKey = `${cycleStart.getUTCFullYear()}-${String(
    cycleStart.getUTCMonth() + 1,
  ).padStart(2, '0')}`;

  return {
    cycleStart,
    cycleEnd,
    cycleKey,
    legacyUtcCycleKey,
    subscriptionStart,
    subscriptionEnd,
  };
}

/**
 * The six `seed:<clinicId>:<cycleKey>:<metric>` usage keys (current and
 * legacy-UTC cycle variants) written by the usage-event and usage-record
 * seed paths. Single source so the delete/insert key sets can never drift
 * apart.
 */
export function buildSeedUsageKeys(
  clinicId: string,
  periods: SeedBillingPeriods,
): {
  consultations: string;
  whatsapp: string;
  users: string;
  legacyConsultations: string;
  legacyWhatsapp: string;
  legacyUsers: string;
} {
  return {
    consultations: `seed:${clinicId}:${periods.cycleKey}:consultations`,
    whatsapp: `seed:${clinicId}:${periods.cycleKey}:whatsapp`,
    users: `seed:${clinicId}:${periods.cycleKey}:users`,
    legacyConsultations: `seed:${clinicId}:${periods.legacyUtcCycleKey}:consultations`,
    legacyWhatsapp: `seed:${clinicId}:${periods.legacyUtcCycleKey}:whatsapp`,
    legacyUsers: `seed:${clinicId}:${periods.legacyUtcCycleKey}:users`,
  };
}
