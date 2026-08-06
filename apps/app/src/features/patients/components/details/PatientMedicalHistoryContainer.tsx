import { useClinicSettings } from "@workspace/data-access";
import { type PatientWithMedicalHistory } from "@workspace/types";
import { PatientMedicalHistoryUI } from "./PatientMedicalHistoryUI";
import { PatientMetricsHistoryUI } from "./PatientMetricsHistoryUI";
import { usePatientMedicalHistoryForm } from "./PatientMedicalHistoryContainerSections";

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
  const { data: clinic } = useClinicSettings();
  const form = usePatientMedicalHistoryForm(initialPatient);

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
      patient={form.displayPatient}
      readOnly={readOnly}
      className={className}
      clinicType={clinic?.type}
      onCustomDataUpdate={form.updateCustomData}
      newCondition={form.newCondition}
      onNewConditionChange={form.setNewCondition}
      onAddCondition={form.addCondition}
      onRemoveCondition={form.removeCondition}
      newAllergy={form.newAllergy}
      onNewAllergyChange={form.setNewAllergy}
      onAddAllergy={form.addAllergy}
      onRemoveAllergy={form.removeAllergy}
      editingAllergy={form.editingAllergy}
      onEditAllergy={form.setEditingAllergy}
      onUpdateAllergy={form.handleUpdateAllergy}
      onCancelEditAllergy={() => form.setEditingAllergy(null)}
      onEditingAllergyChange={form.setEditingAllergy}
      newSurgery={form.newSurgery}
      newSurgeryDate={form.newSurgeryDate}
      onNewSurgeryChange={form.setNewSurgery}
      onNewSurgeryDateChange={form.setNewSurgeryDate}
      onAddSurgery={form.addSurgery}
      onRemoveSurgery={form.removeSurgery}
      newFamilyCondition={form.newFamilyCondition}
      onNewFamilyConditionChange={form.setNewFamilyCondition}
      newFamilyRelation={form.newFamilyRelation}
      onNewFamilyRelationChange={form.setNewFamilyRelation}
      onAddFamilyHistory={form.addFamilyHistory}
      onRemoveFamilyHistory={form.removeFamilyHistory}
      onSocialHistoryUpdate={form.updateSocialHistory}
      variant={variant}
      allowGrowthEdit={allowGrowthEdit}
    />
  );
}
