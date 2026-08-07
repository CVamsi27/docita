export type Daypart = "morning" | "afternoon" | "evening";

/**
 * Maps a local hour (0-23) to the daypart used by the auth hero greeting.
 * Morning runs until 11:59, afternoon from noon to 16:59, evening from 17:00.
 */
export function getDaypartFromHour(hour: number): Daypart {
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
