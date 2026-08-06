import { useCallback, useState } from "react";
import type { HistoryOperations } from "@/features/patients/hooks/use-patient-history";

export function useMedicalHistoryFamily(operations: HistoryOperations) {
  const [newFamilyCondition, setNewFamilyCondition] = useState("");
  const [newFamilyRelation, setNewFamilyRelation] = useState("");

  const addFamilyHistory = useCallback(() => {
    if (!newFamilyCondition.trim() || !newFamilyRelation.trim()) return;
    operations.addFamilyHistory(newFamilyCondition.trim(), newFamilyRelation.trim());
    setNewFamilyCondition("");
    setNewFamilyRelation("");
  }, [newFamilyCondition, newFamilyRelation, operations]);

  const removeFamilyHistory = useCallback((id: string) => operations.removeFamilyHistory(id), [operations]);

  return { newFamilyCondition, setNewFamilyCondition, newFamilyRelation, setNewFamilyRelation, addFamilyHistory, removeFamilyHistory };
}
