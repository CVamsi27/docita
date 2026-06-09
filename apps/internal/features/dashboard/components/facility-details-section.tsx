"use client";

import { DEFAULT_COUNTRY_CODE } from "@workspace/utils";
import { ClinicCoreDetailsFields } from "@/components/forms/clinic-details-form-fields";
import type {
  CreateClinicFormData,
  FieldErrors,
} from "@/features/dashboard/hooks/create-clinic-form-helpers";

type Props = {
  formData: CreateClinicFormData;
  fieldErrors: FieldErrors;
  onFieldChange: (field: keyof CreateClinicFormData, value: string) => void;
};

export function FacilityDetailsSection({
  formData,
  fieldErrors,
  onFieldChange,
}: Props) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        Facility Details
      </h4>
      <ClinicCoreDetailsFields
        idPrefix=""
        errorIdPrefix="create-clinic"
        formData={formData}
        fieldErrors={fieldErrors}
        defaultCountry={DEFAULT_COUNTRY_CODE}
        onFieldChange={onFieldChange}
      />
    </div>
  );
}
