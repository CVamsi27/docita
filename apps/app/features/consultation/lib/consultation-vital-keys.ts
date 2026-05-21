const VITAL_RANGE_KEYS = [
  "heartRate",
  "respiratoryRate",
  "systolicBP",
  "diastolicBP",
] as const;

export type VitalRangeKey = (typeof VITAL_RANGE_KEYS)[number];

export function isVitalRangeKey(value: string): value is VitalRangeKey {
  return (VITAL_RANGE_KEYS as readonly string[]).includes(value);
}
