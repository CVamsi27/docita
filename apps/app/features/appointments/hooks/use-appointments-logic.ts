import { useMemo, useRef, useState } from "react";
import { formatClinicHalfHourSlotKey } from "@workspace/utils";
import { useDebounce } from "@workspace/hooks/use-debounce";
import { useAppointmentRowActions } from "@/features/appointments/hooks/use-appointment-row-actions";
import { useAppointmentActions } from "@/features/appointments/hooks/use-appointment-actions";
import { useAppointmentsDialogUrlSync } from "@/features/appointments/hooks/use-appointments-dialog-url-sync";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useAppointmentDoctorState } from "./use-appointment-doctor-state";
import { useAppointmentQueryState } from "./use-appointment-query-state";
import { useAppointmentsDateState } from "./use-appointments-date-state";
import { useScrollToCurrentTimeSlot } from "./use-appointments-selection-effects";

export const useAppointmentsLogic = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const currentTimeSlotRef = useRef<HTMLDivElement>(null);
  const { clinic } = useClinic();
  const {
    date,
    selectedPickerIso,
    clinicTz,
    setDate,
    calendarMonth,
    onCalendarMonthChange,
    isToday,
  } = useAppointmentsDateState(clinic?.timezone);
  const {
    user,
    resolvedClinicId,
    selectedDoctorId,
    setSelectedDoctorId,
    canViewAllDoctors,
    doctorScope,
    doctorsList,
  } = useAppointmentDoctorState(date);
  const clinicReady = Boolean(resolvedClinicId);
  const {
    appointmentCountsByDay,
    monthRangeAppointments,
    appointmentsResponse,
    filteredAppointments,
    uniqueAppointments,
    isError,
    refetch,
    loading,
  } = useAppointmentQueryState({
    calendarMonth,
    clinicTz,
    selectedPickerIso,
    debouncedSearch,
    scopedDoctorId: doctorScope.scopedDoctorId,
    clinicReady,
  });

  const currentTimeSlot = useMemo(
    () => formatClinicHalfHourSlotKey(new Date(), clinicTz),
    [clinicTz],
  );
  const rowActions = useAppointmentRowActions({
    onMutated: () => {
      void refetch();
    },
  });
  const { isAddDialogOpen, handleDialogChange, preselectedPatientId } =
    useAppointmentsDialogUrlSync();
  useScrollToCurrentTimeSlot({
    isToday,
    currentTimeSlotRef,
    dependencyToken: filteredAppointments,
  });

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
      setDate,
      calendarMonth,
      onCalendarMonthChange,
      appointmentCountsByDay,
      monthRangeAppointments,
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
