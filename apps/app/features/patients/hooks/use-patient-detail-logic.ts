import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePatientData } from "@/hooks/use-patient-data";
import { useAuth } from "@/lib/auth-context";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { useRepeatPrescription } from "@/hooks/use-repeat-prescription";
import { usePermissionStore } from "@/lib/stores/permission-store";

export const usePatientDetailLogic = (patientId: string) => {
  const router = useRouter();
  const { patient, appointments, documents, statistics, loading, error, refetch } =
    usePatientData(patientId);
  const { user } = useAuth();
  const goBack = useBackNavigation("/patients");
  const { canAccess } = usePermissionStore();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const canAccessPatient = useMemo(() => {
    if (!user || user.role !== "DOCTOR") return true; 

    return true;
  }, [user]);

  const handleScheduleVisit = useCallback(() => {
    if (patient?.id) {
      router.push(`/appointments?patientId=${patient.id}&action=new`);
    }
  }, [router, patient?.id]);

  const handleBackToPatients = useCallback(() => {
    goBack();
  }, [goBack]);

  const { repeatPrescription } = useRepeatPrescription();

  const handleRepeatPrescription = useCallback(
    (appointmentId: string) => {
      if (patient?.id) {
        repeatPrescription(appointmentId, patient.id);
      }
    },
    [patient?.id, repeatPrescription],
  );

  return {
    state: {
      patient,
      appointments,
      documents,
      statistics,
      loading,
      error,
      canAccessPatient,
      isEditDialogOpen,
      setIsEditDialogOpen,
      user,
      canAccess,
    },
    handlers: {
      handleBackToPatients,
      handleScheduleVisit,
      handleRepeatPrescription,
      handleRefetch: refetch,
    },
  };
};
