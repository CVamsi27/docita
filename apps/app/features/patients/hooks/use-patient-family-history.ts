import { useCallback } from "react";
import { toast } from "sonner";
import {
  useCreatePatientFamilyHistory,
  useDeletePatientFamilyHistory,
} from "@workspace/data-access";

interface PatientHistoryMutationOptions {
  patientId: string;
  invalidatePatient: () => void;
  onError: (error: unknown) => void;
}

export function usePatientFamilyHistory({
  patientId,
  invalidatePatient: _invalidatePatient,
  onError,
}: PatientHistoryMutationOptions) {
  const { mutate: createFamilyHistory } =
    useCreatePatientFamilyHistory(patientId);
  const { mutate: deleteFamilyHistory } =
    useDeletePatientFamilyHistory(patientId);

  const addFamilyHistory = useCallback(
    (condition: string, relationship: string) => {
      const trimmedCondition = condition.trim();
      const trimmedRelationship = relationship.trim();
      if (!trimmedCondition || !trimmedRelationship) return;
      createFamilyHistory(
        {
          condition: trimmedCondition,
          relationship: trimmedRelationship,
        },
        {
          onSuccess: () => {
            toast.success("Family history added");
          },
          onError,
        },
      );
    },
    [createFamilyHistory, onError],
  );

  const removeFamilyHistory = useCallback(
    (id: string) => {
      deleteFamilyHistory(id, {
        onSuccess: () => {
          toast.success("Family history removed");
        },
        onError,
      });
    },
    [deleteFamilyHistory, onError],
  );

  return {
    addFamilyHistory,
    removeFamilyHistory,
  };
}
