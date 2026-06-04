import { useMemo, useRef, useState } from "react";
import {
  formatClinicHalfHourSlotKey,
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
import { useAppointmentsDateState } from "./use-appointments-date-state";
import {
  useClearUnavailableDoctorSelection,
  useDefaultDoctorSelection,
  useScrollToCurrentTimeSlot,
} from "./use-appointments-selection-effects";

export const useAppointmentsLogic = () => {
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { user } = useAuth();
  const { clinic, clinicId: contextClinicId } = useClinic();

  useDefaultDoctorSelection(user, setSelectedDoctorId);

  const resolvedClinicId = clinic?.id ?? contextClinicId ?? user?.clinicId ?? undefined;
  const clinicReady = Boolean(resolvedClinicId);
  const currentTimeSlotRef = useRef<HTMLDivElement>(null);
  const {
    date,
    selectedPickerIso,
    clinicTz,
    setDate,
    calendarMonth,
    onCalendarMonthChange,
    isToday,
  } = useAppointmentsDateState(clinic?.timezone);

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

  useClearUnavailableDoctorSelection(
    selectedDoctorId,
    unavailableDoctorIds,
    setSelectedDoctorId,
  );

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
  useScrollToCurrentTimeSlot({
    isToday,
    currentTimeSlotRef,
    dependencyToken: filteredAppointments,
  });

  const {
    checkingIn, startingConsultationId, handleCheckIn, handleStartConsultation, handleAppointmentAdded,
  } = useAppointmentActions({ refetch });

  return {
    state: {
      date, selectedPickerIso, clinicTz, setDate,
      calendarMonth, onCalendarMonthChange,
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
