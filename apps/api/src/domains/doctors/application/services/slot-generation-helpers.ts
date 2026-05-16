/** Pure helper functions for slot generation — no DI, no @Injectable. */
import { fromLocalISOString } from '@workspace/utils';
import { TimeUtils } from '@/common/utils/time.utils';
import type { ClinicWeeklySchedule } from '@workspace/db';

export type DayOfWeek =
  | 'SUNDAY'
  | 'MONDAY'
  | 'TUESDAY'
  | 'WEDNESDAY'
  | 'THURSDAY'
  | 'FRIDAY'
  | 'SATURDAY';

export interface AvailableSlot {
  time: string;
  endTime: string;
  doctorId: string;
  doctorName: string;
  specialization?: string;
  isAvailable: boolean;
}

const DAY_OF_WEEK_MAP: Record<string, DayOfWeek> = {
  Sunday: 'SUNDAY',
  Monday: 'MONDAY',
  Tuesday: 'TUESDAY',
  Wednesday: 'WEDNESDAY',
  Thursday: 'THURSDAY',
  Friday: 'FRIDAY',
  Saturday: 'SATURDAY',
};

export function normalizeCalendarDateInput(date: Date | string): string {
  if (typeof date === 'string') {
    const t = date.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;
    const parsed = new Date(t);
    if (Number.isNaN(parsed.getTime())) {
      const m = t.match(/^(\d{4}-\d{2}-\d{2})/);
      return m?.[1] ?? '1970-01-01';
    }
    return parsed.toISOString().slice(0, 10);
  }
  if (!(date instanceof Date) || Number.isNaN(date.getTime()))
    return '1970-01-01';
  return date.toISOString().slice(0, 10);
}

export function addOneCalendarDay(dateStr: string): string {
  const parts = dateStr.split('-').map((x) => parseInt(x, 10));
  const y = parts[0] ?? 1970;
  const m = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  const next = new Date(Date.UTC(y, m - 1, d));
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString().slice(0, 10);
}

export function getDayOfWeekInClinicZone(
  dateStr: string,
  timezone: string,
): DayOfWeek {
  const anchor = fromLocalISOString(`${dateStr}T12:00`, { timezone });
  if (!anchor) return 'MONDAY';
  const long = new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    timeZone: timezone,
  }).format(anchor);
  return DAY_OF_WEEK_MAP[long] ?? 'MONDAY';
}

export function implicitClinicWeeklyRowsForSlotFallback(
  clinicId: string,
  dayOfWeek: DayOfWeek,
): ClinicWeeklySchedule[] {
  if (dayOfWeek === 'SATURDAY' || dayOfWeek === 'SUNDAY') return [];
  const now = new Date();
  return [
    {
      id: `implicit-clinic-weekly-${clinicId}-${dayOfWeek}`,
      clinicId,
      dayOfWeek: dayOfWeek as ClinicWeeklySchedule['dayOfWeek'],
      startTime: '09:00',
      endTime: '17:00',
      slotDuration: 30,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    },
  ];
}

export function generateSlotsForSchedule(
  schedule: {
    doctorId: string;
    startTime: string;
    endTime: string;
    slotDuration: number;
  },
  doctor: { name: string; specialization: string | null },
  dateStr: string,
  timezone: string,
  timeOffs: Array<{
    isFullDay: boolean;
    startTime: string | null;
    endTime: string | null;
  }>,
  appointments: Array<{ startTime: Date; endTime: Date }>,
): AvailableSlot[] {
  const slots: AvailableSlot[] = [];
  let currentMinutes = TimeUtils.timeToMinutes(schedule.startTime);
  const endMinutes = TimeUtils.timeToMinutes(schedule.endTime);

  while (currentMinutes + schedule.slotDuration <= endMinutes) {
    const slotStart = TimeUtils.minutesToTime(currentMinutes);
    const slotEnd = TimeUtils.minutesToTime(
      currentMinutes + schedule.slotDuration,
    );

    slots.push({
      time: slotStart,
      endTime: slotEnd,
      doctorId: schedule.doctorId,
      doctorName: doctor.name,
      specialization: doctor.specialization || undefined,
      isAvailable:
        !isSlotDuringTimeOff(currentMinutes, timeOffs) &&
        !isSlotBooked(
          currentMinutes,
          schedule.slotDuration,
          dateStr,
          timezone,
          appointments,
        ) &&
        !isSlotInPast(currentMinutes, dateStr, timezone),
    });

    currentMinutes += schedule.slotDuration;
  }

  return slots;
}

export function isSlotDuringTimeOff(
  currentMinutes: number,
  timeOffs: Array<{
    isFullDay: boolean;
    startTime: string | null;
    endTime: string | null;
  }>,
): boolean {
  return timeOffs.some((t) => {
    if (t.isFullDay) return true;
    if (!t.startTime || !t.endTime) return false;
    const offStart = TimeUtils.timeToMinutes(t.startTime);
    const offEnd = TimeUtils.timeToMinutes(t.endTime);
    return currentMinutes >= offStart && currentMinutes < offEnd;
  });
}

export function isSlotBooked(
  currentMinutes: number,
  slotDuration: number,
  dateStr: string,
  timezone: string,
  appointments: Array<{ startTime: Date; endTime: Date }>,
): boolean {
  const slotStartLabel = TimeUtils.minutesToTime(currentMinutes);
  const slotEndLabel = TimeUtils.minutesToTime(currentMinutes + slotDuration);
  const slotStart = fromLocalISOString(`${dateStr}T${slotStartLabel}`, {
    timezone,
  });
  const slotEnd = fromLocalISOString(`${dateStr}T${slotEndLabel}`, {
    timezone,
  });
  if (!slotStart || !slotEnd) return false;
  return appointments.some(
    (a) => slotStart < new Date(a.endTime) && slotEnd > new Date(a.startTime),
  );
}

export function isSlotInPast(
  currentMinutes: number,
  dateStr: string,
  timezone: string,
): boolean {
  const slotStartLabel = TimeUtils.minutesToTime(currentMinutes);
  const slotInstant = fromLocalISOString(`${dateStr}T${slotStartLabel}`, {
    timezone,
  });
  if (!slotInstant) return false;
  return slotInstant.getTime() < Date.now();
}

export function sortSlots(slots: AvailableSlot[]): AvailableSlot[] {
  return slots.sort((a, b) => {
    const timeCompare = a.time.localeCompare(b.time);
    if (timeCompare !== 0) return timeCompare;
    return a.doctorName.localeCompare(b.doctorName);
  });
}
