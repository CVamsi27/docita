/**
 * Calendar yyyy-MM-dd in the user's local timezone.
 * Matches `/appointments?date=` UX elsewhere (e.g. today's calendar strip).
 */
export function getLocalCalendarDateString(date: Date = new Date()): string {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().split("T")[0] ?? "";
}
