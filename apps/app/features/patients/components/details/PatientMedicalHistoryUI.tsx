import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { History } from "lucide-react";
import type {
  PatientAllergy,
  PatientSocialHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";

import { PatientMedicalHistorySpecialty } from "./patient-medical-history-specialty";
import {
  PatientConditionsBlock,
  PatientAllergiesBlock,
  PatientSurgeriesBlock,
  PatientFamilyHistoryBlock,
  PatientSocialHistoryBlock,
} from "./PatientMedicalHistoryUISections";

interface PatientMedicalHistoryUIProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  className?: string;
  clinicType?: string;
  onCustomDataUpdate?: (
    key: string,
    value: string | number | boolean | Record<string, unknown>,
  ) => void;

  newCondition: string;
  onNewConditionChange: (value: string) => void;
  onAddCondition: () => void;
  onRemoveCondition: (id: string) => void;

  newAllergy: string;
  onNewAllergyChange: (value: string) => void;
  onAddAllergy: () => void;
  onRemoveAllergy: (id: string) => void;
  editingAllergy: PatientAllergy | null;
  onEditAllergy: (allergy: PatientAllergy) => void;
  onUpdateAllergy: () => void;
  onCancelEditAllergy: () => void;
  onEditingAllergyChange: (allergy: PatientAllergy) => void;

  newSurgery: string;
  newSurgeryDate: string;
  onNewSurgeryChange: (value: string) => void;
  onNewSurgeryDateChange: (value: string) => void;
  onAddSurgery: () => void;
  onRemoveSurgery: (id: string) => void;

  newFamilyCondition: string;
  newFamilyRelation: string;
  onNewFamilyConditionChange: (value: string) => void;
  onNewFamilyRelationChange: (value: string) => void;
  onAddFamilyHistory: () => void;
  onRemoveFamilyHistory: (id: string) => void;

  onSocialHistoryUpdate: (
    field: keyof PatientSocialHistory,
    value: string,
  ) => void;
  variant?: "default" | "consultation";
  allowGrowthEdit?: boolean;
}

export function PatientMedicalHistoryUI({
  patient,
  readOnly,
  className,
  clinicType,
  onCustomDataUpdate,
  newCondition,
  onNewConditionChange,
  onAddCondition,
  onRemoveCondition,
  newAllergy,
  onNewAllergyChange,
  onAddAllergy,
  onRemoveAllergy,
  editingAllergy,
  onEditAllergy,
  onUpdateAllergy,
  onCancelEditAllergy,
  onEditingAllergyChange,
  newSurgery,
  newSurgeryDate,
  onNewSurgeryChange,
  onNewSurgeryDateChange,
  onAddSurgery,
  onRemoveSurgery,
  newFamilyCondition,
  newFamilyRelation,
  onNewFamilyConditionChange,
  onNewFamilyRelationChange,
  onAddFamilyHistory,
  onRemoveFamilyHistory,
  onSocialHistoryUpdate,
  variant = "default",
  allowGrowthEdit = true,
}: PatientMedicalHistoryUIProps) {
  const isCompact = variant === "consultation";
  const isGrowthReadOnly = readOnly || !allowGrowthEdit;

  const specialtySection = (
    <PatientMedicalHistorySpecialty
      patient={patient}
      clinicType={clinicType}
      readOnly={readOnly}
      isGrowthReadOnly={isGrowthReadOnly}
      isCompact={isCompact}
      onCustomDataUpdate={onCustomDataUpdate}
    />
  );

  const sharedBlocks = (
    <>
      <PatientConditionsBlock
        patient={patient}
        readOnly={readOnly}
        isCompact={isCompact}
        newCondition={newCondition}
        onNewConditionChange={onNewConditionChange}
        onAddCondition={onAddCondition}
        onRemoveCondition={onRemoveCondition}
      />
      <div className="h-px bg-border/50" />
      <PatientAllergiesBlock
        patient={patient}
        readOnly={readOnly}
        isCompact={isCompact}
        newAllergy={newAllergy}
        onNewAllergyChange={onNewAllergyChange}
        onAddAllergy={onAddAllergy}
        onRemoveAllergy={onRemoveAllergy}
        editingAllergy={editingAllergy}
        onEditAllergy={onEditAllergy}
        onUpdateAllergy={onUpdateAllergy}
        onCancelEditAllergy={onCancelEditAllergy}
        onEditingAllergyChange={onEditingAllergyChange}
      />
      <div className="h-px bg-border/50" />
      <PatientSurgeriesBlock
        patient={patient}
        readOnly={readOnly}
        isCompact={isCompact}
        newSurgery={newSurgery}
        newSurgeryDate={newSurgeryDate}
        onNewSurgeryChange={onNewSurgeryChange}
        onNewSurgeryDateChange={onNewSurgeryDateChange}
        onAddSurgery={onAddSurgery}
        onRemoveSurgery={onRemoveSurgery}
      />
    </>
  );

  const historyBlocks = (
    <>
      <PatientFamilyHistoryBlock
        patient={patient}
        readOnly={readOnly}
        isCompact={isCompact}
        newFamilyCondition={newFamilyCondition}
        newFamilyRelation={newFamilyRelation}
        onNewFamilyConditionChange={onNewFamilyConditionChange}
        onNewFamilyRelationChange={onNewFamilyRelationChange}
        onAddFamilyHistory={onAddFamilyHistory}
        onRemoveFamilyHistory={onRemoveFamilyHistory}
      />
      <PatientSocialHistoryBlock
        patient={patient}
        readOnly={readOnly}
        isCompact={isCompact}
        onSocialHistoryUpdate={onSocialHistoryUpdate}
      />
    </>
  );

  return (
    <div className={className}>
      {specialtySection}
      {isCompact ? (
        <div className="space-y-6">
          {sharedBlocks}
        </div>
      ) : (
        <Card>
          <CardHeader className="py-4">
            <CardTitle className="text-lg flex items-center gap-2">
              <History className="h-5 w-5 text-info" />
              Patient Medical History
            </CardTitle>
            {!readOnly && (
              <CardDescription>
                Add or remove entries directly. Changes are saved automatically.
              </CardDescription>
            )}
          </CardHeader>
          <CardContent className="space-y-6">
            {sharedBlocks}
          </CardContent>
        </Card>
      )}
      {historyBlocks}
    </div>
  );
}
