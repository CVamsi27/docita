import { useCallback } from "react";
import { toast } from "sonner";
import {
  useCreatePatientAllergy,
  useDeletePatientAllergy,
  useUpdatePatientAllergy,
} from "@workspace/data-access";
import type { PatientAllergy } from "@workspace/types";

interface PatientHistoryMutationOptions {
  patientId: string;
  invalidatePatient: () => void;
  onError: (error: unknown) => void;
}

export function usePatientAllergies({
  patientId,
  invalidatePatient: _invalidatePatient,
  onError,
}: PatientHistoryMutationOptions) {
  const { mutate: createAllergy } = useCreatePatientAllergy(patientId);
  const { mutate: deleteAllergy } = useDeletePatientAllergy(patientId);
  const { mutate: updateAllergy } = useUpdatePatientAllergy(patientId);

  const addAllergy = useCallback(
    (
      allergen: string,
      severity: PatientAllergy["severity"] = "MODERATE",
      allergyType: PatientAllergy["allergyType"] = "DRUG",
    ) => {
      const trimmed = allergen.trim();
      if (!trimmed) return;
      createAllergy(
        {
          allergen: trimmed,
          severity,
          allergyType,
          reaction: "",
        },
        {
          onSuccess: () => {
            toast.success("Allergy added");
          },
          onError,
        },
      );
    },
    [createAllergy, onError],
  );

  const removeAllergy = useCallback(
    (id: string) => {
      deleteAllergy(id, {
        onSuccess: () => {
          toast.success("Allergy removed");
        },
        onError,
      });
    },
    [deleteAllergy, onError],
  );

  const updateAllergyHandler = useCallback(
    (allergy: PatientAllergy) => {
      if (!allergy.id) throw new Error("Allergy id is required to update");
      updateAllergy(
        {
          id: allergy.id,
          allergen: allergy.allergen,
          severity: allergy.severity,
          allergyType: allergy.allergyType,
          reaction: allergy.reaction,
          onsetDate: allergy.onsetDate,
          notes: allergy.notes,
        },
        {
          onSuccess: () => {
            toast.success("Allergy updated");
          },
          onError,
        },
      );
    },
    [updateAllergy, onError],
  );

  return {
    addAllergy,
    removeAllergy,
    updateAllergy: updateAllergyHandler,
  };
}
