import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  formatClinicPickerDayIsoFromSelection,
} from "@workspace/utils";
import { queryKeys, usePatient, usePatients } from "@workspace/data-access";
import {
  useDoctors,
  useDoctorSchedules,
  useUnavailableDoctorIdsForDate,
  useDoctorAvailabilitySlots,
} from "@workspace/data-access";
import { useAppointments } from "@workspace/data-access";
import { Appointment, CreateAppointmentInput } from "@workspace/types";
import { createAppointmentFormResolver } from "@/features/appointments/lib/appointment-form-resolver.boundary";
import { useAppConfig } from "@/lib/contexts/app-config-context";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useAutoPickStartTime } from "./use-auto-pick-start-time";
import { useSnapStartTimeToSlot } from "./use-snap-start-time-to-slot";
import { useCreateAppointmentSubmit } from "./use-create-appointment-submit";
import {
  mergePatientsWithPreselected,
  getClinicTimezoneOrDefault,
  computeFilteredDoctors,
  buildDefaultAppointmentValues,
  computeBlockingSlotsFromAppointments,
  computeDateKey,
  toUnavailableIdSet,
  buildFormResetValues,
  findNextAvailableDoctor,
  computeAvailabilitySlotsReady,
  computeIsResolvingDefaultSlot,
  shouldUpdatePreselectedPatient,
  buildCurrentUserForAppointment,
} from "./appointment-form-helpers";

interface UseAppointmentFormProps {
  onAppointmentAdded: (appointment: Appointment) => void | Promise<void>;
  selectedDate?: Date;
  /** Move appointments page calendar when the picked day has no bookable slots (e.g. advance from today). */
  onAdjustSchedulingDate?: (next: Date) => void;
  preselectedPatientId?: string;
  defaultDoctorId?: string;
  startHour?: number;
  endHour?: number;
  open?: boolean;
}

export function useAppointmentForm({
  onAppointmentAdded,
  selectedDate,
  onAdjustSchedulingDate,
  preselectedPatientId,
  defaultDoctorId,
  startHour = 9,
  endHour = 17,
  open,
}: UseAppointmentFormProps) {
  const [patientSearch, setPatientSearch] = useState("");
  const { data: searchedPatientsResponse, isLoading: patientsLoading } =
    usePatients({
      search: patientSearch || undefined,
      limit: patientSearch ? 20 : 10,
    });

  const { data: preselectedPatient } = usePatient(preselectedPatientId || "");

  const patients = useMemo(
    () =>
      mergePatientsWithPreselected(
        searchedPatientsResponse?.items ?? [],
        preselectedPatient,
        preselectedPatientId,
      ),
    [searchedPatientsResponse, preselectedPatient, preselectedPatientId],
  );

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

  const queryClient = useQueryClient();
  const { clinic } = useClinic();

  const clinicTimezone = useMemo(
    () => getClinicTimezoneOrDefault(clinic),
    [clinic],
  );

  const { config } = useAppConfig();
  const { user } = useAuth();
  const defaultDuration = config.defaults.appointmentDuration;

  const currentUser = buildCurrentUserForAppointment(user);

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

  const form = useForm<CreateAppointmentInput>({
    resolver: createAppointmentFormResolver(clinicTimezone),
    defaultValues,
  });

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const resetValues = buildFormResetValues(open, selectedDate, defaultValues);
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

  const watchedDoctorId = form.watch("doctorId");
  const { data: doctorSchedules = [] } = useDoctorSchedules(
    watchedDoctorId || undefined,
  );

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
      computeBlockingSlotsFromAppointments(
        dayAppointmentsResponse?.items,
      ),
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

  useEffect(() => {
    if (!open || !selectedDate) return;
    const currentId = form.getValues("doctorId");
    const nextId = findNextAvailableDoctor(currentId, unavailableIds, filteredDoctors);
    if (nextId !== currentId) {
      form.setValue("doctorId", nextId, { shouldDirty: false });
    }
  }, [open, selectedDate, unavailableIds, filteredDoctors, form]);

  const lastPreselectedPatientIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    const patientState = form.getFieldState("patientId");
    if (
      shouldUpdatePreselectedPatient(
        open,
        preselectedPatientId,
        lastPreselectedPatientIdRef.current,
        patientState.isDirty,
      )
    ) {
      lastPreselectedPatientIdRef.current = preselectedPatientId;
      if (preselectedPatientId) {
        form.setValue("patientId", preselectedPatientId, { shouldDirty: false });
      }
    }
  }, [open, preselectedPatientId, form]);

  const { onSubmit, loading } = useCreateAppointmentSubmit({
    form,
    defaultDuration,
    clinicTimezone,
    onAppointmentAdded,
  });

  return {
    form,
    loading,
    isResolvingDefaultSlot,
    availabilitySlotsReady,
    availabilitySlots: slots,
    clinicTimezone,
    blockingAppointmentsForSlots,
    patients,
    patientsLoading,
    patientSearch,
    setPatientSearch,
    doctors: filteredDoctors,
    doctorsLoading,
    onSubmit,
  };
}
