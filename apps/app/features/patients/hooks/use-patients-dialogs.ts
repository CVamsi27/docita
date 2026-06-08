import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Feature } from "@workspace/types";
import type { Patient } from "@workspace/types";

export function usePatientsDialogs(
  canAccess: (feature: Feature) => boolean,
) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [schedulingPatientId, setSchedulingPatientId] = useState<
    string | undefined
  >(undefined);
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  const currentAction = searchParams.get("action");
  useEffect(() => {
    if (currentAction === "new") {
      setIsAddDialogOpen(true);
    }
  }, [currentAction]);

  const handleDialogChange = useCallback(
    (open: boolean) => {
      setIsAddDialogOpen(open);
      if (!open) {
        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete("action");
        const query = newParams.toString();
        router.replace(query ? `/patients?${query}` : "/patients");
      }
    },
    [searchParams, router],
  );

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
      router.push(`/appointments?action=new&patientId=${patientId}`);
    },
    [canAccess, router],
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
