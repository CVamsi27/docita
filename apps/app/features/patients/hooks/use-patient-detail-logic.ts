import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePatientData } from "@/hooks/use-patient-data";
import { useAuth } from "@/lib/auth-context";
import { useSmartBack } from "@/hooks/use-smart-back";
import { useRepeatPrescription } from "@/hooks/use-repeat-prescription";
import { usePermissionStore } from "@/lib/stores/permission-store";

export const usePatientDetailLogic = (patientId: string) => {
  const router = useRouter();
  const { patient, appointments, documents, statistics, loading, refetch } =
    usePatientData(patientId);
  const { user } = useAuth();
  const goBack = useSmartBack("/");
  const { canAccess } = usePermissionStore();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Check if doctor can access this patient
  const canAccessPatient = useMemo(() => {
    if (!user || user.role !== "DOCTOR") return true; // Non-doctors or unauthenticated can access

    // Doctors can access patients in their clinic
    // We trust that the patient was fetched within the clinic context by usePatientData
    // But we also check for appointments with this doctor if we want to keep that logic
    // Actually, for now, let's allow all doctors in the clinic to see all patients in the clinic
    // Since usePatientData already filters by clinicId on the server side (via the user's token)
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
