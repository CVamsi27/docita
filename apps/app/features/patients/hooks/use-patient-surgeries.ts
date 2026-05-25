import { useCallback } from "react";
import { toast } from "sonner";
import {
  useCreatePatientSurgicalHistory,
  useDeletePatientSurgicalHistory,
} from "@workspace/data-access";

interface PatientHistoryMutationOptions {
  patientId: string;
  invalidatePatient: () => void;
  onError: (error: unknown) => void;
}

export function usePatientSurgeries({
  patientId,
  invalidatePatient: _invalidatePatient,
  onError,
}: PatientHistoryMutationOptions) {
  const { mutate: createSurgery } = useCreatePatientSurgicalHistory(patientId);
  const { mutate: deleteSurgery } = useDeletePatientSurgicalHistory(patientId);

  const addSurgery = useCallback(
    (procedureName: string, procedureDate?: string) => {
      const trimmed = procedureName.trim();
      if (!trimmed) return;
      createSurgery(
        {
          procedureName: trimmed,
          procedureDate: procedureDate || undefined,
          complications: "",
          notes: "",
        },
        {
          onSuccess: () => {
            toast.success("Surgery added");
          },
          onError,
        },
      );
    },
    [createSurgery, onError],
  );

  const removeSurgery = useCallback(
    (id: string) => {
      deleteSurgery(id, {
        onSuccess: () => {
          toast.success("Surgery removed");
        },
        onError,
      });
    },
    [deleteSurgery, onError],
  );

  return {
    addSurgery,
    removeSurgery,
  };
}
