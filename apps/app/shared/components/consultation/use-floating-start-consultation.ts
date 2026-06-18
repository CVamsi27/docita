"use client";

import { getPatientFullName } from "@workspace/utils";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useQueueByDoctor, useStartConsultation } from "@workspace/data-access";
import { usePermissions } from "@/hooks/use-permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { APP_ACCESS_TARGETS } from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";

interface UseFloatingStartConsultationOptions {
  patientId?: string;
  appointmentId?: string;
  minimized?: boolean;
}

export function useFloatingStartConsultation({
  patientId,
  appointmentId,
  minimized = false,
}: UseFloatingStartConsultationOptions) {
  const router = useRouter();
  const { canStartConsultation } = usePermissions();
  const { user } = useAuth();
  const { canAccess, currentTier, hasIntelligence } = usePermissionStore();
  const startConsultation = useStartConsultation();
  const [isMinimized, setIsMinimized] = useState(minimized);

  const canAccessQueueApi = canAccessTarget(
    APP_ACCESS_TARGETS.API_QUEUE,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      currentTier,
      hasIntelligence,
    },
    "read",
  );
  const queueEnabled =
    canStartConsultation &&
    canAccessQueueApi &&
    !appointmentId &&
    !patientId &&
    !!user?.id;
  const { data: doctorQueue } = useQueueByDoctor(
    user?.id,
    undefined,
    queueEnabled,
  );

  const queueCandidate = useMemo(() => {
    if (!doctorQueue || doctorQueue.length === 0) return null;

    return (
      doctorQueue.find(
        (item) =>
          item.appointmentId && item.status.toUpperCase() === "IN_PROGRESS",
      ) ??
      doctorQueue.find(
        (item) => item.appointmentId && item.status.toUpperCase() === "WAITING",
      ) ??
      doctorQueue.find((item) => item.appointmentId) ??
      null
    );
  }, [doctorQueue]);

  const resolvedAppointmentId = appointmentId ?? queueCandidate?.appointmentId;
  const resolvedPatientId = patientId ?? queueCandidate?.patientId;
  const patientName = queueCandidate?.patient
    ? getPatientFullName(queueCandidate.patient)
    : null;
  const isResumeFlow =
    queueCandidate?.status?.toUpperCase() === "IN_PROGRESS" && !appointmentId;

  const handleStartConsultation = async () => {
    if (resolvedAppointmentId) {
      try {
        const result = await startConsultation.mutateAsync({
          appointmentId: resolvedAppointmentId,
        });
        router.push(`/consultation/${result.appointmentId}`);
      } catch (error) {
        showUserFacingErrorToast(
          error,
          "We could not start this consultation. Please try again.",
          "save",
        );
      }
    } else if (resolvedPatientId) {
      router.push(`/consultation?patientId=${resolvedPatientId}`);
    } else {
      router.push("/consultation");
    }
  };

  const shouldRender =
    canStartConsultation && !!(resolvedPatientId || resolvedAppointmentId);

  return {
    shouldRender,
    isMinimized,
    setIsMinimized,
    isResumeFlow,
    patientName,
    isStartPending: startConsultation.isPending,
    onStartConsultation: () => void handleStartConsultation(),
  };
}
