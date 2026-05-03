import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePatient, usePatients } from "@/hooks/api/use-patients";
import {
  useDoctors,
  useDoctorSchedules,
  useUnavailableDoctorIdsForDate,
  useDoctorAvailabilitySlots,
} from "@/hooks/api/use-settings";
import { useCreateAppointment } from "@/hooks/api/use-appointments";
import {
  Appointment,
  CreateAppointmentInput,
  createAppointmentSchema,
  Patient,
} from "@workspace/types";
import {
  addDays,
  DEFAULT_TIMEZONE,
  formatPickerIsoDate,
  toLocalISOString,
} from "@workspace/utils";
import { useAppConfig } from "@/lib/app-config-context";
import { useAuth } from "@/lib/auth-context";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

interface UseAppointmentFormProps {
  onAppointmentAdded: (appointment: Appointment) => void | Promise<void>;
  selectedDate?: Date;
  /** Move appointments page calendar when the picked day has no bookable slots (e.g. advance from today). */
  onAdjustSchedulingDate?: (next: Date) => void;
  preselectedPatientId?: string;
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

function mergeCalendarDateWithScheduleStart(
  selectedDate: Date,
  doctorSchedules: Array<{ dayOfWeek: string; startTime: string; isActive: boolean }>,
  fallbackHour: number,
): string {
  const days = [
    "SUNDAY",
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ] as const;
  const dayName = days[selectedDate.getDay()];
  const schedule = doctorSchedules.find(
    (s) => s.dayOfWeek === dayName && s.isActive,
  );
  const hourMinute = schedule?.startTime.split(":").map(Number) ?? [
    fallbackHour,
    0,
  ];
  const h = hourMinute[0] ?? fallbackHour;
  const m = hourMinute[1] ?? 0;
  const d = new Date(selectedDate);
  d.setHours(h, m, 0, 0);
  return toLocalISOString(d, { timezone: DEFAULT_TIMEZONE });
}

export function useAppointmentForm({
  onAppointmentAdded,
  selectedDate,
  onAdjustSchedulingDate,
  preselectedPatientId,
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

  const { mutateAsync: createAppointment, isPending: loading } =
    useCreateAppointment();
  const { config } = useAppConfig();
  const { user } = useAuth();

  const defaultDuration = config.defaults.appointmentDuration;

  const defaultValues = useMemo(() => {
    let defaultStart = "";

    if (selectedDate) {
      const interim = new Date(selectedDate);
      interim.setHours(startHour, 0, 0, 0);
      defaultStart = toLocalISOString(interim, {
        timezone: DEFAULT_TIMEZONE,
      });
    } else {
      const now = new Date();

      if (now.getHours() < startHour) {
        now.setHours(startHour, 0, 0, 0);
      } else if (now.getHours() >= endHour) {
        now.setDate(now.getDate() + 1);
        now.setHours(startHour, 0, 0, 0);
      } else {
        const remainder = 30 - (now.getMinutes() % 30);
        if (remainder === 0) {
          now.setMinutes(now.getMinutes() + 30);
        } else {
          now.setMinutes(now.getMinutes() + remainder);
        }
        now.setSeconds(0);
        now.setMilliseconds(0);

        if (now.getHours() >= endHour) {
          now.setDate(now.getDate() + 1);
          now.setHours(startHour, 0, 0, 0);
        }
      }

      const offsetMs = now.getTimezoneOffset() * 60 * 1000;
      const localDate = new Date(now.getTime() - offsetMs);
      defaultStart = localDate.toISOString().slice(0, 16);
    }

    let defaultDoctorId = "";
    if (user?.role === "DOCTOR" || user?.role === "ADMIN_DOCTOR") {
      defaultDoctorId =
        user.id && !unavailableIds.has(user.id) ? user.id : "";
    } else if (filteredDoctors.length > 0) {
      defaultDoctorId = filteredDoctors[0]?.id || "";
    }

    return {
      patientId: preselectedPatientId || "",
      doctorId: defaultDoctorId,
      clinicId: user?.clinicId || "",
      startTime: defaultStart,
      endTime: "",
      status: "scheduled" as const,
      type: "consultation" as const,
      notes: "",
    };
  }, [
    preselectedPatientId,
    selectedDate,
    user?.id,
    user?.clinicId,
    user?.role,
    filteredDoctors,
    unavailableIds,
    startHour,
    endHour,
  ]);

  const form = useForm<CreateAppointmentInput>({
    resolver: zodResolver(
      createAppointmentSchema,
    ) as Resolver<CreateAppointmentInput>,
    defaultValues,
  });

  const watchedDoctorId = form.watch("doctorId");
  const { data: doctorSchedules = [] } = useDoctorSchedules(
    watchedDoctorId || undefined,
  );

  const {
    data: slots = [],
    isFetching: slotsFetching,
    isSuccess: slotsQuerySuccess,
  } = useDoctorAvailabilitySlots(selectedDate, watchedDoctorId, {
    enabled: Boolean(open && selectedDate && watchedDoctorId),
  });

  const autoAdvanceChainOriginStrRef = useRef<string | null>(null);
  const autoAdvanceChainActiveRef = useRef(false);
  const lastAutoAdvanceFromDayStrRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      autoAdvanceChainOriginStrRef.current = null;
      autoAdvanceChainActiveRef.current = false;
      lastAutoAdvanceFromDayStrRef.current = null;
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

    const days = [
      "SUNDAY",
      "MONDAY",
      "TUESDAY",
      "WEDNESDAY",
      "THURSDAY",
      "FRIDAY",
      "SATURDAY",
    ];

    const tryDate = new Date();
    for (let attempt = 0; attempt < 7; attempt++) {
      const dayName = days[tryDate.getDay()];
      const schedule = doctorSchedules.find(
        (s) => s.dayOfWeek === dayName && s.isActive,
      );
      if (schedule) {
        const scheduleStartHour = parseInt(
          schedule.startTime.split(":")[0] ?? "9",
          10,
        );
        const scheduleEndHour = parseInt(
          schedule.endTime.split(":")[0] ?? "18",
          10,
        );
        const now = new Date();
        const candidate = new Date(tryDate);
        if (
          attempt === 0 &&
          now.getHours() >= scheduleStartHour &&
          now.getHours() < scheduleEndHour
        ) {
          const remainder = 30 - (now.getMinutes() % 30);
          candidate.setHours(
            now.getHours(),
            now.getMinutes() + (remainder === 30 ? 0 : remainder),
            0,
            0,
          );
          if (candidate.getHours() < scheduleEndHour) {
            const offsetMs = candidate.getTimezoneOffset() * 60 * 1000;
            const localDate = new Date(candidate.getTime() - offsetMs);
            form.setValue("startTime", localDate.toISOString().slice(0, 16));
            hasAutoSelectedTimeRef.current = true;
            return;
          }
        } else if (attempt > 0 || now.getHours() < scheduleStartHour) {
          candidate.setHours(scheduleStartHour, 0, 0, 0);
          const offsetMs = candidate.getTimezoneOffset() * 60 * 1000;
          const localDate = new Date(candidate.getTime() - offsetMs);
          form.setValue("startTime", localDate.toISOString().slice(0, 16));
          hasAutoSelectedTimeRef.current = true;
          return;
        }
      }
      tryDate.setDate(tryDate.getDate() + 1);
    }
  }, [open, watchedDoctorId, doctorSchedules, selectedDate, form]);

  useEffect(() => {
    if (!open || !selectedDate || !watchedDoctorId) return;
    if (!slotsQuerySuccess || slotsFetching) return;

    const startTimeState = form.getFieldState("startTime");
    if (startTimeState.isDirty) return;

    const firstAvailable = slots.find(
      (s) => s.doctorId === watchedDoctorId && s.isAvailable,
    );

    if (firstAvailable) {
      autoAdvanceChainOriginStrRef.current = null;
      autoAdvanceChainActiveRef.current = false;
      lastAutoAdvanceFromDayStrRef.current = null;

      const parts = firstAvailable.time.split(":").map((x) => parseInt(x, 10));
      const h = parts[0] ?? startHour;
      const mi = parts[1] ?? 0;
      const d = new Date(selectedDate);
      d.setHours(h, mi, 0, 0);
      form.setValue(
        "startTime",
        toLocalISOString(d, { timezone: DEFAULT_TIMEZONE }),
        { shouldDirty: false },
      );
      return;
    }

    const todayStr = formatPickerIsoDate(new Date());
    const selectedStr = formatPickerIsoDate(selectedDate);

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

    const fallback = mergeCalendarDateWithScheduleStart(
      selectedDate,
      doctorSchedules,
      startHour,
    );
    if (fallback) {
      form.setValue("startTime", fallback, { shouldDirty: false });
    }
  }, [
    open,
    selectedDate,
    watchedDoctorId,
    slots,
    slotsQuerySuccess,
    slotsFetching,
    doctorSchedules,
    startHour,
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

        const createdAppointment = await createAppointment({
          ...data,
          startTime: new Date(data.startTime).toISOString(),
          endTime: new Date(
            data.endTime ||
              new Date(new Date(data.startTime).getTime() + durationMs),
          ).toISOString(),
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
    [form, onAppointmentAdded, createAppointment, defaultDuration],
  );

  return {
    form,
    loading,
    patients,
    patientsLoading,
    patientSearch,
    setPatientSearch,
    doctors: filteredDoctors,
    doctorsLoading,
    onSubmit,
  };
}
