import { useCallback, useEffect, useState } from "react";
import { usePatientHistory } from "@/hooks/api/use-patient-history";
import { useClinicSettings } from "@/hooks/api/use-settings";
import {
  PatientAllergy,
  PatientFamilyHistory,
  PatientMedicalCondition,
  PatientSocialHistory,
  PatientSurgicalHistory,
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
  const [draftPatient, setDraftPatient] = useState<PatientWithMedicalHistory>(
    initialPatient,
  );

  useEffect(() => {
    setDraftPatient(freshPatient || initialPatient);
  }, [freshPatient, initialPatient]);

  const updateDraftPatient = useCallback(
    (
      updater: (
        current: PatientWithMedicalHistory,
      ) => PatientWithMedicalHistory,
    ) => {
      setDraftPatient((current) => updater(current));
    },
    [],
  );

  const updateCustomData = useCallback(
    (
      key: string,
      value: string | number | boolean | Record<string, unknown>,
    ) => {
      updateDraftPatient((current) => ({
        ...current,
        customData: {
          ...(current.customData && typeof current.customData === "object"
            ? Object.fromEntries(Object.entries(current.customData))
            : {}),
          [key]: value,
        } as PatientWithMedicalHistory["customData"],
      }));
      operations.updateCustomData(key, value);
    },
    [operations, updateDraftPatient],
  );

  const updateSocialHistory = useCallback(
    (field: keyof PatientSocialHistory, value: string) => {
      updateDraftPatient((current) => ({
        ...current,
        socialHistory: {
          ...(current.socialHistory ?? {
            patientId: current.id || "",
            alcoholFrequency: "",
            substanceUse: "",
            occupation: "",
            occupationalHazards: "",
            exerciseFrequency: "",
            dietaryRestrictions: "",
            notes: "",
          }),
          [field]: value,
        },
      }));
      operations.updateSocialHistory(field, value);
    },
    [operations, updateDraftPatient],
  );

  const addCondition = useCallback(() => {
    if (!newCondition.trim()) return;
    const conditionName = newCondition.trim();
    updateDraftPatient((current) => {
      const nextCondition: PatientMedicalCondition = {
        id: crypto.randomUUID(),
        patientId: current.id || "",
        conditionName,
        conditionType: "CHRONIC",
        status: "ACTIVE",
        diagnosedBy: "",
        notes: "",
        sourceType: "MANUAL",
      };

      return {
        ...current,
        medicalConditions: [...(current.medicalConditions || []), nextCondition],
      };
    });
    operations.addCondition(conditionName);
    setNewCondition("");
  }, [newCondition, operations, updateDraftPatient]);

  const addAllergy = useCallback(() => {
    if (!newAllergy.trim()) return;
    const allergen = newAllergy.trim();
    updateDraftPatient((current) => {
      const nextAllergy: PatientAllergy = {
        id: crypto.randomUUID(),
        patientId: current.id || "",
        allergen,
        severity: "MODERATE",
        allergyType: "DRUG",
        reaction: "",
        verifiedBy: "",
        isVerified: false,
      };

      return {
        ...current,
        patientAllergies: [...(current.patientAllergies || []), nextAllergy],
      };
    });
    operations.addAllergy(allergen);
    setNewAllergy("");
  }, [newAllergy, operations, updateDraftPatient]);

  const removeCondition = useCallback(
    (id: string) => {
      updateDraftPatient((current) => ({
        ...current,
        medicalConditions: (current.medicalConditions || []).filter(
          (condition) => condition.id !== id,
        ),
      }));
      operations.removeCondition(id);
    },
    [operations, updateDraftPatient],
  );

  const removeAllergy = useCallback(
    (id: string) => {
      updateDraftPatient((current) => ({
        ...current,
        patientAllergies: (current.patientAllergies || []).filter(
          (allergy) => allergy.id !== id,
        ),
      }));
      operations.removeAllergy(id);
    },
    [operations, updateDraftPatient],
  );

  const handleUpdateAllergy = useCallback(() => {
    if (!editingAllergy) return;
    updateDraftPatient((current) => ({
      ...current,
      patientAllergies: (current.patientAllergies || []).map((allergy) =>
        allergy.id === editingAllergy.id ? editingAllergy : allergy,
      ),
    }));
    operations.updateAllergy(editingAllergy);
    setEditingAllergy(null);
  }, [editingAllergy, operations, updateDraftPatient]);

  const addSurgery = useCallback(() => {
    if (!newSurgery.trim()) return;
    const procedureName = newSurgery.trim();
    const procedureDate = newSurgeryDate || undefined;
    updateDraftPatient((current) => {
      const nextSurgery: PatientSurgicalHistory = {
        id: crypto.randomUUID(),
        patientId: current.id || "",
        procedureName,
        procedureDate,
        complications: "",
        notes: "",
      };

      return {
        ...current,
        surgicalHistory: [...(current.surgicalHistory || []), nextSurgery],
      };
    });
    operations.addSurgery(procedureName, procedureDate);
    setNewSurgery("");
    setNewSurgeryDate("");
  }, [newSurgery, newSurgeryDate, operations, updateDraftPatient]);

  const removeSurgery = useCallback(
    (id: string) => {
      updateDraftPatient((current) => ({
        ...current,
        surgicalHistory: (current.surgicalHistory || []).filter(
          (surgery) => surgery.id !== id,
        ),
      }));
      operations.removeSurgery(id);
    },
    [operations, updateDraftPatient],
  );

  const addFamilyHistory = useCallback(() => {
    if (!newFamilyCondition.trim() || !newFamilyRelation.trim()) return;
    const condition = newFamilyCondition.trim();
    const relationship = newFamilyRelation.trim();
    updateDraftPatient((current) => {
      const nextFamily: PatientFamilyHistory = {
        id: crypto.randomUUID(),
        patientId: current.id || "",
        condition,
        relationship,
      };

      return {
        ...current,
        familyHistory: [...(current.familyHistory || []), nextFamily],
      };
    });
    operations.addFamilyHistory(condition, relationship);
    setNewFamilyCondition("");
    setNewFamilyRelation("");
  }, [
    newFamilyCondition,
    newFamilyRelation,
    operations,
    updateDraftPatient,
  ]);

  const removeFamilyHistory = useCallback(
    (id: string) => {
      updateDraftPatient((current) => ({
        ...current,
        familyHistory: (current.familyHistory || []).filter(
          (familyHistory) => familyHistory.id !== id,
        ),
      }));
      operations.removeFamilyHistory(id);
    },
    [operations, updateDraftPatient],
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

  const patient = draftPatient;

  return (
    <PatientMedicalHistoryUI
      patient={patient}
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
