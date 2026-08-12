import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissions } from "@/hooks/use-permissions";
import { isSessionRecoveryError } from "@/lib/auth/session-recovery";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { useConsultationAppointment } from "./use-consultation-appointment";
import { useConsultationAccess } from "./use-consultation-access";

export const useConsultationLogic = (appointmentId: string) => {
  const [searchParams] = useSearchParams();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { user, isLoading: authLoading } = useAuth();
  const { canStartConsultation } = usePermissions();

  const {
    appointmentData,
    loading,
    isError,
    appointmentError,
    refetchAppointment,
    clinic,
  } = useConsultationAppointment({ appointmentId, authLoading, user });

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

  const { canAccessConsultationWorkspace, handleSave } = useConsultationAccess({
    appointmentId,
    appointmentData,
    loading,
    authLoading,
    canStartConsultation,
    user,
    fallbackRoute,
  });

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
