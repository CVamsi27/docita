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
import {
  DEFAULT_COUNTRY_CODE,
  normalizeCountryCode,
} from "@workspace/utils";
import type { Country } from "react-phone-number-input";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import {
  ClinicAddressPickerDialog,
  type ClinicAddressSelection,
} from "@/features/onboarding/components/clinic-address-picker-dialog";

function hasText(value: string | undefined | null): value is string {
  return Boolean(value?.trim());
}

function composeClinicAddress(values: Partial<ClinicDetails>): string {
  const countryCode =
    normalizeCountryCode(values.countryCode) ?? DEFAULT_COUNTRY_CODE;
  const addressParts = [
    values.addressLine1?.trim(),
    values.addressLine2?.trim(),
    values.city?.trim(),
    values.state?.trim(),
    values.pincode?.trim(),
  ].filter(hasText);

  if (addressParts.length === 0) {
    return values.address?.trim() ?? "";
  }

  return [...addressParts, countryCode].join(", ");
}

function applyClinicAddressSelection(
  clinicForm: UseFormReturn<ClinicDetails>,
  selection: ClinicAddressSelection,
) {
  const details = selection.details;

  if (details) {
    clinicForm.setValue("addressLine1", details.addressLine1 ?? "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    clinicForm.setValue("addressLine2", details.addressLine2 ?? "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    clinicForm.setValue("city", details.city ?? "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    clinicForm.setValue("state", details.state ?? "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    clinicForm.setValue("pincode", details.pincode ?? "", {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
    if (details.countryCode) {
      clinicForm.setValue("countryCode", details.countryCode, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: false,
      });
    }
  } else {
    clinicForm.setValue("addressLine1", selection.address, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  }

  clinicForm.setValue("address", selection.address, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
}

interface ClinicDetailsStepProps {
  clinicForm: UseFormReturn<ClinicDetails>;
  onSubmit: (data: ClinicDetails) => void;
}

export function ClinicDetailsStep({
  clinicForm,
  onSubmit,
}: ClinicDetailsStepProps) {
  const [mapPickerOpen, setMapPickerOpen] = useState(false);
  const facilityLabel =
    clinicForm.watch("facilityLabel") === "HOSPITAL" ? "Hospital" : "Clinic";
  const [
    watchedAddressLine1,
    watchedAddressLine2,
    watchedCity,
    watchedState,
    watchedPincode,
    watchedCountryCode,
  ] = clinicForm.watch([
    "addressLine1",
    "addressLine2",
    "city",
    "state",
    "pincode",
    "countryCode",
  ]);

  const resolvedCountryCode =
    normalizeCountryCode(watchedCountryCode) ?? DEFAULT_COUNTRY_CODE;
  const addressSummary = composeClinicAddress({
    addressLine1: watchedAddressLine1,
    addressLine2: watchedAddressLine2,
    city: watchedCity,
    state: watchedState,
    pincode: watchedPincode,
    countryCode: resolvedCountryCode,
    address: clinicForm.watch("address"),
  });

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-xl sm:text-2xl">
          Step 1: {facilityLabel} Details
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Start with the basics, then confirm your exact {facilityLabel.toLowerCase()} location
        </p>
      </CardHeader>
      <CardContent>
        <form
          id="step1"
          onSubmit={clinicForm.handleSubmit((data) =>
            onSubmit({
              ...data,
              address: composeClinicAddress(data),
            }),
          )}
          noValidate
          className="space-y-6"
        >
          <div className="grid grid-cols-1 gap-4 rounded-2xl border bg-muted/20 p-4 shadow-sm lg:grid-cols-3">
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
              <Label htmlFor="facilityLabel">
                Display as<span className="text-destructive ml-0.5">*</span>
              </Label>
              <Select
                value={clinicForm.watch("facilityLabel") ?? "CLINIC"}
                onValueChange={(val) =>
                  clinicForm.setValue(
                    "facilityLabel",
                    val as "CLINIC" | "HOSPITAL",
                    {
                      shouldDirty: true,
                      shouldTouch: true,
                      shouldValidate: true,
                    },
                  )
                }
              >
                <SelectTrigger id="facilityLabel">
                  <SelectValue placeholder="Select display label" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CLINIC">Clinic</SelectItem>
                  <SelectItem value="HOSPITAL">Hospital</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Controls whether the app shows {facilityLabel} or Hospital in key
                headings
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">
                {facilityLabel} Type<span className="text-destructive ml-0.5">*</span>
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
                  <SelectValue placeholder="Select facility type" />
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

          <div className="grid grid-cols-1 gap-4 rounded-2xl border bg-muted/20 p-4 shadow-sm lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
            <div className="space-y-2">
              <Label htmlFor="phone">
                Phone Number<span className="text-destructive ml-0.5">*</span>
              </Label>
              <PhoneInput
                id="phone"
                international
                defaultCountry={(
                  normalizeCountryCode(clinicForm.watch("countryCode")) ??
                  DEFAULT_COUNTRY_CODE
                ) as Country}
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
                    shouldValidate: false,
                  });
                }}
                className={cn(
                  "flex min-h-[5.25rem] min-w-0 flex-col gap-2 rounded-2xl border border-input bg-background/60 p-3 text-sm shadow-xs transition-[color,box-shadow] outline-none focus-within:ring-2 focus-within:ring-ring/50 sm:flex-row sm:items-center sm:gap-3 sm:min-h-11",
                  "[&_.PhoneInputCountry]:flex [&_.PhoneInputCountry]:w-full [&_.PhoneInputCountry]:shrink-0 [&_.PhoneInputCountry]:items-center sm:[&_.PhoneInputCountry]:w-[11rem]",
                  "[&_.PhoneInputCountrySelect]:w-full [&_.PhoneInputCountrySelect]:rounded-lg [&_.PhoneInputCountrySelect]:bg-background [&_.PhoneInputCountrySelect]:text-sm [&_.PhoneInputCountrySelect]:text-muted-foreground sm:[&_.PhoneInputCountrySelect]:w-full",
                  "[&_.PhoneInputInput]:min-w-0 [&_.PhoneInputInput]:w-full [&_.PhoneInputInput]:flex-1 [&_.PhoneInputInput]:bg-transparent [&_.PhoneInputInput]:outline-none",
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
              {!clinicForm.formState.errors.phone && (
                <p className="text-xs text-muted-foreground">
                  Validation changes automatically based on your selected
                  country
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{facilityLabel} Email</Label>
              <Input
                id="email"
                type="email"
                {...clinicForm.register("email")}
                placeholder={`${facilityLabel} email address`}
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
          </div>

          <div className="rounded-2xl border bg-muted/20 p-4 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1">
                <Label className="text-base font-semibold" htmlFor="addressLine1">
                  Address
                </Label>
                <p className="text-xs text-muted-foreground">
                  Use a structured address so it adapts cleanly across regions
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 rounded-xl sm:self-start"
                onClick={() => setMapPickerOpen(true)}
              >
                Open map picker
              </Button>
            </div>

            <div className="mt-4 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="addressLine1">
                  Address Line 1<span className="text-destructive ml-0.5">*</span>
                </Label>
                <Input
                  id="addressLine1"
                  {...clinicForm.register("addressLine1")}
                  placeholder="House or building number, street"
                  aria-invalid={!!clinicForm.formState.errors.addressLine1}
                  aria-describedby={
                    clinicForm.formState.errors.addressLine1
                      ? "clinic-address-line1-error"
                      : undefined
                  }
                />
                {clinicForm.formState.errors.addressLine1 && (
                  <p
                    id="clinic-address-line1-error"
                    className="text-sm text-destructive"
                  >
                    {clinicForm.formState.errors.addressLine1.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input
                  id="addressLine2"
                  {...clinicForm.register("addressLine2")}
                  placeholder="Apartment, landmark, or locality"
                  aria-invalid={!!clinicForm.formState.errors.addressLine2}
                  aria-describedby={
                    clinicForm.formState.errors.addressLine2
                      ? "clinic-address-line2-error"
                      : undefined
                  }
                />
                {clinicForm.formState.errors.addressLine2 && (
                  <p
                    id="clinic-address-line2-error"
                    className="text-sm text-destructive"
                  >
                    {clinicForm.formState.errors.addressLine2.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="city">
                    City<span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <Input
                    id="city"
                    {...clinicForm.register("city")}
                    placeholder="City"
                    aria-invalid={!!clinicForm.formState.errors.city}
                    aria-describedby={
                      clinicForm.formState.errors.city
                        ? "clinic-city-error"
                        : undefined
                    }
                  />
                  {clinicForm.formState.errors.city && (
                    <p id="clinic-city-error" className="text-sm text-destructive">
                      {clinicForm.formState.errors.city.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="state">
                    State / Province
                    <span className="text-destructive ml-0.5">*</span>
                  </Label>
                  <Input
                    id="state"
                    {...clinicForm.register("state")}
                    placeholder="State or province"
                    aria-invalid={!!clinicForm.formState.errors.state}
                    aria-describedby={
                      clinicForm.formState.errors.state
                        ? "clinic-state-error"
                        : undefined
                    }
                  />
                  {clinicForm.formState.errors.state && (
                    <p id="clinic-state-error" className="text-sm text-destructive">
                      {clinicForm.formState.errors.state.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="countryCode">Country</Label>
                  <Input
                    id="countryCode"
                    readOnly
                    value={resolvedCountryCode}
                    className="bg-background/60"
                    aria-describedby="clinic-country-help"
                  />
                  <p id="clinic-country-help" className="text-xs text-muted-foreground">
                    Synced with the phone country selection
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="pincode">Postal Code / Pincode</Label>
                  <Input
                    id="pincode"
                    {...clinicForm.register("pincode")}
                    placeholder="Postal code or pincode"
                    aria-invalid={!!clinicForm.formState.errors.pincode}
                    aria-describedby={
                      clinicForm.formState.errors.pincode
                        ? "clinic-pincode-error"
                        : undefined
                    }
                  />
                  {clinicForm.formState.errors.pincode && (
                    <p
                      id="clinic-pincode-error"
                      className="text-sm text-destructive"
                    >
                      {clinicForm.formState.errors.pincode.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border bg-background/70 px-4 py-3">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Address preview
                </p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  {addressSummary || "Your structured address will appear here"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 rounded-2xl border bg-muted/20 p-4 shadow-sm md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                {...clinicForm.register("website")}
                placeholder="Website URL"
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
                  Required for GST invoices before charging paid Indian plans
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
        initialAddress={addressSummary}
        onConfirm={(selection) => {
          applyClinicAddressSelection(clinicForm, selection);
        }}
      />
    </Card>
  );
}
