import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import {
  addDaysToPickerIsoDate,
  clinicDateAndTimeToWallDatetimeLocal,
  clinicWallHourMinuteFromUtcInstant,
  formatClinicTodayPickerIso,
  formatPickerIsoAsWeekdayUpper,
} from "@workspace/utils";
import type { CreateAppointmentInput } from "@workspace/types";

interface DoctorSchedule {
  dayOfWeek: string;
  isActive: boolean;
  startTime: string;
  endTime: string;
}

interface UseAutoPickStartTimeParams {
  open: boolean | undefined;
  watchedDoctorId: string | undefined;
  doctorSchedules: DoctorSchedule[];
  selectedDate: Date | undefined;
  form: UseFormReturn<CreateAppointmentInput>;
  clinicTimezone: string;
}

/**
 * Auto-select the first available start time for the picked doctor when no
 * calendar day is selected (e.g. quick-add flow). Walks the doctor's weekly
 * schedule starting today, snapping to the next half-hour slot.
 */
export function useAutoPickStartTime({
  open,
  watchedDoctorId,
  doctorSchedules,
  selectedDate,
  form,
  clinicTimezone,
}: UseAutoPickStartTimeParams): void {
  const hasAutoSelectedTimeRef = useRef(false);

  useEffect(() => {
    if (!open) {
      hasAutoSelectedTimeRef.current = false;
      return;
    }
    if (hasAutoSelectedTimeRef.current || selectedDate) return;
    if (!watchedDoctorId || doctorSchedules.length === 0) return;

    const todayStr = formatClinicTodayPickerIso(clinicTimezone);

    for (let attempt = 0; attempt < 7; attempt++) {
      const dayStr = addDaysToPickerIsoDate(todayStr, attempt);
      const dayName = formatPickerIsoAsWeekdayUpper(dayStr, clinicTimezone);
      if (!dayName) continue;

      const schedule = doctorSchedules.find(
        (s) => s.dayOfWeek === dayName && s.isActive,
      );
      if (!schedule) continue;

      const scheduleStartHour = parseInt(
        schedule.startTime.split(":")[0] ?? "9",
        10,
      );
      const scheduleEndHour = parseInt(
        schedule.endTime.split(":")[0] ?? "18",
        10,
      );

      const now = new Date();
      const { hour: nowH, minute: nowM } = clinicWallHourMinuteFromUtcInstant(
        now,
        clinicTimezone,
      );
      let totalMin = nowH * 60 + nowM;
      const openMin = scheduleStartHour * 60;
      const closeMin = scheduleEndHour * 60;

      if (attempt === 0) {
        if (totalMin < openMin) {
          totalMin = openMin;
        } else if (totalMin >= closeMin) {
          continue;
        } else {
          const remainder = 30 - (totalMin % 30);
          totalMin += remainder === 30 ? 30 : remainder;
          if (totalMin >= closeMin) {
            totalMin = Math.max(openMin, closeMin - 30);
          }
        }
      } else {
        totalMin = openMin;
      }

      const h = Math.floor(totalMin / 60);
      const m = totalMin % 60;
      const hhmm = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const wall = clinicDateAndTimeToWallDatetimeLocal(
        dayStr,
        hhmm,
        clinicTimezone,
      );
      if (wall) {
        form.setValue("startTime", wall);
        hasAutoSelectedTimeRef.current = true;
        return;
      }
    }
  }, [
    open,
    watchedDoctorId,
    doctorSchedules,
    selectedDate,
    form,
    clinicTimezone,
  ]);
}
