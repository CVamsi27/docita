import { UseFormReturn } from "react-hook-form";
import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@workspace/ui/components/select";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { CLINIC_TYPE_OPTIONS, type ClinicType } from "@workspace/types";
import PhoneInput from "react-phone-number-input";
import { cn } from "@workspace/ui/lib/utils";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import { ClinicAddressPickerDialog } from "@/features/onboarding/components/clinic-address-picker-dialog";

interface ClinicDetailsStepProps {
  clinicForm: UseFormReturn<ClinicDetails>;
  onSubmit: (data: ClinicDetails) => void;
}

export function ClinicDetailsStep({
  clinicForm,
  onSubmit,
}: ClinicDetailsStepProps) {
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Clinic Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          id="step1"
          onSubmit={clinicForm.handleSubmit(onSubmit)}
          noValidate
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Clinic Name<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="name"
                {...clinicForm.register("name")}
                placeholder="Enter clinic name"
                aria-invalid={!!clinicForm.formState.errors.name}
                aria-describedby={
                  clinicForm.formState.errors.name
                    ? "clinic-name-error"
                    : undefined
                }
              />
              {clinicForm.formState.errors.name && (
                <p id="clinic-name-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                Clinic Type<span className="text-destructive ml-0.5">*</span>
              </Label>
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
                  <SelectValue placeholder="Select clinic type" />
                </SelectTrigger>
                <SelectContent>
                  {CLINIC_TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {clinicForm.formState.errors.type && (
                <p id="clinic-type-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.type.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">
                Clinic Email<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                {...clinicForm.register("email")}
                placeholder="Enter clinic email address"
                aria-invalid={!!clinicForm.formState.errors.email}
                aria-describedby={
                  clinicForm.formState.errors.email
                    ? "clinic-email-error"
                    : undefined
                }
              />
              {clinicForm.formState.errors.email && (
                <p id="clinic-email-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number<span className="text-destructive ml-0.5">*</span>
              </Label>
              <PhoneInput
                id="phone"
                international
                defaultCountry={(clinicForm.watch("countryCode") as never) ?? "IN"}
                placeholder="Enter phone number"
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
                    shouldValidate: false,
                  });
                }}
                className={cn(
                  "flex h-11 items-center rounded-xl border border-input bg-background/50 px-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-within:ring-2 focus-within:ring-ring/50",
                  "[&_.PhoneInputCountry]:mr-2 [&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:items-center [&_.PhoneInputCountrySelect]:bg-transparent [&_.PhoneInputCountrySelect]:text-sm [&_.PhoneInputCountrySelect]:text-muted-foreground",
                  "[&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none",
                  clinicForm.formState.errors.phone &&
                    "border-destructive focus-within:ring-destructive/30",
                )}
                aria-invalid={!!clinicForm.formState.errors.phone}
                aria-describedby={
                  clinicForm.formState.errors.phone
                    ? "clinic-phone-error"
                    : undefined
                }
              />
              {clinicForm.formState.errors.phone && (
                <p id="clinic-phone-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.phone.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="address">
                  Address<span className="text-destructive ml-0.5">*</span>
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8"
                  onClick={() => setMapPickerOpen(true)}
                >
                  Choose on map
                </Button>
              </div>
              <Input
                id="address"
                {...clinicForm.register("address")}
                placeholder="Enter clinic address"
                aria-invalid={!!clinicForm.formState.errors.address}
                aria-describedby={
                  clinicForm.formState.errors.address
                    ? "clinic-address-error"
                    : undefined
                }
              />
              {clinicForm.formState.errors.address && (
                <p id="clinic-address-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.address.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...clinicForm.register("website")}
                placeholder="Enter website URL"
                aria-invalid={!!clinicForm.formState.errors.website}
                aria-describedby={
                  clinicForm.formState.errors.website
                    ? "clinic-website-error"
                    : undefined
                }
              />
              {clinicForm.formState.errors.website && (
                <p id="clinic-website-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.website.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="gstin">GSTIN for invoices</Label>
              <Input
                id="gstin"
                {...clinicForm.register("gstin")}
                placeholder="27ABCDE1234F1Z5"
                aria-invalid={!!clinicForm.formState.errors.gstin}
                aria-describedby={
                  clinicForm.formState.errors.gstin
                    ? "clinic-gstin-error"
                    : "clinic-gstin-help"
                }
                className={cn(
                  clinicForm.formState.errors.gstin &&
                    "border-destructive focus-visible:ring-destructive/30",
                  clinicForm.formState.errors.gstin && "focus-visible:ring-2",
                )}
              />
              {clinicForm.formState.errors.gstin ? (
                <p id="clinic-gstin-error" className="text-sm text-destructive">
                  {clinicForm.formState.errors.gstin.message}
                </p>
              ) : (
                <p id="clinic-gstin-help" className="text-xs text-muted-foreground">
                  Required for GST invoices before charging paid Indian plans.
                </p>
              )}
            </div>
          </div>
        </form>
      </CardContent>
      <CardFooter>
        <Button className="w-full" form="step1" type="submit">
          Next: Choose Plan
        </Button>
      </CardFooter>

      <ClinicAddressPickerDialog
        open={mapPickerOpen}
        onOpenChange={setMapPickerOpen}
        initialAddress={clinicForm.watch("address") ?? ""}
        onConfirm={({ address }) => {
          clinicForm.setValue("address", address, {
            shouldDirty: true,
            shouldTouch: true,
            shouldValidate: true,
          });
        }}
      />
    </Card>
  );
}
