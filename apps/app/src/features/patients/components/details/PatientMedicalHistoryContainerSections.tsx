import type { PatientWithMedicalHistory } from "@workspace/types";
import { usePatientHistory } from "@/features/patients/hooks/use-patient-history";
import { useMedicalHistoryAllergies } from "./use-medical-history-allergies";
import { useMedicalHistoryConditions } from "./use-medical-history-conditions";
import { useMedicalHistorySurgeries } from "./use-medical-history-surgeries";
import { useMedicalHistoryFamily } from "./use-medical-history-family";
import { useMedicalHistoryOverrides } from "./use-medical-history-overrides";

export function usePatientMedicalHistoryForm(
  initialPatient: PatientWithMedicalHistory,
) {
  const { operations, patient: freshPatient } = usePatientHistory(
    initialPatient.id || "",
  );
  const allergies = useMedicalHistoryAllergies(operations);
  const conditions = useMedicalHistoryConditions(operations);
  const surgeries = useMedicalHistorySurgeries(operations);
  const family = useMedicalHistoryFamily(operations);
  const overrides = useMedicalHistoryOverrides(
    initialPatient,
    freshPatient,
    operations,
  );

  return {
    displayPatient: overrides.displayPatient,
    editingAllergy: allergies.editingAllergy,
    setEditingAllergy: allergies.setEditingAllergy,
    newCondition: conditions.newCondition,
    setNewCondition: conditions.setNewCondition,
    newAllergy: allergies.newAllergy,
    setNewAllergy: allergies.setNewAllergy,
    newSurgery: surgeries.newSurgery,
    setNewSurgery: surgeries.setNewSurgery,
    newSurgeryDate: surgeries.newSurgeryDate,
    setNewSurgeryDate: surgeries.setNewSurgeryDate,
    newFamilyCondition: family.newFamilyCondition,
    setNewFamilyCondition: family.setNewFamilyCondition,
    newFamilyRelation: family.newFamilyRelation,
    setNewFamilyRelation: family.setNewFamilyRelation,
    updateCustomData: overrides.updateCustomData,
    updateSocialHistory: overrides.updateSocialHistory,
    addCondition: conditions.addCondition,
    addAllergy: allergies.addAllergy,
    removeCondition: conditions.removeCondition,
    removeAllergy: allergies.removeAllergy,
    handleUpdateAllergy: allergies.handleUpdateAllergy,
    addSurgery: surgeries.addSurgery,
    removeSurgery: surgeries.removeSurgery,
    addFamilyHistory: family.addFamilyHistory,
    removeFamilyHistory: family.removeFamilyHistory,
  };
}
