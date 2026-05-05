import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePatientHistory } from "@/hooks/api/use-patient-history";
import { useClinicSettings } from "@/hooks/api/use-settings";
import {
  PatientAllergy,
  PatientSocialHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";
import { PatientMedicalHistoryUI } from "./PatientMedicalHistoryUI";
import { PatientMetricsHistoryUI } from "./PatientMetricsHistoryUI";

interface PatientMedicalHistoryContainerProps {
  patient: PatientWithMedicalHistory;
  readOnly?: boolean;
  className?: string;
  variant?: "default" | "consultation";
  allowGrowthEdit?: boolean;
}

const SOCIAL_HISTORY_DEBOUNCE_MS = 500;
const CUSTOM_DATA_DEBOUNCE_MS = 500;

export function PatientMedicalHistoryContainer({
  patient: initialPatient,
  readOnly = false,
  className,
  variant,
  allowGrowthEdit = true,
}: PatientMedicalHistoryContainerProps) {
  const { operations, patient: freshPatient } = usePatientHistory(
    initialPatient.id || "",
  );

  const [editingAllergy, setEditingAllergy] = useState<PatientAllergy | null>(
    null,
  );

  const [newCondition, setNewCondition] = useState("");
  const [newAllergy, setNewAllergy] = useState("");
  const [newSurgery, setNewSurgery] = useState("");
  const [newSurgeryDate, setNewSurgeryDate] = useState("");
  const [newFamilyCondition, setNewFamilyCondition] = useState("");
  const [newFamilyRelation, setNewFamilyRelation] = useState("");

  const { data: clinic } = useClinicSettings();

  const [socialOverrides, setSocialOverrides] = useState<
    Partial<PatientSocialHistory>
  >({});
  const [customDataOverrides, setCustomDataOverrides] = useState<
    Record<string, unknown>
  >({});

  const pendingTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );
  const syncedPatientIdRef = useRef<string | undefined>(initialPatient.id);

  useEffect(() => {
    const nextId = initialPatient.id;
    if (nextId && nextId !== syncedPatientIdRef.current) {
      syncedPatientIdRef.current = nextId;
      setSocialOverrides({});
      setCustomDataOverrides({});
    }
  }, [initialPatient]);

  useEffect(() => {
    const timers = pendingTimersRef.current;
    return () => {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
    };
  }, []);

  const scheduleDebounced = useCallback(
    (key: string, fn: () => void, delay: number) => {
      const existing = pendingTimersRef.current.get(key);
      if (existing) {
        clearTimeout(existing);
      }
      const timer = setTimeout(() => {
        pendingTimersRef.current.delete(key);
        fn();
      }, delay);
      pendingTimersRef.current.set(key, timer);
    },
    [],
  );

  const sourcePatient = freshPatient || initialPatient;

  const displayPatient = useMemo<PatientWithMedicalHistory>(() => {
    const baseSocial = sourcePatient.socialHistory;
    const mergedSocial =
      Object.keys(socialOverrides).length > 0 || baseSocial
        ? ({
            ...(baseSocial ?? {
              patientId: sourcePatient.id || "",
            }),
            ...socialOverrides,
          } as PatientSocialHistory)
        : undefined;

    const baseCustomData =
      sourcePatient.customData &&
      typeof sourcePatient.customData === "object" &&
      !Array.isArray(sourcePatient.customData)
        ? Object.fromEntries(Object.entries(sourcePatient.customData))
        : {};

    const mergedCustomData = {
      ...baseCustomData,
      ...customDataOverrides,
    } as PatientWithMedicalHistory["customData"];

    return {
      ...sourcePatient,
      socialHistory: mergedSocial,
      customData: mergedCustomData,
    };
  }, [sourcePatient, socialOverrides, customDataOverrides]);

  const updateCustomData = useCallback(
    (
      key: string,
      value: string | number | boolean | Record<string, unknown>,
    ) => {
      setCustomDataOverrides((prev) => ({ ...prev, [key]: value }));
      scheduleDebounced(
        `customData:${key}`,
        () => operations.updateCustomData(key, value),
        CUSTOM_DATA_DEBOUNCE_MS,
      );
    },
    [operations, scheduleDebounced],
  );

  const updateSocialHistory = useCallback(
    (field: keyof PatientSocialHistory, value: string) => {
      setSocialOverrides((prev) => ({ ...prev, [field]: value }));
      scheduleDebounced(
        `socialHistory:${String(field)}`,
        () => operations.updateSocialHistory(field, value),
        SOCIAL_HISTORY_DEBOUNCE_MS,
      );
    },
    [operations, scheduleDebounced],
  );

  const addCondition = useCallback(() => {
    if (!newCondition.trim()) return;
    operations.addCondition(newCondition.trim());
    setNewCondition("");
  }, [newCondition, operations]);

  const addAllergy = useCallback(() => {
    if (!newAllergy.trim()) return;
    operations.addAllergy(newAllergy.trim());
    setNewAllergy("");
  }, [newAllergy, operations]);

  const removeCondition = useCallback(
    (id: string) => operations.removeCondition(id),
    [operations],
  );

  const removeAllergy = useCallback(
    (id: string) => operations.removeAllergy(id),
    [operations],
  );

  const handleUpdateAllergy = useCallback(() => {
    if (!editingAllergy) return;
    operations.updateAllergy(editingAllergy);
    setEditingAllergy(null);
  }, [editingAllergy, operations]);

  const addSurgery = useCallback(() => {
    if (!newSurgery.trim()) return;
    operations.addSurgery(newSurgery.trim(), newSurgeryDate || undefined);
    setNewSurgery("");
    setNewSurgeryDate("");
  }, [newSurgery, newSurgeryDate, operations]);

  const removeSurgery = useCallback(
    (id: string) => operations.removeSurgery(id),
    [operations],
  );

  const addFamilyHistory = useCallback(() => {
    if (!newFamilyCondition.trim() || !newFamilyRelation.trim()) return;
    operations.addFamilyHistory(
      newFamilyCondition.trim(),
      newFamilyRelation.trim(),
    );
    setNewFamilyCondition("");
    setNewFamilyRelation("");
  }, [newFamilyCondition, newFamilyRelation, operations]);

  const removeFamilyHistory = useCallback(
    (id: string) => operations.removeFamilyHistory(id),
    [operations],
  );

  if (variant !== "consultation") {
    return (
      <PatientMetricsHistoryUI
        patientId={initialPatient.id || ""}
        readOnly={readOnly}
        className={className}
      />
    );
  }

  return (
    <PatientMedicalHistoryUI
      patient={displayPatient}
      readOnly={readOnly}
      className={className}
      clinicType={clinic?.type}
      onCustomDataUpdate={updateCustomData}
      newCondition={newCondition}
      onNewConditionChange={setNewCondition}
      onAddCondition={addCondition}
      onRemoveCondition={removeCondition}
      newAllergy={newAllergy}
      onNewAllergyChange={setNewAllergy}
      onAddAllergy={addAllergy}
      onRemoveAllergy={removeAllergy}
      editingAllergy={editingAllergy}
      onEditAllergy={setEditingAllergy}
      onUpdateAllergy={handleUpdateAllergy}
      onCancelEditAllergy={() => setEditingAllergy(null)}
      onEditingAllergyChange={setEditingAllergy}
      newSurgery={newSurgery}
      newSurgeryDate={newSurgeryDate}
      onNewSurgeryChange={setNewSurgery}
      onNewSurgeryDateChange={setNewSurgeryDate}
      onAddSurgery={addSurgery}
      onRemoveSurgery={removeSurgery}
      newFamilyCondition={newFamilyCondition}
      onNewFamilyConditionChange={setNewFamilyCondition}
      newFamilyRelation={newFamilyRelation}
      onNewFamilyRelationChange={setNewFamilyRelation}
      onAddFamilyHistory={addFamilyHistory}
      onRemoveFamilyHistory={removeFamilyHistory}
      onSocialHistoryUpdate={updateSocialHistory}
      variant={variant}
      allowGrowthEdit={allowGrowthEdit}
    />
  );
}
