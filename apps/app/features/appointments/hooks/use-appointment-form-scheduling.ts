import { useAutoPickStartTime } from "./use-auto-pick-start-time";
import type { DoctorSchedule } from "./auto-pick-start-time-helpers";
import { useSnapStartTimeToSlot } from "./use-snap-start-time-to-slot";
import { useAppointmentFormSlotState } from "./use-appointment-form-slot-state";
import type { UseFormReturn } from "react-hook-form";
import type { CreateAppointmentInput } from "@workspace/types";

interface UseAppointmentFormSchedulingParams {
  open: boolean | undefined;
  selectedDate: Date | undefined;
  watchedDoctorId: string | undefined;
  clinicTimezone: string;
  doctorSchedules: DoctorSchedule[];
  form: UseFormReturn<CreateAppointmentInput>;
  onAdjustSchedulingDate?: (next: Date) => void;
}

export function useAppointmentFormScheduling({
  open,
  selectedDate,
  watchedDoctorId,
  clinicTimezone,
  doctorSchedules,
  form,
  onAdjustSchedulingDate,
}: UseAppointmentFormSchedulingParams) {
  const {
    blockingAppointmentsForSlots,
    slots,
    availabilitySlotsReady,
    isResolvingDefaultSlot,
    slotsQuerySuccess,
    slotsQueryError,
  } = useAppointmentFormSlotState({
    open,
    selectedDate,
    watchedDoctorId,
    clinicTimezone,
  });

  useAutoPickStartTime({
    open,
    watchedDoctorId,
    doctorSchedules,
    selectedDate,
    form,
    clinicTimezone,
  });

  useSnapStartTimeToSlot({
    open,
    selectedDate,
    watchedDoctorId,
    slots,
    slotsQuerySuccess,
    slotsQueryError,
    clinicTimezone,
    blockingAppointmentsForSlots,
    form,
    onAdjustSchedulingDate,
  });

  return {
    blockingAppointmentsForSlots,
    slots,
    availabilitySlotsReady,
    isResolvingDefaultSlot,
  };
}
