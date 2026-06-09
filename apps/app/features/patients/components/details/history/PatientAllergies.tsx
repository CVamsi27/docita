import { PatientAllergy, PatientWithMedicalHistory } from "@workspace/types";
import { AllergyListSection } from "./AllergyListSection";

// jscpd:ignore-start
interface PatientAllergiesProps {
  patient: PatientWithMedicalHistory;
  readOnly: boolean;
  newAllergy: string;
  onNewAllergyChange: (value: string) => void;
  onAddAllergy: () => void;
  onRemoveAllergy: (id: string) => void;
  editingAllergy: PatientAllergy | null;
  onEditAllergy: (allergy: PatientAllergy) => void;
  onUpdateAllergy: () => void;
  onCancelEditAllergy: () => void;
  onEditingAllergyChange: (allergy: PatientAllergy) => void;
}
// jscpd:ignore-end

export function PatientAllergies(props: PatientAllergiesProps) {
  return <AllergyListSection {...props} />;
}
