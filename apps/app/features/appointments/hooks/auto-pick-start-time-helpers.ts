import {
  addDaysToPickerIsoDate,
  clinicDateAndTimeToWallDatetimeLocal,
  clinicWallHourMinuteFromUtcInstant,
  formatClinicTodayPickerIso,
  formatPickerIsoAsWeekdayUpper,
} from "@workspace/utils";

export interface DoctorSchedule {
  dayOfWeek: string;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

export function findAutoPickStartTime(params: {
  doctorSchedules: DoctorSchedule[];
  clinicTimezone: string;
}): string | null {
  const todayStr = formatClinicTodayPickerIso(params.clinicTimezone);
  for (let attempt = 0; attempt < 7; attempt++) {
    const wall = resolveAttemptWallTime({
      attempt,
      todayStr,
      doctorSchedules: params.doctorSchedules,
      clinicTimezone: params.clinicTimezone,
    });
    if (wall) return wall;
  }
  return null;
}

function resolveAttemptWallTime(params: {
  attempt: number;
  todayStr: string;
  doctorSchedules: DoctorSchedule[];
  clinicTimezone: string;
}): string | null {
  const dayStr = addDaysToPickerIsoDate(params.todayStr, params.attempt);
  const dayName = formatPickerIsoAsWeekdayUpper(dayStr, params.clinicTimezone);
  if (!dayName) return null;
  const schedule = params.doctorSchedules.find(
    (item) => item.dayOfWeek === dayName && item.isActive,
  );
  if (!schedule) return null;
  const totalMin = resolveStartMinute(
    schedule,
    params.attempt,
    params.clinicTimezone,
  );
  if (totalMin === null) return null;
  return clinicDateAndTimeToWallDatetimeLocal(
    dayStr,
    formatHourMinute(totalMin),
    params.clinicTimezone,
  );
}

function resolveStartMinute(
  schedule: DoctorSchedule,
  attempt: number,
  clinicTimezone: string,
): number | null {
  const openMin = readScheduleHour(schedule.startTime, 9) * 60;
  const closeMin = readScheduleHour(schedule.endTime, 18) * 60;
  if (attempt > 0) return openMin;
  return resolveTodayStartMinute(openMin, closeMin, clinicTimezone);
}

function resolveTodayStartMinute(
  openMin: number,
  closeMin: number,
  clinicTimezone: string,
): number | null {
  const { hour, minute } = clinicWallHourMinuteFromUtcInstant(
    new Date(),
    clinicTimezone,
  );
  const currentMin = hour * 60 + minute;
  if (currentMin < openMin) return openMin;
  if (currentMin >= closeMin) return null;
  const roundedMin = currentMin + nextHalfHourRemainder(currentMin);
  return roundedMin >= closeMin ? Math.max(openMin, closeMin - 30) : roundedMin;
}

function nextHalfHourRemainder(totalMin: number): number {
  const remainder = 30 - (totalMin % 30);
  return remainder === 30 ? 30 : remainder;
}

function readScheduleHour(value: string, fallback: number): number {
  return parseInt(value.split(":")[0] ?? String(fallback), 10);
}

function formatHourMinute(totalMin: number): string {
  const hour = Math.floor(totalMin / 60);
  const minute = totalMin % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
