"use client";

import type { UseFormReturn } from "react-hook-form";
import { Check, MapPin } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { cn } from "@workspace/ui/lib/utils";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import { applyMapsLinkLocation } from "./clinic-details-utils";

export interface ClinicAddressHeaderProps {
  isPinned: boolean;
  onOpenMapPicker: () => void;
  mapsLocationError?: string;
}

export function ClinicAddressHeader({
  isPinned,
  onOpenMapPicker,
  mapsLocationError,
}: ClinicAddressHeaderProps) {
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Label className="text-base font-semibold" htmlFor="addressLine1">
            Address
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            Use a structured address so it adapts cleanly across regions
          </p>
        </div>
        <Button
          type="button"
          variant={isPinned ? "outline" : "default"}
          size="sm"
          className={cn(
            "h-9 rounded-lg sm:self-start",
            !isPinned && !!mapsLocationError && "ring-2 ring-destructive/40",
          )}
          onClick={onOpenMapPicker}
          aria-invalid={!isPinned && !!mapsLocationError}
        >
          {isPinned ? (
            <>
              <Check className="h-4 w-4" aria-hidden />
              Location pinned
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" aria-hidden />
              Pin on map
            </>
          )}
        </Button>
      </div>
      {!isPinned ? (
        <p
          className={cn(
            "mt-2 text-xs",
            mapsLocationError ? "text-destructive" : "text-muted-foreground",
          )}
          role={mapsLocationError ? "alert" : undefined}
        >
          {mapsLocationError ??
            "Required — pin the clinic on the map so patients can navigate to you."}
        </p>
      ) : null}
    </>
  );
}

export interface AddressLine1FieldProps {
  clinicForm: UseFormReturn<ClinicDetails>;
}

export function AddressLine1Field({ clinicForm }: AddressLine1FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="addressLine1">
        Address Line 1<span className="text-destructive ml-0.5">*</span>
      </Label>
      <Input
        id="addressLine1"
        {...clinicForm.register("addressLine1")}
        placeholder="Address line 1"
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
  );
}

export interface AddressLine2FieldProps {
  clinicForm: UseFormReturn<ClinicDetails>;
}

export function AddressLine2Field({ clinicForm }: AddressLine2FieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="addressLine2">Address Line 2</Label>
      <Input
        id="addressLine2"
        {...clinicForm.register("addressLine2")}
        placeholder="Address line 2"
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
  );
}

export interface CityStateFieldsProps {
  clinicForm: UseFormReturn<ClinicDetails>;
}

export function CityStateFields({ clinicForm }: CityStateFieldsProps) {
  return (
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
          placeholder="State"
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
  );
}

export interface CountryPostalFieldsProps {
  clinicForm: UseFormReturn<ClinicDetails>;
  resolvedCountryCode: string;
}

export function CountryPostalFields({
  clinicForm,
  resolvedCountryCode,
}: CountryPostalFieldsProps) {
  return (
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
        <p
          id="clinic-country-help"
          className="text-xs text-muted-foreground"
        >
          Synced with the phone country selection
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pincode">Postal Code / Pincode</Label>
        <Input
          id="pincode"
          {...clinicForm.register("pincode")}
          placeholder="Postal code"
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
  );
}

export interface AddressPreviewProps {
  addressSummary: string;
}

export function AddressPreview({ addressSummary }: AddressPreviewProps) {
  return (
    <div className="rounded-lg border bg-background/70 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Address preview
      </p>
      <p className="mt-2 text-sm leading-6 text-foreground">
        {addressSummary || "Your structured address will appear here"}
      </p>
    </div>
  );
}

export interface GoogleMapsLinkFieldProps {
  clinicForm: UseFormReturn<ClinicDetails>;
}

export function GoogleMapsLinkField({ clinicForm }: GoogleMapsLinkFieldProps) {
  const registration = clinicForm.register("mapsLink");
  return (
    <div className="space-y-2">
      <Label htmlFor="mapsLink">Google Maps link</Label>
      <Input
        id="mapsLink"
        type="url"
        inputMode="url"
        autoComplete="url"
        {...registration}
        onChange={(event) => {
          registration.onChange(event);
          // If the pasted link carries coordinates, use them as the map pin.
          applyMapsLinkLocation(clinicForm, event.target.value);
        }}
        onBlur={(event) => {
          registration.onBlur(event);
          applyMapsLinkLocation(clinicForm, event.target.value);
        }}
        placeholder="https://maps.google.com/..."
        aria-invalid={!!clinicForm.formState.errors.mapsLink}
        aria-describedby={
          clinicForm.formState.errors.mapsLink
            ? "clinic-maps-link-error"
            : "clinic-maps-link-help"
        }
      />
      {clinicForm.formState.errors.mapsLink ? (
        <p
          id="clinic-maps-link-error"
          className="text-sm text-destructive"
        >
          {clinicForm.formState.errors.mapsLink.message}
        </p>
      ) : (
        <p
          id="clinic-maps-link-help"
          className="text-xs text-muted-foreground"
        >
          Paste a Google Maps link — if it includes a location, we&apos;ll use
          it to drop your map pin automatically. Patients also see this link in
          appointment confirmations.
        </p>
      )}
    </div>
  );
}
