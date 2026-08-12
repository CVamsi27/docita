import { useCallback, useState } from "react";
import type { PatientAllergy } from "@workspace/types";
import type { HistoryOperations } from "@/features/patients/hooks/use-patient-history";

export function useMedicalHistoryAllergies(operations: HistoryOperations) {
  const [editingAllergy, setEditingAllergy] = useState<PatientAllergy | null>(null);
  const [newAllergy, setNewAllergy] = useState("");

  const addAllergy = useCallback(() => {
    if (!newAllergy.trim()) return;
    operations.addAllergy(newAllergy.trim());
    setNewAllergy("");
  }, [newAllergy, operations]);

  const removeAllergy = useCallback((id: string) => operations.removeAllergy(id), [operations]);

  const handleUpdateAllergy = useCallback(() => {
    if (!editingAllergy) return;
    operations.updateAllergy(editingAllergy);
    setEditingAllergy(null);
  }, [editingAllergy, operations]);

  return { editingAllergy, setEditingAllergy, newAllergy, setNewAllergy, addAllergy, removeAllergy, handleUpdateAllergy };
}
