import type { Control } from "react-hook-form";
import { FormDialogFooter } from "@workspace/ui/components";
import type { UpdatePatientRequest } from "@workspace/types";
import { SharedPatientContactFields, SharedPatientIdentityFields, SharedPatientNameFields } from "./shared-patient-info-fields";

interface PatientBasicInfoFieldsProps {
  control: Control<UpdatePatientRequest>;
}

export function PatientBasicInfoFields({ control }: PatientBasicInfoFieldsProps) {
  return (
    <>
      <SharedPatientNameFields control={control} />
      <SharedPatientContactFields control={control} />
    </>
  );
}

interface PatientDemographicFieldsProps {
  control: Control<UpdatePatientRequest>;
}
export function PatientDemographicFields({ control }: PatientDemographicFieldsProps) {
  return (
    <SharedPatientIdentityFields control={control} genderRequired dateOfBirthRequired={false} />
  );
}
// ---------------------------------------------------------------------------
// DialogActionButtons
// ---------------------------------------------------------------------------

interface DialogActionButtonsProps {
  onCancel: () => void;
  isPending: boolean;
}

export function DialogActionButtons({
  onCancel,
  isPending,
}: DialogActionButtonsProps) {
  return (
    <FormDialogFooter
      isLoading={isPending}
      submitLabel="Save Changes"
      cancelLabel="Cancel"
      onCancel={onCancel}
    />
  );
}
