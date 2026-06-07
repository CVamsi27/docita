"use client";

// jscpd:ignore-start
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { type Country } from "react-phone-number-input";
import type { ClinicType, TierName } from "@workspace/types";
import { ClinicCoreDetailsFields } from "@/components/forms/clinic-details-form-fields";

export type EditClinicFormData = {
// jscpd:ignore-end
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: TierName;
  type: ClinicType;
  active: boolean;
};

export type EditClinicFieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

type Props = {
  formData: EditClinicFormData;
  fieldErrors: EditClinicFieldErrors;
  onFieldChange: (field: keyof EditClinicFormData, value: string | boolean) => void;
  phoneCountryCode: Country;
};

export function EditClinicDetailsSection({
  formData,
  fieldErrors,
  onFieldChange,
  phoneCountryCode,
}: Props) {
  return (
    <div className="space-y-4">
      <ClinicCoreDetailsFields
        idPrefix="edit-"
        errorIdPrefix="edit-clinic"
        formData={formData}
        fieldErrors={fieldErrors}
        defaultCountry={phoneCountryCode}
        onFieldChange={onFieldChange}
      />
      <div className="space-y-2">
        <Label htmlFor="edit-active">Status</Label>
        <Select
          value={formData.active ? "active" : "inactive"}
          onValueChange={(val) => onFieldChange("active", val === "active")}
        >
          <SelectTrigger>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
