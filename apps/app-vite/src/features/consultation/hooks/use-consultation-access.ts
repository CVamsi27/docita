import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  type AppointmentWithRelations,
  useStartConsultation,
  useUpdateAppointment,
} from "@workspace/data-access";

import { isConsultationReadOnlyStatus } from "@/features/appointments/rules/appointment-rules";
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
  const navigate = useNavigate();
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
      navigate(fallbackRoute, { replace: true });
    }, 1600);

    return () => window.clearTimeout(timeoutId);
  }, [
    appointmentData,
    authLoading,
    canAccessConsultationWorkspace,
    fallbackRoute,
    loading,
    navigate,
  ]);

  const handleSave = useCallback(
    async (input: UpdateAppointmentInput) => {
      await updateAppointment.mutateAsync(input);
      await queryClient.invalidateQueries({
        queryKey: queryKeys.appointments.detail(appointmentId),
      });
    },
    [appointmentId, queryClient, updateAppointment],
  );

  return { canAccessConsultationWorkspace, handleSave };
}
