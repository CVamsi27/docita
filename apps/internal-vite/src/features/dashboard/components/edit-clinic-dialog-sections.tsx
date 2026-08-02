import { Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";
import { FacilityDetailsSection } from "./facility-details-section";
import type { ClinicType, TierName } from "@workspace/types";

export type EditClinicFormData = { name: string; email: string; phone: string; address: string; tier: TierName; type: ClinicType; active: boolean; };
export type EditClinicFieldErrors = { name?: string; email?: string; phone?: string; address?: string; };

type Props = { formData: EditClinicFormData; fieldErrors: EditClinicFieldErrors; onFieldChange: (field: keyof EditClinicFormData, value: string | boolean) => void; };

export function EditClinicDetailsSection({ formData, fieldErrors, onFieldChange }: Props) {
  return (
    <div className="space-y-4">
      <FacilityDetailsSection
        formData={formData as never}
        fieldErrors={fieldErrors}
        onFieldChange={(field, value) => { onFieldChange(field as keyof EditClinicFormData, value); }}
      />
      <div className="space-y-2"><Label htmlFor="edit-active">Status</Label>
        <Select value={formData.active ? "active" : "inactive"} onValueChange={(val) => { onFieldChange("active", val === "active"); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
        </Select>
      </div>
    </div>
  );
}
