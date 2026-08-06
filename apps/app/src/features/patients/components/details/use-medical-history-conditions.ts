import { useCallback, useState } from "react";
import type { HistoryOperations } from "@/features/patients/hooks/use-patient-history";

export function useMedicalHistoryConditions(operations: HistoryOperations) {
  const [newCondition, setNewCondition] = useState("");

  const addCondition = useCallback(() => {
    if (!newCondition.trim()) return;
    operations.addCondition(newCondition.trim());
    setNewCondition("");
  }, [newCondition, operations]);

  const removeCondition = useCallback((id: string) => operations.removeCondition(id), [operations]);

  return { newCondition, setNewCondition, addCondition, removeCondition };
}
