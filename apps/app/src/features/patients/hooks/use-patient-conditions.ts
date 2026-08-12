import { useCallback } from "react";
import { toast } from "sonner";
import {
  useCreatePatientCondition,
  useDeletePatientCondition,
} from "@workspace/data-access";

interface PatientHistoryMutationOptions {
  patientId: string;
  invalidatePatient: () => void;
  onError: (error: unknown) => void;
}

export function usePatientConditions({
  patientId,
  invalidatePatient: _invalidatePatient,
  onError,
}: PatientHistoryMutationOptions) {
  const { mutate: createCondition } = useCreatePatientCondition(patientId);
  const { mutate: deleteCondition } = useDeletePatientCondition(patientId);

  const addCondition = useCallback(
    (conditionName: string) => {
      const trimmed = conditionName.trim();
      if (!trimmed) return;
      createCondition(
        {
          conditionName: trimmed,
          conditionType: "CHRONIC",
          status: "ACTIVE",
          sourceType: "MANUAL",
          diagnosedBy: "",
          notes: "",
        },
        {
          onSuccess: () => {
            toast.success("Condition added");
          },
          onError,
        },
      );
    },
    [createCondition, onError],
  );

  const removeCondition = useCallback(
    (id: string) => {
      deleteCondition(id, {
        onSuccess: () => {
          toast.success("Condition removed");
        },
        onError,
      });
    },
    [deleteCondition, onError],
  );

  return {
    addCondition,
    removeCondition,
  };
}
