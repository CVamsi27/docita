"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PatientSocialHistory, PatientWithMedicalHistory } from "@workspace/types";
import type { HistoryOperations } from "@/features/patients/hooks/use-patient-history";
import { buildDisplayPatient } from "./medical-history-helpers";

const SOCIAL_HISTORY_DEBOUNCE_MS = 500;
const CUSTOM_DATA_DEBOUNCE_MS = 500;

export function useMedicalHistoryOverrides(
  initialPatient: PatientWithMedicalHistory,
  freshPatient: PatientWithMedicalHistory | undefined,
  operations: HistoryOperations,
) {
  const [socialOverrides, setSocialOverrides] = useState<Partial<PatientSocialHistory>>({});
  const [customDataOverrides, setCustomDataOverrides] = useState<Record<string, unknown>>({});
  const pendingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const syncedPatientIdRef = useRef<string | undefined>(initialPatient.id);

  useEffect(() => {
    if (initialPatient.id && initialPatient.id !== syncedPatientIdRef.current) {
      syncedPatientIdRef.current = initialPatient.id;
      setSocialOverrides({});
      setCustomDataOverrides({});
    }
  }, [initialPatient]);

  useEffect(() => {
    const timers = pendingTimersRef.current;
    return () => { timers.forEach((t) => clearTimeout(t)); timers.clear(); };
  }, []);

  const scheduleDebounced = useCallback((key: string, fn: () => void, delay: number) => {
    const existing = pendingTimersRef.current.get(key);
    if (existing) clearTimeout(existing);
    const t = setTimeout(() => { pendingTimersRef.current.delete(key); fn(); }, delay);
    pendingTimersRef.current.set(key, t);
  }, []);

  const sourcePatient = freshPatient || initialPatient;

  const displayPatient = useMemo<PatientWithMedicalHistory>(
    () => buildDisplayPatient(sourcePatient, socialOverrides, customDataOverrides),
    [sourcePatient, socialOverrides, customDataOverrides],
  );

  const updateCustomData = useCallback((key: string, value: string | number | boolean | Record<string, unknown>) => {
    setCustomDataOverrides((prev) => ({ ...prev, [key]: value }));
    scheduleDebounced(`customData:${key}`, () => operations.updateCustomData(key, value), CUSTOM_DATA_DEBOUNCE_MS);
  }, [operations, scheduleDebounced]);

  const updateSocialHistory = useCallback((field: keyof PatientSocialHistory, value: string) => {
    setSocialOverrides((prev) => ({ ...prev, [field]: value }));
    scheduleDebounced(`socialHistory:${String(field)}`, () => operations.updateSocialHistory(field, value), SOCIAL_HISTORY_DEBOUNCE_MS);
  }, [operations, scheduleDebounced]);

  return { displayPatient, updateCustomData, updateSocialHistory };
}
