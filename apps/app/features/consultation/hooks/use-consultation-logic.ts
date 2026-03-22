import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAppointment,
  useUpdateAppointment,
} from "@/hooks/api/use-appointments";
import { useClinicSettings } from "@/hooks/api/use-settings";
import { useSmartBack } from "@/hooks/use-smart-back";
import { useNavigationStore } from "@/lib/stores/navigation-store";
import { UpdateAppointmentInput } from "@workspace/types";

const TAB_MAPPING: Record<string, string> = {
  observations: "chief-complaint",
  vitals: "vitals",
  prescription: "prescription",
  invoice: "invoice",
  diagnosis: "diagnosis",
};

export const useConsultationLogic = (appointmentId: string) => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const { canGoBack } = useNavigationStore();

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

  const goBack = useSmartBack(fallbackRoute);

  const handleBack = useCallback(() => {
    if (canGoBack()) {
      goBack();
    } else {
      router.push(fallbackRoute);
    }
  }, [canGoBack, goBack, router, fallbackRoute]);

  const updateAppointment = useUpdateAppointment(appointmentId);

  const markedInProgressRef = useRef(false);
  useEffect(() => {
    if (
      !markedInProgressRef.current &&
      appointmentData &&
      ["scheduled", "confirmed", "checked-in"].includes(appointmentData.status)
    ) {
      markedInProgressRef.current = true;
      updateAppointment.mutate(
        { status: "in-progress" },
        {
          onError: () => {
            markedInProgressRef.current = false;
          },
        },
      );
    }
  }, [appointmentData, updateAppointment]);

  const handleSave = useCallback(
    async (data: UpdateAppointmentInput) => {
      try {
        await updateAppointment.mutateAsync(data);

        await queryClient.invalidateQueries({
          queryKey: ["appointments", appointmentId],
        });
        await queryClient.refetchQueries({
          queryKey: ["appointments", appointmentId],
          type: "active",
        });
      } catch (error) {

        throw error;
      }
    },
    [queryClient, appointmentId, updateAppointment],
  );

  const rawTab = searchParams.get("tab") || "chief-complaint";
  const defaultTab = (TAB_MAPPING[rawTab] || rawTab) as
    | "chief-complaint"
    | "history"
    | "examination"
    | "diagnosis"
    | "treatment";

  return {
    state: {
      appointmentData,
      loading,
      isError,
      clinic,
      clinicType: clinic?.type,
      isSidebarOpen,
      defaultTab,
    },
    handlers: {
      handleBack,
      handleSave,
      toggleSidebar: () => setIsSidebarOpen((prev) => !prev),
      setIsSidebarOpen,
    },
  };
};
