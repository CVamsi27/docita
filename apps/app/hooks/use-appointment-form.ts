import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  addDays,
  addDaysToPickerIsoDate,
  clinicDateAndTimeToWallDatetimeLocal,
  clinicWallDatetimeLocalToUtcIso,
  clinicWallHourMinuteFromUtcInstant,
  DEFAULT_TIMEZONE,
  formatClinicPickerDayIsoFromSelection,
  formatClinicTodayPickerIso,
  formatPickerIsoAsWeekdayUpper,
  utcInstantToClinicWallDatetimeLocal,
} from "@workspace/utils";
import { usePatient, usePatients } from "@/hooks/api/use-patients";
import {
  useDoctors,
  useDoctorSchedules,
  useUnavailableDoctorIdsForDate,
  useDoctorAvailabilitySlots,
} from "@/hooks/api/use-settings";
import { useAppointments, useCreateAppointment } from "@/hooks/api/use-appointments";
import {
  Appointment,
  CreateAppointmentInput,
  createAppointmentBaseSchema,
  Patient,
  refineCreateAppointmentDateTimes,
} from "@workspace/types";
import {
  calendarSlotTimeToLocalIso,
  defaultStartIsoForSelectedCalendarDay,
  slotOccupiedByAppointments,
} from "@/features/appointments/lib/calendar-slot-local-iso";
import { useAppConfig } from "@/lib/app-config-context";
import { useAuth } from "@/lib/auth-context";
import { useClinic } from "@/lib/clinic-context";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

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

function pickerDayDiff(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const fromT = new Date(fy!, fm! - 1, fd!, 12, 0, 0, 0).getTime();
  const toT = new Date(ty!, tm! - 1, td!, 12, 0, 0, 0).getTime();
  return Math.round((toT - fromT) / 86_400_000);
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
    const searchedPatients: Patient[] =
      ((searchedPatientsResponse as { items?: Patient[] }) || {}).items || [];
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
  const clinicTimezone = useMemo(
    () => (clinic?.timezone?.trim() || DEFAULT_TIMEZONE) as string,
    [clinic?.timezone],
  );

  const { mutateAsync: createAppointment, isPending: loading } =
    useCreateAppointment();
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

  const createAppointmentSchema = useMemo(
    () =>
      createAppointmentBaseSchema.superRefine(
        refineCreateAppointmentDateTimes(clinicTimezone),
      ),
    [clinicTimezone],
  );

  const form = useForm<CreateAppointmentInput>({
    resolver: zodResolver(
      createAppointmentSchema,
    ) as Resolver<CreateAppointmentInput>,
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
          queryKey: [
            "doctor-availability-slots",
            formatClinicPickerDayIsoFromSelection(
              selectedDate,
              clinicTimezone,
            ),
            defaultValues.doctorId,
          ],
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
        ? formatClinicPickerDayIsoFromSelection(
            selectedDate,
            clinicTimezone,
          )
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

  const autoAdvanceChainOriginStrRef = useRef<string | null>(null);
  const autoAdvanceChainActiveRef = useRef(false);
  const lastAutoAdvanceFromDayStrRef = useRef<string | null>(null);
  /** When set, startTime was auto-filled for this doctor+day; skip overwriting if user edits time for same context. */
  const startSnapContextRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      autoAdvanceChainOriginStrRef.current = null;
      autoAdvanceChainActiveRef.current = false;
      lastAutoAdvanceFromDayStrRef.current = null;
      startSnapContextRef.current = null;
    }
  }, [open]);

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
      if (!dayName) {
        continue;
      }
      const schedule = doctorSchedules.find(
        (s) => s.dayOfWeek === dayName && s.isActive,
      );
      if (!schedule) {
        continue;
      }

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

  useEffect(() => {
    if (!open || !selectedDate || !watchedDoctorId) return;
    if (!slotsQuerySuccess || slotsQueryError) return;

    const snapKey = `${watchedDoctorId}|${formatClinicPickerDayIsoFromSelection(selectedDate, clinicTimezone)}`;
    const doctorSlots = slots.filter((s) => s.doctorId === watchedDoctorId);
    const availableIsos = doctorSlots
      .filter(
        (s) =>
          s.isAvailable &&
          !slotOccupiedByAppointments(
            selectedDate,
            s.time,
            s.endTime,
            clinicTimezone,
            blockingAppointmentsForSlots,
          ),
      )
      .map((s) =>
        calendarSlotTimeToLocalIso(selectedDate, s.time, clinicTimezone),
      );

    const currentRaw = form.getValues("startTime");
    const currentStr =
      typeof currentRaw === "string"
        ? currentRaw
        : currentRaw instanceof Date
          ? ""
          : "";

    const currentPickIsValid =
      currentStr.length > 0 && availableIsos.includes(currentStr);

    const startTimeState = form.getFieldState("startTime");
    if (
      startTimeState.isDirty &&
      startSnapContextRef.current === snapKey &&
      currentPickIsValid
    ) {
      return;
    }

    const firstAvailable = doctorSlots.find((s) => {
      if (!s.isAvailable) return false;
      return !slotOccupiedByAppointments(
        selectedDate,
        s.time,
        s.endTime,
        clinicTimezone,
        blockingAppointmentsForSlots,
      );
    });

    if (firstAvailable) {
      autoAdvanceChainOriginStrRef.current = null;
      autoAdvanceChainActiveRef.current = false;
      lastAutoAdvanceFromDayStrRef.current = null;

      const nextIso = calendarSlotTimeToLocalIso(
        selectedDate,
        firstAvailable.time,
        clinicTimezone,
      );
      const nextEndIso = calendarSlotTimeToLocalIso(
        selectedDate,
        firstAvailable.endTime,
        clinicTimezone,
      );
      form.setValue("startTime", nextIso, {
        shouldDirty: false,
        shouldValidate: true,
      });
      form.setValue("endTime", nextEndIso, {
        shouldDirty: false,
        shouldValidate: true,
      });
      startSnapContextRef.current = snapKey;
      return;
    }

    const todayStr = formatClinicTodayPickerIso(clinicTimezone);
    const selectedStr = formatClinicPickerDayIsoFromSelection(
      selectedDate,
      clinicTimezone,
    );

    if (!autoAdvanceChainActiveRef.current && onAdjustSchedulingDate) {
      if (selectedStr === todayStr) {
        autoAdvanceChainActiveRef.current = true;
        autoAdvanceChainOriginStrRef.current = todayStr;
      }
    }

    if (
      autoAdvanceChainActiveRef.current &&
      autoAdvanceChainOriginStrRef.current &&
      onAdjustSchedulingDate
    ) {
      const origin = autoAdvanceChainOriginStrRef.current;
      const daysFromOrigin = pickerDayDiff(origin, selectedStr);
      if (daysFromOrigin >= 14) {
        autoAdvanceChainActiveRef.current = false;
        autoAdvanceChainOriginStrRef.current = null;
        lastAutoAdvanceFromDayStrRef.current = null;
      } else {
        if (lastAutoAdvanceFromDayStrRef.current === selectedStr) {
          return;
        }
        lastAutoAdvanceFromDayStrRef.current = selectedStr;
        onAdjustSchedulingDate(addDays(selectedDate, 1));
        return;
      }
    }

    // Slots returned this doctor's day but nothing is bookable (or no rows): never guess schedule open time.
    form.setValue("startTime", "", { shouldDirty: false, shouldValidate: true });
    startSnapContextRef.current = null;
  }, [
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
  ]);

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

  const onSubmit = useCallback(
    async (data: CreateAppointmentInput, onSuccess?: () => void) => {
      try {
        const durationMs = defaultDuration * 60000;

        const startWall =
          typeof data.startTime === "string"
            ? data.startTime.trim()
            : utcInstantToClinicWallDatetimeLocal(data.startTime, clinicTimezone);
        const startUtc = clinicWallDatetimeLocalToUtcIso(
          startWall,
          clinicTimezone,
        );
        const endWallRaw =
          typeof data.endTime === "string" && data.endTime.trim().length > 0
            ? data.endTime.trim()
            : data.endTime instanceof Date
              ? utcInstantToClinicWallDatetimeLocal(data.endTime, clinicTimezone)
              : null;
        const endUtc =
          endWallRaw && endWallRaw.length > 0
            ? clinicWallDatetimeLocalToUtcIso(endWallRaw, clinicTimezone)
            : null;

        if (!startUtc) {
          showUserFacingErrorToast(null, "Enter a valid start time.", "form");
          return;
        }

        const endFinal =
          endUtc ??
          new Date(new Date(startUtc).getTime() + durationMs).toISOString();

        const createdAppointment = await createAppointment({
          ...data,
          startTime: startUtc,
          endTime: endFinal,
        });

        form.reset();
        await onAppointmentAdded(createdAppointment);
        if (onSuccess) {
          await onSuccess();
        }
        toast.success("Appointment scheduled successfully");
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not schedule this appointment. Please try again.",
          "save",
        );
      }
    },
    [
      form,
      onAppointmentAdded,
      createAppointment,
      defaultDuration,
      clinicTimezone,
    ],
  );

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
