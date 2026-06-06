import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  queryKeys,
  type AppointmentWithRelations,
  useStartConsultation,
  useUpdateAppointment,
} from "@workspace/data-access";
import { useClinicSettings } from "@workspace/data-access";
import { useAPIQuery } from "@/lib/api/api-core";
import { useTierFeatureEnabled } from "@/lib/access-control/use-tier-feature-enabled";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { isSessionRecoveryError } from "@/lib/auth/session-recovery";
import { usePermissions } from "@/hooks/use-permissions";
import { Feature, UpdateAppointmentInput } from "@workspace/types";
import { isConsultationReadOnlyStatus } from "@/features/appointments";

export const useConsultationLogic = (appointmentId: string) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const { canStartConsultation } = usePermissions();

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

  const fromPage = searchParams.get("from");
  const fallbackRoute = useMemo(() => {
    if (fromPage === "patient" && appointmentData?.patientId) {
      return `/patients/${appointmentData.patientId}`;
    }
    if (fromPage === "patient") return "/patients";
    if (fromPage === "list") return "/consultation";

    return "/consultation";
  }, [fromPage, appointmentData?.patientId]);

  const handleBack = useBackNavigation(fallbackRoute);

  const updateAppointment = useUpdateAppointment(appointmentId);
  const startConsultation = useStartConsultation();

  const canAccessConsultationWorkspace = useMemo(() => {
    if (!appointmentData || !user) return false;
    if (!canStartConsultation) return false;
    return appointmentData.doctorId === user.id;
  }, [appointmentData, canStartConsultation, user]);

  const startConsultationAttemptedRef = useRef(false);
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
    state: {
      appointmentData,
      loading,
      isError,
      appointmentError: isSessionRecoveryError(appointmentError)
        ? appointmentError
        : undefined,
      isAccessDenied:
        !loading &&
        !authLoading &&
        !!appointmentData &&
        !canAccessConsultationWorkspace,
      clinic,
      clinicType: clinic?.type,
      isSidebarOpen,
      fallbackRoute,
    },
    handlers: {
      handleBack,
      handleSave,
      retry: () => {
        void refetchAppointment();
      },
      toggleSidebar: () => setIsSidebarOpen((prev) => !prev),
      setIsSidebarOpen,
    },
  };
};
