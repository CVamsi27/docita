import { useMemo } from "react";
import { useAppointments } from "@workspace/data-access";
import {
  computeAppointmentCountsByDay,
  computeDayQueryOptions,
  computeMonthRangeQueryOptions,
  deduplicateAppointments,
  filterAndSortAppointments,
} from "@/features/appointments/lib/appointments-logic-helpers";

export function useAppointmentQueryState({
  calendarMonth,
  clinicTz,
  selectedPickerIso,
  debouncedSearch,
  scopedDoctorId,
  clinicReady,
}: {
  calendarMonth: Date;
  clinicTz: string;
  selectedPickerIso: string;
  debouncedSearch: string;
  scopedDoctorId?: string;
  clinicReady: boolean;
}) {
  const monthRangeQueryOptions = useMemo(
    () =>
      computeMonthRangeQueryOptions(calendarMonth, clinicTz, scopedDoctorId),
    [calendarMonth, clinicTz, scopedDoctorId],
  );
  const { data: monthRangeAppointmentsResponse } = useAppointments(
    monthRangeQueryOptions,
  );
  const appointmentCountsByDay = useMemo(
    () =>
      computeAppointmentCountsByDay(
        monthRangeAppointmentsResponse?.items,
        clinicTz,
      ),
    [monthRangeAppointmentsResponse?.items, clinicTz],
  );
  const dayQueryOptions = computeDayQueryOptions(
    selectedPickerIso,
    debouncedSearch,
    scopedDoctorId,
  );
  const {
    data: appointmentsResponse,
    isLoading: appointmentsLoading,
    isFetching: appointmentsFetching,
    isError,
    isFetched,
    refetch,
  } = useAppointments(dayQueryOptions);
  const uniqueAppointments = useMemo(
    () => deduplicateAppointments(appointmentsResponse?.items || []),
    [appointmentsResponse?.items],
  );
  const filteredAppointments = useMemo(
    () => filterAndSortAppointments(uniqueAppointments),
    [uniqueAppointments],
  );
  return {
    appointmentCountsByDay,
    monthRangeAppointments: monthRangeAppointmentsResponse?.items ?? [],
    appointmentsResponse,
    filteredAppointments,
    uniqueAppointments,
    isError,
    refetch,
    loading:
      !clinicReady ||
      appointmentsLoading ||
      (appointmentsFetching && !isFetched),
  };
}
