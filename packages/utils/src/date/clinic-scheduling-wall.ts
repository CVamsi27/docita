import { enUS } from "date-fns/locale";
import { formatInTimeZone } from "date-fns-tz";
import { DEFAULT_TIMEZONE } from "./date-config.js";
import { formatPickerIsoDate } from "./date-formatting.js";
import { fromLocalISOString } from "./iso-date-utils.js";

/**
 * Scheduling displays/editing use naive `yyyy-MM-dd'T'HH:mm` strings interpreted as
 * **clinic wall time** (not the browser's local zone). APIs persist UTC ISO instants.
 */

/** Local calendar midnight for a date-picker cell (stable react-day-picker `selected` matching). */
export function normalizePickerSelectionDate(selection: Date): Date {
  return new Date(
    selection.getFullYear(),
    selection.getMonth(),
    selection.getDate(),
    0,
    0,
    0,
    0,
  );
}

/** yyyy-MM-dd picker value from a calendar cell (grid day = clinic schedule day). */
export function formatClinicPickerDayIsoFromSelection(
  selection: Date,
  _timezone?: string,
): string {
  return formatPickerIsoDate(normalizePickerSelectionDate(selection));
}

/** Build a local Date for react-day-picker from a yyyy-MM-dd picker value. */
export function pickerIsoToLocalDate(pickerIso: string): Date {
  const parts = pickerIso.split("-").map((x) => parseInt(x, 10));
  const y = parts[0] ?? 1970;
  const m = (parts[1] ?? 1) - 1;
  const d = parts[2] ?? 1;
  return new Date(y, m, d, 0, 0, 0, 0);
}

/** Today's calendar day in the clinic zone as a local Date for the appointments picker. */
export function clinicTodayAsPickerDate(
  timezone: string = DEFAULT_TIMEZONE,
): Date {
  return pickerIsoToLocalDate(formatClinicTodayPickerIso(timezone));
}

/** Human-readable label for a clinic picker day (avoids browser-local Date drift). */
export function formatClinicPickerIsoLabel(
  pickerIso: string,
  formatPattern: string,
  timezone: string = DEFAULT_TIMEZONE,
): string {
  const trimmed = pickerIso.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return "";
  }
  const instant = fromLocalISOString(`${trimmed}T12:00`, { timezone });
  if (!instant) {
    return trimmed;
  }
  return formatInTimeZone(instant, timezone, formatPattern, {
    locale: enUS,
  });
}

/** Today's calendar date in the clinic zone. */
export function formatClinicTodayPickerIso(
  timezone: string = DEFAULT_TIMEZONE,
): string {
  return formatInTimeZone(new Date(), timezone, "yyyy-MM-dd");
}

/** Short clinic-local timestamp for activity rows (e.g. request arrival). */
export function formatClinicFriendlyDateTime(
  instant: Date | string,
  timezone: string,
): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return formatInTimeZone(d, timezone, "MMM d, yyyy · h:mm a", {
    locale: enUS,
  });
}

/** Hour and minute (clinic wall clock) for an instant. */
export function clinicWallHourMinuteFromUtcInstant(
  instant: Date,
  timezone: string,
): { hour: number; minute: number } {
  const hh = formatInTimeZone(instant, timezone, "HH");
  const mm = formatInTimeZone(instant, timezone, "mm");
  return { hour: parseInt(hh, 10), minute: parseInt(mm, 10) };
}

/** yyyy-MM-dd picker day for an instant in the clinic zone. */
export function formatUtcInstantAsClinicPickerIso(
  instant: Date | string,
  timezone: string,
): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(d.getTime())) {
    return "";
  }
  return formatInTimeZone(d, timezone, "yyyy-MM-dd");
}

/**
 * Weekday label aligned with schedule enums (`MONDAY`, …) for a picker calendar day in the clinic zone.
 */
export function formatPickerIsoAsWeekdayUpper(
  pickerIso: string,
  timezone: string,
): string {
  const instant = fromLocalISOString(`${pickerIso}T12:00`, { timezone });
  if (!instant) {
    return "";
  }
  return formatInTimeZone(instant, timezone, "EEEE", {
    locale: enUS,
  }).toUpperCase();
}

/** Half-hour grid key (`HH:mm`) for an instant in the clinic wall clock. */
export function formatClinicHalfHourSlotKey(instant: Date, timezone: string): string {
  const { hour, minute } = clinicWallHourMinuteFromUtcInstant(instant, timezone);
  const slotMinutes = Math.floor(minute / 30) * 30;
  return `${String(hour).padStart(2, "0")}:${String(slotMinutes).padStart(2, "0")}`;
}

/** Add minutes in the clinic zone and return normalized clinic-wall `yyyy-MM-dd'T'HH:mm`. */
export function addMinutesToClinicWallDatetimeLocal(
  naive: string,
  minutes: number,
  timezone: string,
): string | null {
  const trimmed = naive.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return null;
  }
  const base = fromLocalISOString(trimmed, { timezone });
  if (!base) {
    return null;
  }
  const shifted = new Date(base.getTime() + minutes * 60_000);
  return utcInstantToClinicWallDatetimeLocal(shifted, timezone);
}

/** Calendar arithmetic on yyyy-MM-dd (UTC date components, midnight-aligned days). */
export function addDaysToPickerIsoDate(dateStr: string, days: number): string {
  const parts = dateStr.split("-").map((x) => parseInt(x, 10));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** UTC instant → clinic-wall naive string for datetime-local style fields. */
export function utcInstantToClinicWallDatetimeLocal(
  instant: Date | string,
  timezone: string,
): string {
  const d = typeof instant === "string" ? new Date(instant) : instant;
  if (Number.isNaN(d.getTime())) return "";
  return formatInTimeZone(d, timezone, "yyyy-MM-dd'T'HH:mm");
}

/** Clinic-wall naive datetime → UTC ISO string for API payloads. */
export function clinicWallDatetimeLocalToUtcIso(
  naive: string,
  timezone: string,
): string | null {
  const trimmed = naive.trim();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)) {
    return null;
  }
  const instant = fromLocalISOString(trimmed, { timezone });
  return instant ? instant.toISOString() : null;
}

/** yyyy-MM-dd (clinic day) + HH:mm slot segment → normalized clinic-wall naive string. */
export function clinicDateAndTimeToWallDatetimeLocal(
  pickerIsoDate: string,
  hhmm: string,
  timezone: string,
): string {
  const instant = fromLocalISOString(`${pickerIsoDate}T${hhmm}`, {
    timezone,
  });
  return instant
    ? formatInTimeZone(instant, timezone, "yyyy-MM-dd'T'HH:mm")
    : "";
}
