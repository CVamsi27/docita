import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAppointment,
  useStartConsultation,
  useUpdateAppointment,
} from "@/hooks/api/use-appointments";
import { useClinicSettings } from "@/hooks/api/use-settings";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { useAuth } from "@/lib/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { UpdateAppointmentInput } from "@workspace/types";
export const useConsultationLogic = (appointmentId: string) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const { canStartConsultation } = usePermissions();

  const {
    data: appointmentData,
    isLoading: loading,
    isError,
  } = useAppointment(appointmentId);

  const { data: clinic } = useClinicSettings();

  const fromPage = searchParams.get("from");
  const fallbackRoute = useMemo(() => {
    if (fromPage === "patient" && appointmentData?.patientId) {
      return `/patients/${appointmentData.patientId}`;
    }
    if (fromPage === "patient") {
      return "/patients";
    }

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

  const markedInProgressRef = useRef(false);
  useEffect(() => {
    if (
      authLoading ||
      !canAccessConsultationWorkspace ||
      markedInProgressRef.current ||
      !appointmentData ||
      !["scheduled", "confirmed", "checked-in", "in-progress"].includes(
        appointmentData.status,
      )
    ) {
      return;
    }

    markedInProgressRef.current = true;
    startConsultation.mutate(
      { appointmentId },
      {
        onError: () => {
          markedInProgressRef.current = false;
        },
      },
    );
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

      await queryClient.invalidateQueries({
        queryKey: ["appointments", appointmentId],
      });
      await queryClient.refetchQueries({
        queryKey: ["appointments", appointmentId],
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
      toggleSidebar: () => setIsSidebarOpen((prev) => !prev),
      setIsSidebarOpen,
    },
  };
};
