import { DEFAULT_SLOT_DURATION } from "@workspace/utils";

export const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type DayOfWeek = (typeof DAYS_OF_WEEK)[number];

export interface DaySchedule {
  dayOfWeek: DayOfWeek;
  startTime: string;
  endTime: string;
  slotDuration: number;
  isActive: boolean;
}

export const DEFAULT_DAY_SCHEDULE: Omit<DaySchedule, "dayOfWeek"> = {
  startTime: "09:00",
  endTime: "17:00",
  slotDuration: DEFAULT_SLOT_DURATION,
  isActive: false,
};

export const WEEKEND_DEFAULT: Partial<Omit<DaySchedule, "dayOfWeek">> = {
  isActive: false,
};

export function buildDefaultDaySchedules(): DaySchedule[] {
  return DAYS_OF_WEEK.map((day) => ({
    dayOfWeek: day,
    ...(day === "Saturday" || day === "Sunday"
      ? { ...DEFAULT_DAY_SCHEDULE, ...WEEKEND_DEFAULT }
      : DEFAULT_DAY_SCHEDULE),
  }));
}

export function populateDaySchedulesFromApi(
  schedules:
    | Array<{
        dayOfWeek: string;
        startTime: string;
        endTime: string;
        slotDuration: number;
        isActive: boolean;
      }>
    | undefined,
): DaySchedule[] {
  return DAYS_OF_WEEK.map((day) => {
    const existing = schedules?.find((s) => s.dayOfWeek === day);
    if (existing) {
      return {
        dayOfWeek: day,
        startTime: existing.startTime,
        endTime: existing.endTime,
        slotDuration: existing.slotDuration,
        isActive: existing.isActive,
      };
    }
    return {
      dayOfWeek: day,
      ...(day === "Saturday" || day === "Sunday"
        ? { ...DEFAULT_DAY_SCHEDULE, ...WEEKEND_DEFAULT }
        : DEFAULT_DAY_SCHEDULE),
    };
  });
}
