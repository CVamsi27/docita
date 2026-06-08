"use client";

import { IsoDatePickerField } from "@workspace/ui/components/form/iso-date-picker-field";
import { cn } from "@workspace/ui/lib/utils";

export interface ContactDateOfBirthFieldProps {
  value: string;
  error?: string;
  onValueChange: (iso: string) => void;
}

/**
 * Date-of-birth picker + inline error for the new-patient contact section —
 * split out from `ContactSectionNewPatient` because `IsoDatePickerField`
 * isn't compatible with the generic `ContactTextField` wrapper (it owns its
 * own label/required-mark and exposes a different change signature).
 */
export function ContactDateOfBirthField({
  value,
  error,
  onValueChange,
}: ContactDateOfBirthFieldProps) {
  return (
    <div className="sm:col-span-2">
      <IsoDatePickerField
        id="pb-date-of-birth"
        label="Date of birth"
        requiredMark
        value={value}
        onChange={onValueChange}
        placeholder="Select date of birth"
        required
        triggerClassName={cn("w-full sm:w-full", error && "border-destructive")}
      />
      {error ? (
        <p
          id="pb-date-of-birth-error"
          role="alert"
          className="mt-1 text-[length:var(--fs-xs)] leading-snug text-destructive"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
