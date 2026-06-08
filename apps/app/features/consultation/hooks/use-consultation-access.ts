import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  type AppointmentWithRelations,
  useStartConsultation,
  useUpdateAppointment,
} from "@workspace/data-access";
import { isSessionRecoveryError } from "@/lib/auth/session-recovery";
import { isConsultationReadOnlyStatus } from "@/features/appointments";
import type { UpdateAppointmentInput } from "@workspace/types";

interface UseConsultationAccessParams {
  appointmentId: string;
  appointmentData: AppointmentWithRelations | undefined;
  loading: boolean;
  authLoading: boolean;
  canStartConsultation: boolean;
  user: { id?: string } | null | undefined;
  fallbackRoute: string;
}

export function useConsultationAccess({
  appointmentId,
  appointmentData,
  loading,
  authLoading,
  canStartConsultation,
  user,
  fallbackRoute,
}: UseConsultationAccessParams) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const updateAppointment = useUpdateAppointment(appointmentId);
  const startConsultation = useStartConsultation();
  const startConsultationAttemptedRef = useRef(false);

  const canAccessConsultationWorkspace = useMemo(() => {
    if (!appointmentData || !user) return false;
    if (!canStartConsultation) return false;
    return appointmentData.doctorId === user.id;
  }, [appointmentData, canStartConsultation, user]);

  useEffect(() => {
    if (
      authLoading ||
      !canAccessConsultationWorkspace ||
      startConsultationAttemptedRef.current ||
      !appointmentData ||
      isConsultationReadOnlyStatus(appointmentData.status) ||
      !["scheduled", "confirmed", "checked-in", "in-progress"].includes(
        appointmentData.status,
      )
    ) {
      return;
    }

    startConsultationAttemptedRef.current = true;
    startConsultation.mutate({ appointmentId });
  }, [
    appointmentData,
    appointmentId,
    authLoading,
    canAccessConsultationWorkspace,
    startConsultation,
  ]);

  useEffect(() => {
    if (loading || authLoading || !appointmentData) {
      return;
    }

    if (canAccessConsultationWorkspace) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      router.replace(fallbackRoute);
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [
    appointmentData,
    authLoading,
    canAccessConsultationWorkspace,
    fallbackRoute,
    loading,
    router,
  ]);

  const handleSave = useCallback(
    async (data: UpdateAppointmentInput) => {
      await updateAppointment.mutateAsync(data);

      const detailKey = queryKeys.appointments.detail(appointmentId);
      await queryClient.invalidateQueries({ queryKey: detailKey });
      await queryClient.refetchQueries({
        queryKey: detailKey,
        type: "active",
      });
    },
    [queryClient, appointmentId, updateAppointment],
  );

  return {
    canAccessConsultationWorkspace,
    handleSave,
  };
}
