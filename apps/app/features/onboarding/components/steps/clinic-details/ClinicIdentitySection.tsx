import { UseFormReturn } from "react-hook-form";
import { Input, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@workspace/ui/components/form/form-primitives"
import { Label, RadioGroup, RadioGroupItem } from "@workspace/ui/components";
import { CLINIC_TYPE_OPTIONS } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import { cn } from "@workspace/ui/lib/utils";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import { resolveFacilityTypeLabel } from "./clinic-details-utils";

const FACILITY_LABEL_OPTIONS = [
  { value: "CLINIC", label: "Clinic" },
  { value: "HOSPITAL", label: "Hospital" },
] as const;

const CLINIC_TYPE_VALUES = CLINIC_TYPE_OPTIONS.map((option) => option.value);

interface ClinicIdentitySectionProps {
  clinicForm: UseFormReturn<ClinicDetails>;
  facilityLabel: "Clinic" | "Hospital";
  shouldUseClinicTypeRadio: boolean;
}

export function ClinicIdentitySection({
  clinicForm,
  facilityLabel,
  shouldUseClinicTypeRadio,
}: ClinicIdentitySectionProps) {
  // Shared by the radio-group and select renderings of the clinic-type field
  // below — both need to parse the raw string value back into the enum and
  // commit it through the same `setValue` flags.
  const handleClinicTypeChange = (value: string) => {
    const parsed = parseStringEnumMember(CLINIC_TYPE_VALUES, value);
    if (!parsed) return;
    clinicForm.setValue("type", parsed, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="space-y-2 lg:order-1">
        <Label htmlFor="name">
          {facilityLabel} Name<span className="text-destructive ml-0.5">*</span>
        </Label>
        <Input
          id="name"
          {...clinicForm.register("name")}
          placeholder={`${facilityLabel} name`}
          aria-invalid={!!clinicForm.formState.errors.name}
          aria-describedby={
            clinicForm.formState.errors.name ? "clinic-name-error" : undefined
          }
        />
        {clinicForm.formState.errors.name && (
          <p id="clinic-name-error" className="text-sm text-destructive">
            {clinicForm.formState.errors.name.message}
          </p>
        )}
      </div>

      <div className="space-y-2 lg:order-3 lg:col-span-2">
        <Label htmlFor="facilityLabel">
          Display as<span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
          <RadioGroup
          id="facilityLabel"
          value={clinicForm.watch("facilityLabel") ?? "CLINIC"}
          onValueChange={(val) => {
            const nextLabel = parseStringEnumMember(
              FACILITY_LABEL_OPTIONS.map((option) => option.value),
              val,
            );
            if (!nextLabel) return;
            clinicForm.setValue("facilityLabel", nextLabel, {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
          }}
          className="grid grid-cols-2 gap-3 sm:min-w-[19rem]"
        >
          {FACILITY_LABEL_OPTIONS.map((option) => (
            <label
              key={option.value}
              htmlFor={`facility-label-${option.value}`}
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-sm font-medium transition-colors",
                clinicForm.watch("facilityLabel") === option.value &&
                  "border-primary bg-primary/5 text-primary",
              )}
            >
              <RadioGroupItem
                id={`facility-label-${option.value}`}
                value={option.value}
              />
              <span>{option.label}</span>
            </label>
          ))}
        </RadioGroup>
          <p className="text-xs text-muted-foreground sm:flex-1 sm:pt-1.5">
            Your organization label across the app — headings, patient-facing
            text, and invoices.
          </p>
        </div>
      </div>

      <div className="space-y-2 lg:order-2">
        <Label htmlFor="type">
          {facilityLabel} Type<span className="text-destructive ml-0.5">*</span>
        </Label>
        {shouldUseClinicTypeRadio ? (
          <RadioGroup
            id="type"
            value={clinicForm.watch("type") ?? ""}
            onValueChange={handleClinicTypeChange}
            className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            aria-invalid={!!clinicForm.formState.errors.type}
            aria-describedby={
              clinicForm.formState.errors.type
                ? "clinic-type-error"
                : undefined
            }
          >
            {CLINIC_TYPE_OPTIONS.map((option) => (
              <label
                key={option.value}
                htmlFor={`clinic-type-${option.value}`}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-lg border bg-background px-3 py-2.5 text-sm transition-colors",
                  clinicForm.watch("type") === option.value &&
                    "border-primary bg-primary/5 text-primary",
                )}
              >
                <RadioGroupItem
                  id={`clinic-type-${option.value}`}
                  value={option.value}
                />
                <span>
                  {resolveFacilityTypeLabel(option.label, facilityLabel)}
                </span>
              </label>
            ))}
          </RadioGroup>
        ) : (
          <Select
            onValueChange={handleClinicTypeChange}
            value={clinicForm.watch("type") ?? ""}
          >
            <SelectTrigger
              aria-invalid={!!clinicForm.formState.errors.type}
              aria-describedby={
                clinicForm.formState.errors.type
                  ? "clinic-type-error"
                  : undefined
              }
            >
              <SelectValue placeholder={`${facilityLabel} type`} />
            </SelectTrigger>
            <SelectContent>
              {CLINIC_TYPE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {resolveFacilityTypeLabel(option.label, facilityLabel)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {clinicForm.formState.errors.type && (
          <p id="clinic-type-error" className="text-sm text-destructive">
            {clinicForm.formState.errors.type.message}
          </p>
        )}
      </div>
    </div>
  );
}
