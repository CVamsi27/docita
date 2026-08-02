import { Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components";
import type { CreateClinicFormData, FieldErrors } from "../hooks/create-clinic-form-helpers";

const TIER_OPTIONS = ["STARTER", "ESSENTIAL", "PROFESSIONAL", "HOSPITAL", "ENTERPRISE"];

type Props = { formData: CreateClinicFormData; fieldErrors: FieldErrors; onFieldChange: (field: keyof CreateClinicFormData, value: string) => void; };

export function FacilityDetailsSection({ formData, fieldErrors, onFieldChange }: Props) {
  return (
    <div className="space-y-4">
      <h4 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Facility Details</h4>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2"><Label htmlFor="name">Facility Name</Label>
          <Input id="name" value={formData.name} onChange={(e) => { onFieldChange("name", e.target.value); }} aria-invalid={!!fieldErrors.name} />
          {fieldErrors.name && <p className="text-sm text-destructive">{fieldErrors.name}</p>}</div>
        <div className="space-y-2"><Label htmlFor="email">Email</Label>
          <Input id="email" type="email" value={formData.email} onChange={(e) => { onFieldChange("email", e.target.value); }} aria-invalid={!!fieldErrors.email} />
          {fieldErrors.email && <p className="text-sm text-destructive">{fieldErrors.email}</p>}</div>
        <div className="space-y-2"><Label htmlFor="phone">Phone</Label>
          <Input id="phone" type="tel" value={formData.phone} onChange={(e) => { onFieldChange("phone", e.target.value); }} aria-invalid={!!fieldErrors.phone} />
          {fieldErrors.phone && <p className="text-sm text-destructive">{fieldErrors.phone}</p>}</div>
        <div className="space-y-2"><Label htmlFor="address">Address</Label>
          <Input id="address" value={formData.address} onChange={(e) => { onFieldChange("address", e.target.value); }} aria-invalid={!!fieldErrors.address} />
          {fieldErrors.address && <p className="text-sm text-destructive">{fieldErrors.address}</p>}</div>
      </div>
      <div className="space-y-2"><Label htmlFor="tier">Tier</Label>
        <Select value={formData.tier} onValueChange={(v) => { onFieldChange("tier", v); }}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{TIER_OPTIONS.map((tier) => <SelectItem key={tier} value={tier}>{tier}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  );
}
