import { useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { Feature } from "@workspace/types";
import { usePatientData } from "@/hooks/use-patient-data";
import { useAuth } from "@/lib/auth/auth-context";
import { useBackNavigation } from "@/hooks/use-back-navigation";
import { useRepeatPrescription } from "@/hooks/use-repeat-prescription";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { usePermissions } from "@/hooks/use-permissions";

export const usePatientDetailLogic = (patientId: string) => {
  const navigate = useNavigate();
  const {
    patient,
    appointments,
    documents,
    statistics,
    loading,
    error,
    refetch,
  } = usePatientData(patientId);
  const { user } = useAuth();
  const goBack = useBackNavigation("/patients");
  const { canAccess } = usePermissionStore();
  const { canCreateAppointment, canEditPatient, canViewPatients, role } =
    usePermissions();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);

  const canAccessPatient = useMemo(() => {
    if (!user) return false;
    return canViewPatients;
  }, [canViewPatients, user]);

  const canRecordPatientVitals = useMemo(
    () => ["ADMIN", "ADMIN_DOCTOR", "DOCTOR", "NURSE"].includes(role),
    [role],
  );

  const handleScheduleDialogChange = useCallback((open: boolean) => {
    setIsScheduleDialogOpen(open);
  }, []);

  const handleScheduleVisit = useCallback(() => {
    if (!patient?.id) {
      return;
    }
    if (canAccess(Feature.CALENDAR_SLOTS)) {
      setIsScheduleDialogOpen(true);
      return;
    }
    navigate(`/appointments?patientId=${patient.id}&action=new`);
  }, [canAccess, patient?.id, navigate]);

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
      canEditPatient,
      canCreateAppointment,
      canRecordPatientVitals,
      isEditDialogOpen,
      setIsEditDialogOpen,
      isScheduleDialogOpen,
      user,
      role,
      canAccess,
    },
    handlers: {
      handleBackToPatients,
      handleScheduleVisit,
      handleScheduleDialogChange,
      handleRepeatPrescription,
      handleRefetch: refetch,
    },
  };
};
