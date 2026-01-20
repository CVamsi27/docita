import { useCallback, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  useAppointment,
  usePatientAppointments,
  useUpdateAppointment,
} from "@/hooks/api/use-appointments";
import { useClinicSettings } from "@/hooks/api/use-settings";
import { useSmartBack } from "@/hooks/use-smart-back";
import { useNavigationStore } from "@/lib/stores/navigation-store";
import { Appointment, UpdateAppointmentInput } from "@workspace/types";

// Map old tab names to new ones
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

  const { data: appointmentData, isLoading: loading } =
    useAppointment(appointmentId);

  // Fetch clinic settings to get clinic type
  const { data: clinic } = useClinicSettings();

  // Fetch past appointments for consultation history
  const { data: patientAppointmentsResponse } = usePatientAppointments(
    appointmentData?.patientId || "",
  );
  const patientAppointments = useMemo(
    () => patientAppointmentsResponse?.items || [],
    [patientAppointmentsResponse?.items],
  );

  // Filter past appointments (exclude current, only completed)
  const pastAppointments = useMemo(() => {
    return patientAppointments
      .filter((apt: Appointment) => apt.id !== appointmentId && apt.status === "completed")
      .map((apt: Appointment) => ({
        id: apt.id || "",
        date: apt.startTime,
        chiefComplaint: apt.chiefComplaint,
        finalDiagnosis: apt.finalDiagnosis,
        diagnoses: apt.diagnoses,
      }))
      .sort((a: { date: Date | string }, b: { date: Date | string }) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [patientAppointments, appointmentId]);

  // Compute fallback route based on 'from' query parameter
  const fromPage = searchParams.get("from");
  const fallbackRoute = useMemo(() => {
    if (fromPage === "patient" && appointmentData?.patientId) {
      return `/patients/${appointmentData.patientId}`;
    }
    if (fromPage === "patient") {
      return "/patients";
    }
    // Default to consultation for 'from=queue' or when 'from' is not specified
    return "/consultation";
  }, [fromPage, appointmentData?.patientId]);

  const goBack = useSmartBack(fallbackRoute);

  // Hybrid back navigation
  const handleBack = useCallback(() => {
    if (canGoBack()) {
      goBack();
    } else {
      router.push(fallbackRoute);
    }
  }, [canGoBack, goBack, router, fallbackRoute]);

  // Mutation for updating appointment
  const updateAppointment = useUpdateAppointment(appointmentId);

  const handleSave = useCallback(
    async (data: UpdateAppointmentInput) => {
      try {
        await updateAppointment.mutateAsync(data);

        // Refetch appointment data after save
        await queryClient.invalidateQueries({
          queryKey: ["appointments", appointmentId],
        });
        await queryClient.refetchQueries({
          queryKey: ["appointments", appointmentId],
          type: "active",
        });
      } catch (error) {
        console.error("Failed to save consultation:", error);
        // Ideally show a toast here - UI component does this via logic usually
        throw error;
      }
    },
    [queryClient, appointmentId, updateAppointment],
  );

  // Get default tab from query params
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
      clinic,
      clinicType: clinic?.type,
      pastAppointments,
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
