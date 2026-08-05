import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { Feature } from "@workspace/types";
import type { Patient } from "@workspace/types";
import { useAddDialogUrlSync } from "@/hooks/use-add-dialog-url-sync";

export function usePatientsDialogs(
  canAccess: (feature: Feature) => boolean,
) {
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [schedulingPatientId, setSchedulingPatientId] = useState<
    string | undefined
  >(undefined);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const navigate = useNavigate();
  const { isAddDialogOpen, setIsAddDialogOpen, handleDialogChange } =
    useAddDialogUrlSync({ basePath: "" });

  const handleScheduleDialogChange = useCallback((open: boolean) => {
    setIsScheduleDialogOpen(open);
    if (!open) {
      setSchedulingPatientId(undefined);
    }
  }, []);

  const schedulePatient = useCallback(
    (patientId: string) => {
      if (canAccess(Feature.CALENDAR_SLOTS)) {
        setSchedulingPatientId(patientId);
        setIsScheduleDialogOpen(true);
        return;
      }
      navigate(`/appointments?action=new&patientId=${patientId}`);
    },
    [canAccess, navigate],
  );

  return {
    isAddDialogOpen,
    isScheduleDialogOpen,
    schedulingPatientId,
    editingPatient,
    setEditingPatient,
    setIsAddDialogOpen,
    handleDialogChange,
    handleScheduleDialogChange,
    schedulePatient,
  };
}
