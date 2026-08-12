"use client";

import type { UseFormReturn } from "react-hook-form";
import { Input, Label } from "@workspace/ui/components";
import PhoneInput from "react-phone-number-input";
import { cn } from "@workspace/ui/lib/utils";
import { resolveLibPhoneCountryFromCode } from "@/lib/phone/libphone-country.boundary";
import type { ClinicDetails } from "@/features/setup/components/onboarding/types";

interface ClinicContactSectionProps {
  clinicForm: UseFormReturn<ClinicDetails>;
  facilityLabel: "Clinic" | "Hospital";
}

export function ClinicContactSection({
  clinicForm,
  facilityLabel,
}: ClinicContactSectionProps) {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
      <div className="space-y-2">
        <Label htmlFor="phone">
          Phone Number<span className="text-destructive ml-0.5">*</span>
        </Label>
        <PhoneInput
          id="phone"
          international
          defaultCountry={resolveLibPhoneCountryFromCode(
            clinicForm.watch("countryCode"),
          )}
          placeholder="Phone number"
          value={clinicForm.watch("phone") ?? ""}
          onChange={(value) =>
            clinicForm.setValue("phone", value ?? "", {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            })
          }
          onCountryChange={(country) => {
            if (!country) return;
            clinicForm.setValue("countryCode", country.toUpperCase(), {
              shouldDirty: true,
              shouldTouch: true,
              shouldValidate: true,
            });
            void clinicForm.trigger("phone");
          }}
          className={cn(
            "flex min-h-[5.25rem] min-w-0 flex-col gap-2 rounded-lg border border-input bg-background/60 p-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-within:ring-2 focus-within:ring-ring/50 sm:flex-row sm:items-center sm:gap-3 sm:min-h-11",
            "[&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:w-full [&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountry]:items-center sm:[&_.PhoneInputCountry]:w-[11rem]",
            "[&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputCountrySelect]:rounded-lg [&_.PhoneInputCountrySelect]:bg-background [&_.PhoneInputCountrySelect]:text-sm [&_.PhoneInputCountrySelect]:text-muted-foreground sm:[&_.PhoneInputCountrySelect]:w-full",
            "[&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none",
            clinicForm.formState.errors.phone &&
              "border-destructive focus-within:ring-destructive/30",
          )}
          aria-invalid={!!clinicForm.formState.errors.phone}
          aria-describedby={
            clinicForm.formState.errors.phone ? "clinic-phone-error" : undefined
          }
        />
        {clinicForm.formState.errors.phone && (
          <p id="clinic-phone-error" className="text-sm text-destructive">
            {clinicForm.formState.errors.phone.message}
          </p>
        )}
        {!clinicForm.formState.errors.phone && (
          <p className="text-xs text-muted-foreground">
            Validation changes automatically based on your selected country
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">{facilityLabel} Email</Label>
        <Input
          id="email"
          type="email"
          {...clinicForm.register("email")}
          placeholder="Email"
          aria-invalid={!!clinicForm.formState.errors.email}
          aria-describedby={
            clinicForm.formState.errors.email ? "clinic-email-error" : undefined
          }
        />
        {clinicForm.formState.errors.email && (
          <p id="clinic-email-error" className="text-sm text-destructive">
            {clinicForm.formState.errors.email.message}
          </p>
        )}
      </div>
    </div>
  );
}
