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
import PhoneInput from "react-phone-number-input";
import {
  CLINIC_TYPE_OPTIONS,
  clinicTypeSchema,
  PUBLISHED_PLAN_LADDER,
  TIER_INFO,
  tierSchema,
} from "@workspace/types";
import { DEFAULT_COUNTRY_CODE } from "@workspace/utils";
import { CLINIC_TYPE_DESCRIPTIONS } from "@/lib/clinic-display";
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Facility Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            aria-invalid={!!fieldErrors.name}
            aria-describedby={
              fieldErrors.name ? "create-clinic-name-error" : undefined
            }
          />
          {fieldErrors.name && (
            <p
              id="create-clinic-name-error"
              className="text-sm text-destructive"
            >
              {fieldErrors.name}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => onFieldChange("email", e.target.value)}
            aria-invalid={!!fieldErrors.email}
            aria-describedby={
              fieldErrors.email ? "create-clinic-email-error" : undefined
            }
          />
          {fieldErrors.email && (
            <p
              id="create-clinic-email-error"
              className="text-sm text-destructive"
            >
              {fieldErrors.email}
            </p>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Phone</Label>
          <PhoneInput
            id="phone"
            value={formData.phone}
            international
            defaultCountry={DEFAULT_COUNTRY_CODE}
            onChange={(value: string | undefined) =>
              onFieldChange("phone", value ?? "")
            }
            placeholder="Enter phone number"
            className="flex min-h-[5rem] min-w-0 flex-col gap-2 rounded-[var(--radius)] border border-input bg-background/60 p-3 text-sm shadow-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/50 sm:flex-row sm:items-center sm:gap-3 sm:min-h-10 [&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:w-full [&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountry]:items-center sm:[&_.PhoneInputCountry]:w-[9.5rem] [&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputCountrySelect]:rounded-[var(--radius)] [&_.PhoneInputCountrySelect]:bg-background [&_.PhoneInputCountrySelect]:text-sm [&_.PhoneInputCountrySelect]:text-muted-foreground sm:[&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none"
            aria-invalid={!!fieldErrors.phone}
            aria-describedby={
              fieldErrors.phone ? "create-clinic-phone-error" : undefined
            }
          />
          {fieldErrors.phone && (
            <p
              id="create-clinic-phone-error"
              className="text-sm text-destructive"
            >
              {fieldErrors.phone}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="tier">Subscription Tier</Label>
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
        <Label htmlFor="type">Clinic Type</Label>
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
        <Label htmlFor="address">Address</Label>
        <Input
          id="address"
          value={formData.address}
          onChange={(e) => onFieldChange("address", e.target.value)}
          aria-invalid={!!fieldErrors.address}
          aria-describedby={
            fieldErrors.address ? "create-clinic-address-error" : undefined
          }
        />
        {fieldErrors.address && (
          <p
            id="create-clinic-address-error"
            className="text-sm text-destructive"
          >
            {fieldErrors.address}
          </p>
        )}
      </div>
    </div>
  );
}
