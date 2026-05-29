import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  DEFAULT_TIMEZONE,
  endOfMonth,
  formatClinicHalfHourSlotKey,
  formatClinicPickerDayIsoFromSelection,
  formatClinicTodayPickerIso,
  formatUtcInstantAsClinicPickerIso,
  pickerIsoToLocalDate,
  startOfMonth,
  subDays,
} from "@workspace/utils";
import { useDoctors, useUnavailableDoctorIdsForDate } from "@workspace/data-access";
import {
  type AppointmentListItem,
  useAppointments,
} from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { useDebounce } from "@workspace/hooks/use-debounce";
import {
  isClinicWideAppointmentRole,
  resolveDoctorScopedAppointmentFilter,
  VISIBLE_APPOINTMENT_STATUS_QUERY,
} from "@workspace/types";
import { useAppointmentRowActions } from "@/features/appointments/hooks/use-appointment-row-actions";
import { useAppointmentActions } from "@/features/appointments/hooks/use-appointment-actions";
import { useAppointmentsDialogUrlSync } from "@/features/appointments/hooks/use-appointments-dialog-url-sync";
import { useClinic } from "@/lib/contexts/clinic-context";

export const generateTimeSlots = () => {
  const slots = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const timeStr = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
      slots.push(timeStr);
    }
  }
  return slots;
};

export const TIME_SLOTS = generateTimeSlots();

export const useAppointmentsLogic = () => {
  const [selectedPickerIso, setSelectedPickerIso] = useState(() =>
    formatClinicTodayPickerIso(DEFAULT_TIMEZONE),
  );
  const [calendarMonth, setCalendarMonth] = useState<Date>(() =>
    startOfMonth(
      pickerIsoToLocalDate(formatClinicTodayPickerIso(DEFAULT_TIMEZONE)),
    ),
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(
    undefined,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { user } = useAuth();
  const { clinic, clinicId: contextClinicId } = useClinic();
  const resolvedClinicId =
    clinic?.id ?? contextClinicId ?? user?.clinicId ?? undefined;
  const clinicReady = Boolean(resolvedClinicId);
  const clinicTz = useMemo(
    () => clinic?.timezone?.trim() || DEFAULT_TIMEZONE,
    [clinic?.timezone],
  );
  const currentTimeSlotRef = useRef<HTMLDivElement>(null);
  const syncedClinicTzRef = useRef<string | null>(null);
  const userPickedDateRef = useRef(false);

  const date = useMemo(
    () => pickerIsoToLocalDate(selectedPickerIso),
    [selectedPickerIso],
  );

  useEffect(() => {
    if (!clinic?.timezone || syncedClinicTzRef.current === clinicTz) {
      return;
    }
    syncedClinicTzRef.current = clinicTz;
    if (userPickedDateRef.current) {
      return;
    }
    const todayIso = formatClinicTodayPickerIso(clinicTz);
    setSelectedPickerIso(todayIso);
    setCalendarMonth(startOfMonth(pickerIsoToLocalDate(todayIso)));
  }, [clinic?.timezone, clinicTz]);

  const handleDateSelect = useCallback(
    (next: Date | undefined) => {
      userPickedDateRef.current = true;
      const pickerIso = next
        ? formatClinicPickerDayIsoFromSelection(next, clinicTz)
        : formatClinicTodayPickerIso(clinicTz);
      setSelectedPickerIso(pickerIso);
      const normalized = pickerIsoToLocalDate(pickerIso);
      setCalendarMonth((prev) => {
        const target = startOfMonth(normalized);
        if (
          prev.getFullYear() === target.getFullYear() &&
          prev.getMonth() === target.getMonth()
        ) {
          return prev;
        }
        return target;
      });
    },
    [clinicTz],
  );

  const handleCalendarMonthChange = useCallback((month: Date) => {
    setCalendarMonth(month);
  }, []);

  const canViewAllDoctors = useMemo(
    () => isClinicWideAppointmentRole(user?.role),
    [user?.role],
  );

  const doctorScope = useMemo(
    () =>
      resolveDoctorScopedAppointmentFilter({
        role: user?.role,
        userId: user?.id,
        requestedDoctorId: selectedDoctorId,
      }),
    [selectedDoctorId, user?.id, user?.role],
  );

  const { data: doctors = [] } = useDoctors();
  const { data: unavailableDoctorResponse } = useUnavailableDoctorIdsForDate(date);
  const unavailableDoctorIds = useMemo(
    () => new Set(unavailableDoctorResponse?.doctorIds ?? []),
    [unavailableDoctorResponse?.doctorIds],
  );

  const doctorsList = useMemo(
    () => doctors.filter((d) => !unavailableDoctorIds.has(d.id)),
    [doctors, unavailableDoctorIds],
  );

  useEffect(() => {
    if (
      selectedDoctorId &&
      unavailableDoctorIds.has(selectedDoctorId)
    ) {
      setSelectedDoctorId(undefined);
    }
  }, [selectedDoctorId, unavailableDoctorIds]);

  const rangeStart = subDays(startOfMonth(calendarMonth), 7);
  const rangeEnd = addDays(endOfMonth(calendarMonth), 7);

  const monthRangeQueryOptions = {
    startDate: formatClinicPickerDayIsoFromSelection(rangeStart, clinicTz),
    endDate: formatClinicPickerDayIsoFromSelection(rangeEnd, clinicTz),
    ...(doctorScope.scopedDoctorId
      ? { doctorId: doctorScope.scopedDoctorId }
      : {}),
    status: VISIBLE_APPOINTMENT_STATUS_QUERY,
    limit: 500,
  };

  const { data: monthRangeAppointmentsResponse } = useAppointments(
    monthRangeQueryOptions,
  );

  const appointmentCountsByDay = useMemo(() => {
    const map = new Map<string, number>();
    for (const apt of monthRangeAppointmentsResponse?.items ?? []) {
      const key = formatUtcInstantAsClinicPickerIso(apt.startTime, clinicTz);
      if (!key) {
        continue;
      }
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return map;
  }, [monthRangeAppointmentsResponse?.items, clinicTz]);

  const dayQueryOptions = {
    date: selectedPickerIso,
    ...(doctorScope.scopedDoctorId
      ? { doctorId: doctorScope.scopedDoctorId }
      : {}),
    search: debouncedSearch,
    status: VISIBLE_APPOINTMENT_STATUS_QUERY,
    limit: 100,
  };

  const {
    data: appointmentsResponse,
    isLoading: appointmentsLoading,
    isFetching: appointmentsFetching,
    isError,
    isFetched,
    refetch,
  } = useAppointments(dayQueryOptions);

  const loading =
    !clinicReady ||
    appointmentsLoading ||
    (appointmentsFetching && !isFetched);

  const appointments = useMemo(() => {
    return appointmentsResponse?.items || [];
  }, [appointmentsResponse]);

  const rowActions = useAppointmentRowActions({
    onMutated: () => {
      void refetch();
    },
  });

  const { isAddDialogOpen, handleDialogChange, preselectedPatientId } =
    useAppointmentsDialogUrlSync();

  const uniqueAppointments = useMemo(() => {
    const seen = new Set<string>();
    return appointments.filter((apt: AppointmentListItem) => {
      if (!apt.id || seen.has(apt.id)) return false;
      seen.add(apt.id);
      return true;
    });
  }, [appointments]);

  const filteredAppointments = useMemo(
    () =>
      [...uniqueAppointments]
        .filter((apt) => apt.status !== "cancelled")
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        ),
    [uniqueAppointments],
  );

  const currentTimeSlot = useMemo(
    () => formatClinicHalfHourSlotKey(new Date(), clinicTz),
    [clinicTz],
  );
  const isToday = useMemo(
    () => selectedPickerIso === formatClinicTodayPickerIso(clinicTz),
    [selectedPickerIso, clinicTz],
  );

  useEffect(() => {
    if (isToday && currentTimeSlotRef.current) {
      setTimeout(() => {
        currentTimeSlotRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [isToday, filteredAppointments]);

  const {
    checkingIn,
    startingConsultationId,
    handleCheckIn,
    handleStartConsultation,
    handleAppointmentAdded,
  } = useAppointmentActions({ refetch });

  return {
    state: {
      date,
      selectedPickerIso,
      clinicTz,
      setDate: handleDateSelect,
      calendarMonth,
      onCalendarMonthChange: handleCalendarMonthChange,
      appointmentCountsByDay,
      checkingIn,
      startingConsultationId,
      rowActionDialogProps: rowActions.dialogProps,
      isAddDialogOpen,
      handleDialogChange,
      selectedDoctorId,
      setSelectedDoctorId,
      searchQuery,
      setSearchQuery,
      canViewAllDoctors,
      doctorsList,
      loading,
      isError,
      hasMoreAppointments: Boolean(appointmentsResponse?.hasMore),
      filteredAppointments,
      appointments: uniqueAppointments,
      currentTimeSlot,
      isToday,
      currentTimeSlotRef,
      preselectedPatientId,
      user,
    },
    handlers: {
      handleCheckIn,
      handleStartConsultation,
      handleAppointmentAdded,
      onCancelClick: rowActions.onCancelClick,
      onNoShowClick: rowActions.onNoShowClick,
      refetch,
    },
  };
};
