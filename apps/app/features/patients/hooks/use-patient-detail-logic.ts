import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { usePatientData, PatientStatistics } from "@/hooks/use-patient-data";
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
    if (user?.role !== "DOCTOR") return true; // Non-doctors can access all patients

    // Doctors can only access patients they have appointments with
    const hasAppointment = appointments.some(
      (apt) => apt.doctorId === user?.id,
    );
    return hasAppointment;
  }, [user?.role, user?.id, appointments]);

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
