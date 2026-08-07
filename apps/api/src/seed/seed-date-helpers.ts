import {
  DEFAULT_TIMEZONE,
  formatClinicTodayPickerIso,
  formatUtcInstantAsClinicPickerIso,
  fromLocalISOString,
} from '@workspace/utils';

/**
 * Timezone-aware date helpers for the seed layer (extracted from
 * seed-patients-encounters.ts 2026-08-07 so the clinic-wall → UTC math is
 * unit-tested instead of living inside a 1,451-line persistence script).
 *
 * Both helpers convert clinic-local wall time into UTC instants, so seeded
 * rows are timestamptz-correct regardless of the machine that runs the seed.
 */

/** Local noon anchor used to build a date offset from "today". */
const NOON_HOUR = 12;

function buildLocalInstant(
  dateStr: string,
  time: string,
  timezone: string,
  errorMessage: string,
): Date {
  const instant = fromLocalISOString(`${dateStr}T${time}`, { timezone });
  if (!instant) throw new Error(errorMessage);
  return instant;
}

/**
 * Returns the UTC instant for `hour:minute` on `baseDate`'s clinic-local
 * calendar day. Throws when the wall time does not exist in the zone
 * (e.g. a DST spring-forward gap).
 */
export function withTime(
  baseDate: Date,
  hour: number,
  minute: number,
  timezone: string = DEFAULT_TIMEZONE,
): Date {
  const dateStr = formatUtcInstantAsClinicPickerIso(baseDate, timezone);
  const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return buildLocalInstant(
    dateStr,
    time,
    timezone,
    'Invalid seed appointment wall time',
  );
}

/**
 * Returns a UTC instant `days` from today (negative = past) anchored at
 * clinic-local noon, so pure day arithmetic never crosses a DST boundary
 * mid-day.
 */
export function dateOffset(
  days: number,
  timezone: string = DEFAULT_TIMEZONE,
): Date {
  const todayPicker = formatClinicTodayPickerIso(timezone);
  const time = `${NOON_HOUR}:00`;
  const noon = buildLocalInstant(
    todayPicker,
    time,
    timezone,
    'Invalid seed date offset anchor',
  );
  return new Date(noon.getTime() + days * 24 * 60 * 60 * 1000);
}
