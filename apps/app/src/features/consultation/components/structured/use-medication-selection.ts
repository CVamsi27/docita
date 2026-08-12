import { useCallback, useMemo } from "react";

import type { Medication } from "./prescription-input.types";

interface UseMedicationSelectionParams {
  value: Medication[];
  onChange: (medications: Medication[]) => void;
  defaultRoute: string;
}

export function useMedicationSelection({
  value,
  onChange,
  defaultRoute,
}: UseMedicationSelectionParams) {
  const medications = useMemo(() => (value.length > 0 ? value : []), [value]);

  const addMedication = useCallback(() => {
    onChange([
      ...medications,
      {
        name: "",
        dosage: "",
        frequency: "",
        duration: "",
        route: defaultRoute,
        instructions: "",
      },
    ]);
  }, [medications, onChange, defaultRoute]);

  const updateMedication = useCallback(
    (index: number, field: keyof Medication, fieldValue: string) => {
      onChange(
        medications.map((med, i) =>
          i === index ? { ...med, [field]: fieldValue } : med,
        ),
      );
    },
    [medications, onChange],
  );

  const removeMedication = useCallback(
    (index: number) => {
      onChange(medications.filter((_, i) => i !== index));
    },
    [medications, onChange],
  );

  return { medications, addMedication, updateMedication, removeMedication };
}
