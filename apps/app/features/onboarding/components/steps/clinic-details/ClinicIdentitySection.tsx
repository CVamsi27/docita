import { UseFormReturn } from "react-hook-form";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import {
  RadioGroup,
  RadioGroupItem,
} from "@workspace/ui/components/form/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/form/select";
import { CLINIC_TYPE_OPTIONS, type ClinicType } from "@workspace/types";
import { cn } from "@workspace/ui/lib/utils";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import { resolveFacilityTypeLabel } from "./clinic-details-utils";

const FACILITY_LABEL_OPTIONS = [
  { value: "CLINIC", label: "Clinic" },
  { value: "HOSPITAL", label: "Hospital" },
] as const;

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
  return (
    <div className="grid grid-cols-1 gap-4 rounded-lg border bg-muted/20 p-4 shadow-sm lg:grid-cols-3">
      <div className="space-y-2">
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

      <div className="space-y-2">
        <Label htmlFor="facilityLabel">
          Display as<span className="text-destructive ml-0.5">*</span>
        </Label>
        <RadioGroup
          id="facilityLabel"
          value={clinicForm.watch("facilityLabel") ?? "CLINIC"}
          onValueChange={(val) =>
            clinicForm.setValue("facilityLabel", val as "CLINIC" | "HOSPITAL", {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          className="grid grid-cols-2 gap-3"
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
        <p className="text-xs text-muted-foreground">
          This sets your organization label across the product. We use it in
          page headings, onboarding copy, patient-facing text, and invoice/PDF
          clinic naming.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="type">
          {facilityLabel} Type<span className="text-destructive ml-0.5">*</span>
        </Label>
        {shouldUseClinicTypeRadio ? (
          <RadioGroup
            id="type"
            value={clinicForm.watch("type") ?? ""}
            onValueChange={(val) =>
              clinicForm.setValue("type", val as ClinicType, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
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
            onValueChange={(val) =>
              clinicForm.setValue("type", val as ClinicType, {
                shouldDirty: true,
                shouldTouch: true,
                shouldValidate: true,
              })
            }
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
