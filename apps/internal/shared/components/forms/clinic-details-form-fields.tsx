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

/**
 * Shared clinic-details field primitives used by both the "create clinic"
 * facility-details section and the "edit clinic" details section. The two
 * forms render the same name/email/phone/tier/type/address inputs — only the
 * element ids, error-message ids, and (for phone) the default-country source
 * differ between create and edit, which is why each field takes explicit
 * `id`/`errorId` props rather than deriving them internally.
 */

const PHONE_INPUT_CLASS_NAME =
  "flex min-h-[5rem] min-w-0 flex-col gap-2 rounded-[var(--radius)] border border-input bg-background/60 p-3 text-sm shadow-sm transition-colors focus-within:outline-none focus-within:ring-2 focus-within:ring-ring/50 sm:flex-row sm:items-center sm:gap-3 sm:min-h-10 [&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:w-full [&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountry]:items-center sm:[&_.PhoneInputCountry]:w-[9.5rem] [&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputCountrySelect]:rounded-[var(--radius)] [&_.PhoneInputCountrySelect]:bg-background [&_.PhoneInputCountrySelect]:text-sm [&_.PhoneInputCountrySelect]:text-muted-foreground sm:[&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none";

interface FieldErrorMessageProps {
  id: string;
  message?: string;
}

function FieldErrorMessage({ id, message }: FieldErrorMessageProps) {
  if (!message) return null;

  return (
    <p id={id} className="text-sm text-destructive">
      {message}
    </p>
  );
}

interface ClinicTextInputFieldProps {
  id: string;
  label: string;
  errorId: string;
  value: string;
  error?: string;
  type?: string;
  onChange: (value: string) => void;
}

export function ClinicTextInputField({
  id,
  label,
  errorId,
  value,
  error,
  type,
  onChange,
}: ClinicTextInputFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      <FieldErrorMessage id={errorId} message={error} />
    </div>
  );
}

interface ClinicPhoneFieldProps {
  id: string;
  errorId: string;
  value: string;
  defaultCountry: Country;
  error?: string;
  onChange: (value: string) => void;
}

export function ClinicPhoneField({
  id,
  errorId,
  value,
  defaultCountry,
  error,
  onChange,
}: ClinicPhoneFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Phone</Label>
      <PhoneInput
        id={id}
        value={value}
        international
        defaultCountry={defaultCountry}
        onChange={(value: string | undefined) => onChange(value ?? "")}
        placeholder="Enter phone number"
        className={PHONE_INPUT_CLASS_NAME}
        aria-invalid={!!error}
        aria-describedby={error ? errorId : undefined}
      />
      <FieldErrorMessage id={errorId} message={error} />
    </div>
  );
}

interface ClinicTierSelectFieldProps {
  id: string;
  value: TierName;
  onChange: (tier: TierName) => void;
}

export function ClinicTierSelectField({
  id,
  value,
  onChange,
}: ClinicTierSelectFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Subscription Tier</Label>
      <Select
        value={value}
        onValueChange={(val) => {
          const parsed = tierSchema.safeParse(val);
          if (!parsed.success) return;
          onChange(parsed.data);
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
  );
}

interface ClinicTypeSelectFieldProps {
  id: string;
  value: ClinicType;
  onChange: (type: ClinicType) => void;
}

export function ClinicTypeSelectField({
  id,
  value,
  onChange,
}: ClinicTypeSelectFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>Clinic Type</Label>
      <Select
        value={value}
        onValueChange={(val) => {
          const parsed = clinicTypeSchema.safeParse(val);
          if (!parsed.success) return;
          onChange(parsed.data);
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
  );
}

/** Fields shared by both clinic forms — name/email/phone/tier/type/address. */
export type ClinicCoreField =
  | "name"
  | "email"
  | "phone"
  | "address"
  | "tier"
  | "type";

export type ClinicCoreFormData = {
  name: string;
  email: string;
  phone: string;
  address: string;
  tier: TierName;
  type: ClinicType;
};

export type ClinicCoreFieldErrors = {
  name?: string;
  email?: string;
  phone?: string;
  address?: string;
};

interface ClinicCoreDetailsFieldsProps {
  /** Prefixed onto each input's `id` (e.g. `"edit-"` or `""`). */
  idPrefix: string;
  /** Prefixed onto each error message's `id` (e.g. `"edit-clinic"` or `"create-clinic"`). */
  errorIdPrefix: string;
  formData: ClinicCoreFormData;
  fieldErrors: ClinicCoreFieldErrors;
  defaultCountry: Country;
  onFieldChange: (field: ClinicCoreField, value: string) => void;
}

/**
 * Renders the full name/email/phone/tier/type/address field set shared by the
 * "create clinic" facility-details section and the "edit clinic" details
 * section. Both forms lay these fields out identically — only element ids,
 * error-message ids, and the phone default-country source differ — so this
 * single component is the canonical layout and each caller only supplies its
 * id prefixes and data plumbing.
 */
export function ClinicCoreDetailsFields({
  idPrefix,
  errorIdPrefix,
  formData,
  fieldErrors,
  defaultCountry,
  onFieldChange,
}: ClinicCoreDetailsFieldsProps) {
  const fieldId = (field: ClinicCoreField) => `${idPrefix}${field}`;
  const errorId = (field: ClinicCoreField) => `${errorIdPrefix}-${field}-error`;

  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <ClinicTextInputField
          id={fieldId("name")}
          errorId={errorId("name")}
          label="Facility Name"
          value={formData.name}
          error={fieldErrors.name}
          onChange={(value) => onFieldChange("name", value)}
        />
        <ClinicTextInputField
          id={fieldId("email")}
          errorId={errorId("email")}
          label="Email"
          type="email"
          value={formData.email}
          error={fieldErrors.email}
          onChange={(value) => onFieldChange("email", value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <ClinicPhoneField
          id={fieldId("phone")}
          errorId={errorId("phone")}
          value={formData.phone}
          defaultCountry={defaultCountry}
          error={fieldErrors.phone}
          onChange={(value) => onFieldChange("phone", value)}
        />
        <ClinicTierSelectField
          id={fieldId("tier")}
          value={formData.tier}
          onChange={(tier) => onFieldChange("tier", tier)}
        />
      </div>
      <ClinicTypeSelectField
        id={fieldId("type")}
        value={formData.type}
        onChange={(type) => onFieldChange("type", type)}
      />
      <ClinicTextInputField
        id={fieldId("address")}
        errorId={errorId("address")}
        label="Address"
        value={formData.address}
        error={fieldErrors.address}
        onChange={(value) => onFieldChange("address", value)}
      />
    </>
  );
}
