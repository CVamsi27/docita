import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { CreateAppointmentInput } from "@workspace/types";
import {
  findAutoPickStartTime,
  type DoctorSchedule,
} from "./auto-pick-start-time-helpers";

interface UseAutoPickStartTimeParams {
  open: boolean | undefined;
  watchedDoctorId: string | undefined;
  doctorSchedules: DoctorSchedule[];
  selectedDate: Date | undefined;
  form: UseFormReturn<CreateAppointmentInput>;
  clinicTimezone: string;
}

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

    const wall = findAutoPickStartTime({ doctorSchedules, clinicTimezone });
    if (!wall) return;
    form.setValue("startTime", wall);
    hasAutoSelectedTimeRef.current = true;
  }, [
    open,
    watchedDoctorId,
    doctorSchedules,
    selectedDate,
    form,
    clinicTimezone,
  ]);
}
