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

  const { data: clinic } = useClinicSettings();

  const { data: patientAppointmentsResponse } = usePatientAppointments(
    appointmentData?.patientId || "",
  );
  const patientAppointments = useMemo(
    () => patientAppointmentsResponse?.items || [],
    [patientAppointmentsResponse?.items],
  );

  const pastAppointments = useMemo(() => {
    return patientAppointments
      .filter(
        (apt: Appointment) =>
          apt.id !== appointmentId && apt.status === "completed",
      )
      .map((apt: Appointment) => ({
        id: apt.id || "",
        date: apt.startTime,
        chiefComplaint: apt.chiefComplaint,
        finalDiagnosis: apt.finalDiagnosis,
        diagnoses: apt.diagnoses,
      }))
      .sort(
        (a: { date: Date | string }, b: { date: Date | string }) =>
          new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      .slice(0, 10);
  }, [patientAppointments, appointmentId]);

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
