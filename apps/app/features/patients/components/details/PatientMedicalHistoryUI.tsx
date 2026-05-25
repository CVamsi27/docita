import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/indicators/card";
import { History } from "lucide-react";
import {
  PatientAllergy,
  PatientSocialHistory,
  PatientWithMedicalHistory,
} from "@workspace/types";

import { PatientConditions } from "./history/PatientConditions";
import { PatientAllergies } from "./history/PatientAllergies";
import { PatientSurgeries } from "./history/PatientSurgeries";
import { PatientFamilyHistory } from "./history/PatientFamilyHistory";
import { PatientSocialHistoryComp } from "./history/PatientSocialHistory";
import { PatientMedicalHistorySpecialty } from "./patient-medical-history-specialty";

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

  const conditionsBlock = (
    <div className="space-y-4">
      {!isCompact ? null : (
        <div className="font-semibold text-sm text-foreground/70 uppercase tracking-wider">
          Conditions
        </div>
      )}
      <PatientConditions
        patient={patient}
        readOnly={readOnly}
        newCondition={newCondition}
        onNewConditionChange={onNewConditionChange}
        onAddCondition={onAddCondition}
        onRemoveCondition={onRemoveCondition}
      />
    </div>
  );

  const allergiesBlock = (
    <div className="space-y-4">
      {!isCompact ? null : (
        <div className="font-semibold text-sm text-foreground/70 uppercase tracking-wider">
          Allergies
        </div>
      )}
      <PatientAllergies
        patient={patient}
        readOnly={readOnly}
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
    </div>
  );

  const surgeriesBlock = (
    <div className="space-y-4">
      {!isCompact ? null : (
        <div className="font-semibold text-sm text-foreground/70 uppercase tracking-wider">
          Surgeries
        </div>
      )}
      <PatientSurgeries
        patient={patient}
        readOnly={readOnly}
        newSurgery={newSurgery}
        newSurgeryDate={newSurgeryDate}
        onNewSurgeryChange={onNewSurgeryChange}
        onNewSurgeryDateChange={onNewSurgeryDateChange}
        onAddSurgery={onAddSurgery}
        onRemoveSurgery={onRemoveSurgery}
      />
    </div>
  );

  const familyBlock = (
    <div className="mt-8">
      {!isCompact ? null : (
        <div className="font-semibold text-sm text-foreground/70 uppercase tracking-wider mb-4">
          Family History
        </div>
      )}
      <PatientFamilyHistory
        patient={patient}
        readOnly={readOnly}
        newFamilyCondition={newFamilyCondition}
        newFamilyRelation={newFamilyRelation}
        onNewFamilyConditionChange={onNewFamilyConditionChange}
        onNewFamilyRelationChange={onNewFamilyRelationChange}
        onAddFamilyHistory={onAddFamilyHistory}
        onRemoveFamilyHistory={onRemoveFamilyHistory}
      />
    </div>
  );

  const socialBlock = (
    <div className="mt-8">
      {!isCompact ? null : (
        <div className="font-semibold text-sm text-foreground/70 uppercase tracking-wider mb-4">
          Social History
        </div>
      )}
      <PatientSocialHistoryComp
        patient={patient}
        readOnly={readOnly}
        onSocialHistoryUpdate={onSocialHistoryUpdate}
      />
    </div>
  );

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

  if (isCompact) {
    return (
      <div className={className}>
        {specialtySection}
        <div className="space-y-6">
          {conditionsBlock}
          <div className="h-px bg-border/50" />
          {allergiesBlock}
          <div className="h-px bg-border/50" />
          {surgeriesBlock}
        </div>
        {familyBlock}
        {socialBlock}
      </div>
    );
  }

  return (
    <div className={className}>
      {specialtySection}
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
          {conditionsBlock}
          <div className="h-px bg-border/50" />
          {allergiesBlock}
          <div className="h-px bg-border/50" />
          {surgeriesBlock}
        </CardContent>
      </Card>
      {familyBlock}
      {socialBlock}
    </div>
  );
}
