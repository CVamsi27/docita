import { useCallback } from "react";

import type { Medication } from "./prescription-input.types";

type UpdateFn = (index: number, field: keyof Medication, value: string) => void;

export function usePrescriptionForm(updateMedication: UpdateFn) {
  const fieldUpdaters = useCallback(
    (index: number) => ({
      updateName: (v: string) => updateMedication(index, "name", v),
      updateDosage: (v: string) => updateMedication(index, "dosage", v),
      updateFrequency: (v: string) => updateMedication(index, "frequency", v),
      updateDuration: (v: string) => updateMedication(index, "duration", v),
      updateRoute: (v: string) => updateMedication(index, "route", v),
      updateInstructions: (v: string) =>
        updateMedication(index, "instructions", v),
    }),
    [updateMedication],
  );

  return { fieldUpdaters };
}
