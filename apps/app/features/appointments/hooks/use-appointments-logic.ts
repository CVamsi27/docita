import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addDays,
  DEFAULT_TIMEZONE,
  endOfMonth,
  formatClinicHalfHourSlotKey,
  formatClinicPickerDayIsoFromSelection,
  formatClinicTodayPickerIso,
  formatUtcInstantAsClinicPickerIso,
  startOfMonth,
  subDays,
} from "@workspace/utils";
import { useDoctors, useUnavailableDoctorIdsForDate } from "@/hooks/api/use-settings";
import {
  type AppointmentListItem,
  useAppointments,
} from "@/hooks/api/use-appointments";
import { useAuth } from "@/lib/auth/auth-context";
import { useDebounce } from "@workspace/hooks/use-debounce";
import {
  isClinicWideAppointmentRole,
  resolveDoctorScopedAppointmentFilter,
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
  const NON_CANCELLED_APPOINTMENT_STATUSES =
    "scheduled,confirmed,in_progress,completed,no-show";
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [calendarMonth, setCalendarMonth] = useState<Date>(() =>
    startOfMonth(new Date()),
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(
    undefined,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { user } = useAuth();
  const { clinic } = useClinic();
  const clinicTz = useMemo(
    () => (clinic?.timezone?.trim() || DEFAULT_TIMEZONE) as string,
    [clinic?.timezone],
  );
  const currentTimeSlotRef = useRef<HTMLDivElement>(null);

  const selectedDateStr = useMemo(
    () =>
      date ? formatClinicPickerDayIsoFromSelection(date, clinicTz) : undefined,
    [date, clinicTz],
  );

  const handleDateSelect = useCallback((next: Date | undefined) => {
    const selected = next ?? new Date();
    setDate(selected);
    setCalendarMonth(startOfMonth(selected));
  }, []);

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

  const { data: monthRangeAppointmentsResponse } = useAppointments({
    startDate: formatClinicPickerDayIsoFromSelection(rangeStart, clinicTz),
    endDate: formatClinicPickerDayIsoFromSelection(rangeEnd, clinicTz),
    ...(doctorScope.scopedDoctorId
      ? { doctorId: doctorScope.scopedDoctorId }
      : {}),
    status: NON_CANCELLED_APPOINTMENT_STATUSES,
    limit: 500,
  });

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

  const {
    data: appointmentsResponse,
    isLoading: loading,
    isError,
    refetch,
  } = useAppointments({
    ...(selectedDateStr ? { date: selectedDateStr } : {}),
    ...(doctorScope.scopedDoctorId
      ? { doctorId: doctorScope.scopedDoctorId }
      : {}),
    search: debouncedSearch,
    status: NON_CANCELLED_APPOINTMENT_STATUSES,
    limit: 100,
  });

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
  const isToday = useMemo(() => {
    if (!date || !selectedDateStr) return false;
    return selectedDateStr === formatClinicTodayPickerIso(clinicTz);
  }, [date, selectedDateStr, clinicTz]);

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
