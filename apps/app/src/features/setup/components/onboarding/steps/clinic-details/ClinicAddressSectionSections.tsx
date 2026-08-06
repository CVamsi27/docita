"use client";

import type { UseFormReturn } from "react-hook-form";
import { Check, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button, Input, Label } from "@workspace/ui/components";
import { cn } from "@workspace/ui/lib/utils";
import type { ClinicDetails } from "@/features/setup/components/onboarding/types";
import { applyMapsLinkLocation } from "./clinic-details-utils";

interface ClinicAddressHeaderProps {
  isPinned: boolean;
  onOpenMapPicker: () => void;
  mapsLocationError?: string;
}

export function ClinicAddressHeader({
  isPinned,
  onOpenMapPicker,
  mapsLocationError,
}: ClinicAddressHeaderProps) {
  const { t } = useTranslation("Onboarding.clinicAddress");
  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Label className="text-base font-semibold" htmlFor="addressLine1">
            {t("addressLabel")}
            <span className="text-destructive ml-0.5">*</span>
          </Label>
          <p className="text-xs text-muted-foreground">
            {t("addressHint")}
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
              {t("locationPinned")}
            </>
          ) : (
            <>
              <MapPin className="h-4 w-4" aria-hidden />
              {t("pinOnMap")}
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
          {mapsLocationError ?? t("pinRequiredHint")}
        </p>
      ) : null}
    </>
  );
}

interface AddressLine1FieldProps {
  clinicForm: UseFormReturn<ClinicDetails>;
}

export function AddressLine1Field({ clinicForm }: AddressLine1FieldProps) {
  const { t } = useTranslation("Onboarding.clinicAddress");
  return (
    <div className="space-y-2">
      <Label htmlFor="addressLine1">
        {t("addressLine1Label")}<span className="text-destructive ml-0.5">*</span>
      </Label>
      <Input
        id="addressLine1"
        {...clinicForm.register("addressLine1")}
        placeholder={t("addressLine1Placeholder")}
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

interface AddressLine2FieldProps {
  clinicForm: UseFormReturn<ClinicDetails>;
}

export function AddressLine2Field({ clinicForm }: AddressLine2FieldProps) {
  const { t } = useTranslation("Onboarding.clinicAddress");
  return (
    <div className="space-y-2">
      <Label htmlFor="addressLine2">{t("addressLine2Label")}</Label>
      <Input
        id="addressLine2"
        {...clinicForm.register("addressLine2")}
        placeholder={t("addressLine2Placeholder")}
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

interface CityStateFieldsProps {
  clinicForm: UseFormReturn<ClinicDetails>;
}

export function CityStateFields({ clinicForm }: CityStateFieldsProps) {
  const { t } = useTranslation("Onboarding.clinicAddress");
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="city">
          {t("cityLabel")}<span className="text-destructive ml-0.5">*</span>
        </Label>
        <Input
          id="city"
          {...clinicForm.register("city")}
          placeholder={t("cityPlaceholder")}
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
          {t("stateLabel")}
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <Input
          id="state"
          {...clinicForm.register("state")}
          placeholder={t("statePlaceholder")}
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

interface CountryPostalFieldsProps {
  clinicForm: UseFormReturn<ClinicDetails>;
  resolvedCountryCode: string;
}

export function CountryPostalFields({
  clinicForm,
  resolvedCountryCode,
}: CountryPostalFieldsProps) {
  const { t } = useTranslation("Onboarding.clinicAddress");
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <Label htmlFor="countryCode">{t("countryLabel")}</Label>
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
          {t("countryHint")}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="pincode">{t("postalLabel")}</Label>
        <Input
          id="pincode"
          {...clinicForm.register("pincode")}
          placeholder={t("postalPlaceholder")}
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

interface AddressPreviewProps {
  addressSummary: string;
}

export function AddressPreview({ addressSummary }: AddressPreviewProps) {
  const { t } = useTranslation("Onboarding.clinicAddress");
  return (
    <div className="rounded-lg border bg-background/70 px-4 py-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t("addressPreviewLabel")}
      </p>
      <p className="mt-2 text-sm leading-6 text-foreground">
        {addressSummary || t("addressPreviewEmpty")}
      </p>
    </div>
  );
}

interface GoogleMapsLinkFieldProps {
  clinicForm: UseFormReturn<ClinicDetails>;
}

export function GoogleMapsLinkField({ clinicForm }: GoogleMapsLinkFieldProps) {
  const { t } = useTranslation("Onboarding.clinicAddress");
  const registration = clinicForm.register("mapsLink");
  return (
    <div className="space-y-2">
      <Label htmlFor="mapsLink">{t("mapsLinkLabel")}</Label>
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
        placeholder={t("mapsLinkPlaceholder")}
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
          {t("mapsLinkHint")}
        </p>
      )}
    </div>
  );
}
