import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { formatClinicPickerDayIsoFromSelection } from "@workspace/utils";
import { queryKeys } from "@workspace/data-access";
import type { CreateAppointmentInput } from "@workspace/types";
import {
  buildDefaultAppointmentValues,
  buildFormResetValues,
} from "./appointment-form-helpers";

interface UseAppointmentFormDefaultsParams {
  form: ReturnType<typeof useForm<CreateAppointmentInput>>;
  selectedDate: Date | undefined;
  open: boolean | undefined;
  clinicTimezone: string;
  startHour: number;
  endHour: number;
  defaultDoctorId: string | undefined;
  preselectedPatientId: string | undefined;
  filteredDoctors: { id: string }[];
  unavailableIds: Set<string>;
  currentUser: { id: string; clinicId: string; role: string } | undefined;
}

export function useAppointmentFormDefaults({
  form,
  selectedDate,
  open,
  clinicTimezone,
  startHour,
  endHour,
  defaultDoctorId,
  preselectedPatientId,
  filteredDoctors,
  unavailableIds,
  currentUser,
}: UseAppointmentFormDefaultsParams) {
  const queryClient = useQueryClient();

  const defaultValues = useMemo(
    () =>
      buildDefaultAppointmentValues({
        selectedDate,
        startHour,
        endHour,
        clinicTimezone,
        defaultDoctorId,
        unavailableIds,
        user: currentUser,
        filteredDoctors,
        preselectedPatientId,
      }),
    [
      preselectedPatientId,
      defaultDoctorId,
      selectedDate,
      currentUser,
      filteredDoctors,
      unavailableIds,
      startHour,
      endHour,
      clinicTimezone,
    ],
  );

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const resetValues = buildFormResetValues(
        open,
        selectedDate,
        defaultValues,
      );
      form.reset(resetValues);
      if (selectedDate && defaultValues.doctorId) {
        void queryClient.invalidateQueries({
          queryKey: queryKeys.doctorAvailabilitySlots.forDay(
            formatClinicPickerDayIsoFromSelection(selectedDate, clinicTimezone),
            defaultValues.doctorId,
          ),
        });
      }
    }
    wasOpenRef.current = Boolean(open);
  }, [open, defaultValues, form, selectedDate, queryClient, clinicTimezone]);

  return { defaultValues };
}
