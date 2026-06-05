import { useEffect, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { CreateAppointmentInput } from "@workspace/types";
import {
  useDoctors,
  useDoctorSchedules,
  useUnavailableDoctorIdsForDate,
} from "@workspace/data-access";
import {
  computeFilteredDoctors,
  findNextAvailableDoctor,
  toUnavailableIdSet,
} from "./appointment-form-helpers";

interface UseAppointmentFormDoctorStateParams {
  selectedDate: Date | undefined;
  open: boolean | undefined;
  watchedDoctorId: string | undefined;
  form: UseFormReturn<CreateAppointmentInput>;
}

export function useAppointmentFormDoctorState({
  selectedDate,
  open,
  watchedDoctorId,
  form,
}: UseAppointmentFormDoctorStateParams) {
  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors();

  const { data: unavailableResponse } = useUnavailableDoctorIdsForDate(
    selectedDate,
    { enabled: Boolean(open && selectedDate) },
  );

  const unavailableIds = useMemo(
    () => toUnavailableIdSet(unavailableResponse?.doctorIds),
    [unavailableResponse?.doctorIds],
  );

  const filteredDoctors = useMemo(
    () => computeFilteredDoctors(doctors, unavailableIds),
    [doctors, unavailableIds],
  );

  const { data: doctorSchedules = [] } = useDoctorSchedules(
    watchedDoctorId || undefined,
  );

  useEffect(() => {
    if (!open || !selectedDate) return;
    const currentId = form.getValues("doctorId");
    const nextId = findNextAvailableDoctor(
      currentId,
      unavailableIds,
      filteredDoctors,
    );
    if (nextId !== currentId) {
      form.setValue("doctorId", nextId, { shouldDirty: false });
    }
  }, [open, selectedDate, unavailableIds, filteredDoctors, form]);

  return {
    filteredDoctors,
    doctorsLoading,
    unavailableIds,
    doctorSchedules,
  };
}
