import { useAPIQuery } from "@/lib/api/api-core";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { useClinicSettings } from "@workspace/data-access";
import { queryKeys, type AppointmentWithRelations } from "@workspace/data-access";
import { Feature } from "@workspace/types";

interface UseConsultationAppointmentParams {
  appointmentId: string;
  authLoading: boolean;
  user: { id?: string } | null | undefined;
}

export function useConsultationAppointment({
  appointmentId,
  authLoading,
  user,
}: UseConsultationAppointmentParams) {
  const calendarOk = useTierFeatureEnabled(Feature.CALENDAR_SLOTS);
  const appointmentQueryEnabled =
    calendarOk && appointmentId.length > 0 && !authLoading && Boolean(user);

  const {
    data: appointmentData,
    isPending,
    isFetching,
    isError,
    error: appointmentError,
    refetch: refetchAppointment,
  } = useAPIQuery<AppointmentWithRelations>(
    queryKeys.appointments.detail(appointmentId),
    `/appointments/${appointmentId}`,
    { enabled: appointmentQueryEnabled },
  );

  const loading =
    authLoading ||
    (appointmentQueryEnabled &&
      !appointmentData &&
      !isError &&
      (isPending || isFetching));

  const { data: clinic } = useClinicSettings();

  return {
    appointmentData,
    loading,
    isError,
    appointmentError,
    refetchAppointment,
    clinic,
    calendarOk,
  };
}
