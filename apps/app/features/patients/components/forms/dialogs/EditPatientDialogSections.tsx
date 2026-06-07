"use client";

import type { Control } from "react-hook-form";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button } from "@workspace/ui/components/form/button";
import type { UpdatePatientRequest } from "@workspace/types";
import {
  SharedPatientContactFields,
  SharedPatientIdentityFields,
  SharedPatientNameFields,
} from "./shared-patient-info-fields";

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
    <div className="flex flex-col-reverse gap-2 border-t border-border/60 pt-4 sm:flex-row sm:justify-end">
      <Button
        type="button"
        variant="outline"
        onClick={onCancel}
        disabled={isPending}
      >
        Cancel
      </Button>
      <Button type="submit" disabled={isPending}>
        {isPending && (
          <DocitaLoadingIndicator
            variant="inline"
            decorative
            className="mr-2"
          />
        )}
        Save Changes
      </Button>
    </div>
  );
}
