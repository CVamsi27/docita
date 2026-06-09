"use client";

import { useCallback, useState } from "react";
import type { HistoryOperations } from "@/features/patients/hooks/use-patient-history";

export function useMedicalHistorySurgeries(operations: HistoryOperations) {
  const [newSurgery, setNewSurgery] = useState("");
  const [newSurgeryDate, setNewSurgeryDate] = useState("");

  const addSurgery = useCallback(() => {
    if (!newSurgery.trim()) return;
    operations.addSurgery(newSurgery.trim(), newSurgeryDate || undefined);
    setNewSurgery("");
    setNewSurgeryDate("");
  }, [newSurgery, newSurgeryDate, operations]);

  const removeSurgery = useCallback((id: string) => operations.removeSurgery(id), [operations]);

  return { newSurgery, setNewSurgery, newSurgeryDate, setNewSurgeryDate, addSurgery, removeSurgery };
}
