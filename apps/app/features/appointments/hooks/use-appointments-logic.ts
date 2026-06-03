import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_TIMEZONE, formatClinicHalfHourSlotKey,
  formatClinicPickerDayIsoFromSelection, formatClinicTodayPickerIso,
  pickerIsoToLocalDate, startOfMonth,
} from "@workspace/utils";
import { useDoctors, useUnavailableDoctorIdsForDate, useAppointments } from "@workspace/data-access";
import { useAuth } from "@/lib/auth/auth-context";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { isClinicWideAppointmentRole, resolveDoctorScopedAppointmentFilter } from "@workspace/types";
import { useAppointmentRowActions } from "@/features/appointments/hooks/use-appointment-row-actions";
import { useAppointmentActions } from "@/features/appointments/hooks/use-appointment-actions";
import { useAppointmentsDialogUrlSync } from "@/features/appointments/hooks/use-appointments-dialog-url-sync";
import { useClinic } from "@/lib/contexts/clinic-context";
import {
  computeAppointmentCountsByDay, computeDayQueryOptions,
  computeMonthRangeQueryOptions, deduplicateAppointments, filterAndSortAppointments,
} from "@/features/appointments/lib/appointments-logic-helpers";

export const useAppointmentsLogic = () => {
  const [selectedPickerIso, setSelectedPickerIso] = useState(() =>
    formatClinicTodayPickerIso(DEFAULT_TIMEZONE),
  );
  const [calendarMonth, setCalendarMonth] = useState<Date>(() =>
    startOfMonth(pickerIsoToLocalDate(formatClinicTodayPickerIso(DEFAULT_TIMEZONE))),
  );
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(undefined);
  const appliedDefaultDoctorRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { user } = useAuth();
  const { clinic, clinicId: contextClinicId } = useClinic();

  useEffect(() => {
    if (appliedDefaultDoctorRef.current || !user?.id) return;
    if (user.role === "ADMIN_DOCTOR" || user.role === "DOCTOR") setSelectedDoctorId(user.id);
    appliedDefaultDoctorRef.current = true;
  }, [user?.id, user?.role]);

  const resolvedClinicId = clinic?.id ?? contextClinicId ?? user?.clinicId ?? undefined;
  const clinicReady = Boolean(resolvedClinicId);
  const clinicTz = useMemo(() => clinic?.timezone?.trim() || DEFAULT_TIMEZONE, [clinic?.timezone]);
  const currentTimeSlotRef = useRef<HTMLDivElement>(null);
  const syncedClinicTzRef = useRef<string | null>(null);
  const userPickedDateRef = useRef(false);

  const date = useMemo(() => pickerIsoToLocalDate(selectedPickerIso), [selectedPickerIso]);

  useEffect(() => {
    if (!clinic?.timezone || syncedClinicTzRef.current === clinicTz) return;
    syncedClinicTzRef.current = clinicTz;
    if (userPickedDateRef.current) return;
    const todayIso = formatClinicTodayPickerIso(clinicTz);
    setSelectedPickerIso(todayIso);
    setCalendarMonth(startOfMonth(pickerIsoToLocalDate(todayIso)));
  }, [clinic?.timezone, clinicTz]);

  const handleDateSelect = useCallback((next: Date | undefined) => {
    userPickedDateRef.current = true;
    const pickerIso = next
      ? formatClinicPickerDayIsoFromSelection(next, clinicTz)
      : formatClinicTodayPickerIso(clinicTz);
    setSelectedPickerIso(pickerIso);
    const normalized = pickerIsoToLocalDate(pickerIso);
    setCalendarMonth((prev) => {
      const target = startOfMonth(normalized);
      if (prev.getFullYear() === target.getFullYear() && prev.getMonth() === target.getMonth()) return prev;
      return target;
    });
  }, [clinicTz]);

  const handleCalendarMonthChange = useCallback((month: Date) => { setCalendarMonth(month); }, []);

  const canViewAllDoctors = useMemo(() => isClinicWideAppointmentRole(user?.role), [user?.role]);

  const doctorScope = useMemo(
    () => resolveDoctorScopedAppointmentFilter({
      role: user?.role, userId: user?.id, requestedDoctorId: selectedDoctorId,
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
    if (selectedDoctorId && unavailableDoctorIds.has(selectedDoctorId)) setSelectedDoctorId(undefined);
  }, [selectedDoctorId, unavailableDoctorIds]);

  const monthRangeQueryOptions = useMemo(
    () => computeMonthRangeQueryOptions(calendarMonth, clinicTz, doctorScope.scopedDoctorId),
    [calendarMonth, clinicTz, doctorScope.scopedDoctorId],
  );

  const { data: monthRangeAppointmentsResponse } = useAppointments(monthRangeQueryOptions);
  const monthRangeAppointments = monthRangeAppointmentsResponse?.items ?? [];

  const appointmentCountsByDay = useMemo(
    () => computeAppointmentCountsByDay(monthRangeAppointmentsResponse?.items, clinicTz),
    [monthRangeAppointmentsResponse?.items, clinicTz],
  );

  const dayQueryOptions = computeDayQueryOptions(selectedPickerIso, debouncedSearch, doctorScope.scopedDoctorId);

  const {
    data: appointmentsResponse, isLoading: appointmentsLoading,
    isFetching: appointmentsFetching, isError, isFetched, refetch,
  } = useAppointments(dayQueryOptions);

  const loading = !clinicReady || appointmentsLoading || (appointmentsFetching && !isFetched);

  const rowActions = useAppointmentRowActions({ onMutated: () => { void refetch(); } });
  const { isAddDialogOpen, handleDialogChange, preselectedPatientId } = useAppointmentsDialogUrlSync();

  const uniqueAppointments = useMemo(
    () => deduplicateAppointments(appointmentsResponse?.items || []),
    [appointmentsResponse?.items],
  );
  const filteredAppointments = useMemo(() => filterAndSortAppointments(uniqueAppointments), [uniqueAppointments]);

  const currentTimeSlot = useMemo(() => formatClinicHalfHourSlotKey(new Date(), clinicTz), [clinicTz]);
  const isToday = useMemo(
    () => selectedPickerIso === formatClinicTodayPickerIso(clinicTz),
    [selectedPickerIso, clinicTz],
  );

  useEffect(() => {
    if (isToday && currentTimeSlotRef.current) {
      setTimeout(() => {
        currentTimeSlotRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [isToday, filteredAppointments]);

  const {
    checkingIn, startingConsultationId, handleCheckIn, handleStartConsultation, handleAppointmentAdded,
  } = useAppointmentActions({ refetch });

  return {
    state: {
      date, selectedPickerIso, clinicTz, setDate: handleDateSelect,
      calendarMonth, onCalendarMonthChange: handleCalendarMonthChange,
      appointmentCountsByDay, monthRangeAppointments, checkingIn, startingConsultationId,
      rowActionDialogProps: rowActions.dialogProps, isAddDialogOpen, handleDialogChange,
      selectedDoctorId, setSelectedDoctorId, searchQuery, setSearchQuery,
      canViewAllDoctors, doctorsList, loading, isError,
      hasMoreAppointments: Boolean(appointmentsResponse?.hasMore),
      filteredAppointments, appointments: uniqueAppointments,
      currentTimeSlot, isToday, currentTimeSlotRef, preselectedPatientId, user,
    },
    handlers: {
      handleCheckIn, handleStartConsultation, handleAppointmentAdded,
      onCancelClick: rowActions.onCancelClick, onNoShowClick: rowActions.onNoShowClick, refetch,
    },
  };
};
