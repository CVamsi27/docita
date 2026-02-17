import { parseScheduleTime } from "./date-parsing.js";

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  slotDurationMinutes: number,
): string[] {
  const start = parseScheduleTime(startTime);
  const end = parseScheduleTime(endTime);

  if (!start || !end) return [];

  const slots: string[] = [];
  let currentMinutes = start.hours * 60 + start.minutes;
  const endMinutes = end.hours * 60 + end.minutes;

  while (currentMinutes < endMinutes) {
    const hours = Math.floor(currentMinutes / 60);
    const minutes = currentMinutes % 60;
    slots.push(
      `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
    );
    currentMinutes += slotDurationMinutes;
  }

  return slots;
}

export function formatScheduleTime(
  timeString: string,
  use24Hour: boolean = false,
): string {
  const parsed = parseScheduleTime(timeString);
  if (!parsed) return timeString;

  if (use24Hour) {
    return `${parsed.hours.toString().padStart(2, "0")}:${parsed.minutes.toString().padStart(2, "0")}`;
  }

  const hour12 = parsed.hours % 12 || 12;
  const period = parsed.hours < 12 ? "AM" : "PM";
  return `${hour12}:${parsed.minutes.toString().padStart(2, "0")} ${period}`;
}
