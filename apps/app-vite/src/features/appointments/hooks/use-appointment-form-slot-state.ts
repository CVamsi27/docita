import { useMemo } from "react";
import {
  useAppointments,
  useDoctorAvailabilitySlots,
} from "@workspace/data-access";
import {
  computeAvailabilitySlotsReady,
  computeBlockingSlotsFromAppointments,
  computeDateKey,
  computeIsResolvingDefaultSlot,
} from "./appointment-form-helpers";

interface UseAppointmentFormSlotStateParams {
  open: boolean | undefined;
  selectedDate: Date | undefined;
  watchedDoctorId: string | undefined;
  clinicTimezone: string;
}

export function useAppointmentFormSlotState({
  open,
  selectedDate,
  watchedDoctorId,
  clinicTimezone,
}: UseAppointmentFormSlotStateParams) {
  const selectedDateKey = useMemo(
    () => computeDateKey(selectedDate, clinicTimezone),
    [selectedDate, clinicTimezone],
  );

  const { data: dayAppointmentsResponse } = useAppointments(
    open && selectedDateKey && watchedDoctorId
      ? {
          date: selectedDateKey,
          doctorId: watchedDoctorId,
          limit: 200,
        }
      : null,
  );

  const blockingAppointmentsForSlots = useMemo(
    () =>
      computeBlockingSlotsFromAppointments(dayAppointmentsResponse?.items),
    [dayAppointmentsResponse?.items],
  );

  const {
    data: slots = [],
    isSuccess: slotsQuerySuccess,
    isError: slotsQueryError,
  } = useDoctorAvailabilitySlots(selectedDate, watchedDoctorId, {
    enabled: Boolean(open && selectedDate && watchedDoctorId),
  });

  const availabilitySlotsReady = computeAvailabilitySlotsReady(
    open,
    selectedDate,
    watchedDoctorId,
    slotsQuerySuccess,
    slotsQueryError,
  );

  const isResolvingDefaultSlot = computeIsResolvingDefaultSlot(
    open,
    selectedDate,
    watchedDoctorId,
    slotsQueryError,
    slotsQuerySuccess,
  );

  return {
    selectedDateKey,
    blockingAppointmentsForSlots,
    slots,
    availabilitySlotsReady,
    isResolvingDefaultSlot,
    slotsQuerySuccess,
    slotsQueryError,
  };
}
