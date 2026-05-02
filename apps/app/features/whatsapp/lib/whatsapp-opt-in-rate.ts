/** Percentage of patients opted into WhatsApp updates (0–100). */
export function whatsappOptInRatePercent(
  subscribers: number,
  totalPatients: number,
): number {
  if (!Number.isFinite(subscribers) || !Number.isFinite(totalPatients)) {
    return 0;
  }
  if (totalPatients <= 0) return 0;
  return Math.round((subscribers / totalPatients) * 100);
}
