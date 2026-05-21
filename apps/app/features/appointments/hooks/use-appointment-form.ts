import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import {
  DEFAULT_TIMEZONE,
  formatClinicPickerDayIsoFromSelection,
  formatClinicTodayPickerIso,
} from "@workspace/utils";
import { queryKeys, usePatient, usePatients } from "@workspace/data-access";
import {
  useDoctors,
  useDoctorSchedules,
  useUnavailableDoctorIdsForDate,
  useDoctorAvailabilitySlots,
} from "@workspace/data-access";
import { useAppointments } from "@workspace/data-access";
import { Appointment, CreateAppointmentInput, Patient } from "@workspace/types";
import { createAppointmentFormResolver } from "@/features/appointments/lib/appointment-form-resolver.boundary";
import { defaultStartIsoForSelectedCalendarDay } from "@/features/appointments/lib/calendar-slot-local-iso";
import { useAppConfig } from "@/lib/contexts/app-config-context";
import { useAuth } from "@/lib/auth/auth-context";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useAutoPickStartTime } from "./use-auto-pick-start-time";
import { useSnapStartTimeToSlot } from "./use-snap-start-time-to-slot";
import { useCreateAppointmentSubmit } from "./use-create-appointment-submit";

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

  const patients = useMemo(() => {
    const searchedPatients: Patient[] = searchedPatientsResponse?.items ?? [];
    if (preselectedPatient && preselectedPatientId) {
      const hasPreselected = searchedPatients.some(
        (p) => p.id === preselectedPatientId,
      );
      if (!hasPreselected) {
        return [preselectedPatient, ...searchedPatients];
      }
    }
    return searchedPatients;
  }, [searchedPatientsResponse, preselectedPatient, preselectedPatientId]);

  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors();

  const { data: unavailableResponse } = useUnavailableDoctorIdsForDate(
    selectedDate,
    { enabled: Boolean(open && selectedDate) },
  );

  const unavailableIds = useMemo(
    () => new Set(unavailableResponse?.doctorIds ?? []),
    [unavailableResponse?.doctorIds],
  );

  const filteredDoctors = useMemo(
    () => doctors.filter((d) => !unavailableIds.has(d.id)),
    [doctors, unavailableIds],
  );

  const queryClient = useQueryClient();
  const { clinic } = useClinic();
  const clinicTimezone = useMemo(() => {
    const trimmed = clinic?.timezone?.trim();
    return trimmed || DEFAULT_TIMEZONE;
  }, [clinic?.timezone]);

  const { config } = useAppConfig();
  const { user } = useAuth();
  const defaultDuration = config.defaults.appointmentDuration;

  const defaultValues = useMemo(() => {
    let defaultStart = "";

    if (selectedDate) {
      defaultStart = defaultStartIsoForSelectedCalendarDay(
        selectedDate,
        startHour,
        endHour,
        clinicTimezone,
      );
    } else {
      const todayStr = formatClinicTodayPickerIso(clinicTimezone);
      defaultStart = defaultStartIsoForSelectedCalendarDay(
        todayStr,
        startHour,
        endHour,
        clinicTimezone,
      );
    }

    let resolvedDoctorId = "";
    if (defaultDoctorId && !unavailableIds.has(defaultDoctorId)) {
      resolvedDoctorId = defaultDoctorId;
    } else if (user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR") {
      resolvedDoctorId = user.id && !unavailableIds.has(user.id) ? user.id : "";
    } else if (filteredDoctors.length > 0) {
      resolvedDoctorId = filteredDoctors[0]?.id || "";
    }

    return {
      patientId: preselectedPatientId || "",
      doctorId: resolvedDoctorId,
      clinicId: user?.clinicId || "",
      startTime: defaultStart,
      endTime: "",
      status: "scheduled" as const,
      type: "consultation" as const,
      notes: "",
    };
  }, [
    preselectedPatientId,
    defaultDoctorId,
    selectedDate,
    user?.id,
    user?.clinicId,
    user?.role,
    filteredDoctors,
    unavailableIds,
    startHour,
    endHour,
    clinicTimezone,
  ]);

  const form = useForm<CreateAppointmentInput>({
    resolver: createAppointmentFormResolver(clinicTimezone),
    defaultValues,
  });

  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (open && !wasOpenRef.current) {
      const resetValues =
        selectedDate != null
          ? { ...defaultValues, startTime: "", endTime: "" }
          : defaultValues;
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
    () =>
      selectedDate
        ? formatClinicPickerDayIsoFromSelection(selectedDate, clinicTimezone)
        : undefined,
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

  const blockingAppointmentsForSlots = useMemo(() => {
    const items = dayAppointmentsResponse?.items ?? [];
    return items.map((a) => ({
      startTime: a.startTime,
      endTime: a.endTime,
      status: a.status,
    }));
  }, [dayAppointmentsResponse?.items]);

  const {
    data: slots = [],
    isSuccess: slotsQuerySuccess,
    isError: slotsQueryError,
  } = useDoctorAvailabilitySlots(selectedDate, watchedDoctorId, {
    enabled: Boolean(open && selectedDate && watchedDoctorId),
  });

  const availabilitySlotsReady = Boolean(
    open &&
    selectedDate &&
    watchedDoctorId &&
    slotsQuerySuccess &&
    !slotsQueryError,
  );

  /** Only block editing until the first successful slots fetch — not during background refetch. */
  const isResolvingDefaultSlot = Boolean(
    open &&
    selectedDate &&
    watchedDoctorId &&
    !slotsQueryError &&
    !slotsQuerySuccess,
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
    if (!currentId || !unavailableIds.has(currentId)) return;
    const nextId = filteredDoctors[0]?.id ?? "";
    form.setValue("doctorId", nextId, { shouldDirty: false });
  }, [open, selectedDate, unavailableIds, filteredDoctors, form]);

  const lastPreselectedPatientIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (!open) return;
    if (preselectedPatientId === lastPreselectedPatientIdRef.current) return;
    lastPreselectedPatientIdRef.current = preselectedPatientId;
    if (!preselectedPatientId) return;

    const patientState = form.getFieldState("patientId");
    if (!patientState.isDirty) {
      form.setValue("patientId", preselectedPatientId, { shouldDirty: false });
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
