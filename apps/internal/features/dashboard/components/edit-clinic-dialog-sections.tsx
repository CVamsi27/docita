"use client";

import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import PhoneInput, { type Country } from "react-phone-number-input";
import {
  CLINIC_TYPE_OPTIONS,
  type ClinicType,
  clinicTypeSchema,
  PUBLISHED_PLAN_LADDER,
  TIER_INFO,
  type TierName,
  tierSchema,
} from "@workspace/types";
import { CLINIC_TYPE_DESCRIPTIONS } from "@/lib/clinic-display";

export type EditClinicFormData = {
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-name">Facility Name</Label>
          <Input
            id="edit-name"
            value={formData.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={
              fieldErrors.name ? "edit-clinic-name-error" : undefined
            }
          />
          {fieldErrors.name && (
            <p
              id="edit-clinic-name-error"
              className="text-sm text-destructive"
            >
              {fieldErrors.name}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-email">Email</Label>
          <Input
            id="edit-email"
            type="email"
            value={formData.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={
              fieldErrors.email ? "edit-clinic-email-error" : undefined
            }
          />
          {fieldErrors.email && (
            <p
              id="edit-clinic-email-error"
              className="text-sm text-destructive"
            >
              {fieldErrors.email}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="edit-phone">Phone</Label>
          <PhoneInput
            id="edit-phone"
            value={formData.phone}
            international
            defaultCountry={phoneCountryCode}
            onChange={(value: string | undefined) => {
              onFieldChange("phone", value ?? "");
            }}
            placeholder="Enter phone number"
            className="flex min-h-[5rem] min-w-0 flex-col gap-2 rounded-[var(--radius)] border border-input bg-background/60 p-3 text-sm shadow-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/50 sm:flex-row sm:items-center sm:gap-3 sm:min-h-10 [&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:w-full [&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountry]:items-center sm:[&_.PhoneInputCountry]:w-[9.5rem] [&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputCountrySelect]:rounded-[var(--radius)] [&_.PhoneInputCountrySelect]:bg-background [&_.PhoneInputCountrySelect]:text-sm [&_.PhoneInputCountrySelect]:text-muted-foreground sm:[&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none"
            aria-invalid={!!fieldErrors.phone}
            aria-describedby={
              fieldErrors.phone ? "edit-clinic-phone-error" : undefined
            }
          />
          {fieldErrors.phone && (
            <p
              id="edit-clinic-phone-error"
              className="text-sm text-destructive"
            >
              {fieldErrors.phone}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-tier">Subscription Tier</Label>
          <Select
            value={formData.tier}
            onValueChange={(val) => {
              const parsed = tierSchema.safeParse(val);
              if (!parsed.success) return;
              onFieldChange("tier", parsed.data);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              {PUBLISHED_PLAN_LADDER.map((tier) => (
                <SelectItem key={tier} value={tier}>
                  {TIER_INFO[tier].name.replace("Docita ", "")} (
                  {TIER_INFO[tier].tagline})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-type">Clinic Type</Label>
        <Select
          value={formData.type}
          onValueChange={(val) => {
            const parsed = clinicTypeSchema.safeParse(val);
            if (!parsed.success) return;
            onFieldChange("type", parsed.data);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Facility type" />
          </SelectTrigger>
          <SelectContent>
            {CLINIC_TYPE_OPTIONS.map((type) => (
              <SelectItem key={type.value} value={type.value}>
                <div className="flex flex-col">
                  <span className="font-medium">{type.label}</span>
                  {CLINIC_TYPE_DESCRIPTIONS[type.value] ? (
                    <span className="text-xs text-muted-foreground">
                      {CLINIC_TYPE_DESCRIPTIONS[type.value]}
                    </span>
                  ) : null}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-address">Address</Label>
        <Input
          id="edit-address"
          value={formData.address}
          onChange={(e) => onFieldChange("address", e.target.value)}
          aria-invalid={!!fieldErrors.address}
          aria-describedby={
            fieldErrors.address ? "edit-clinic-address-error" : undefined
          }
        />
        {fieldErrors.address && (
          <p
            id="edit-clinic-address-error"
            className="text-sm text-destructive"
          >
            {fieldErrors.address}
          </p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="edit-active">Status</Label>
        <Select
          value={formData.active ? "active" : "inactive"}
          onValueChange={(val) =>
            onFieldChange("active", val === "active")
          }
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
