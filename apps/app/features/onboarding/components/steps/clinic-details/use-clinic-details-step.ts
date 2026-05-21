import { useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { DEFAULT_COUNTRY_CODE, normalizeCountryCode } from "@workspace/utils";
import { CLINIC_TYPE_OPTIONS } from "@workspace/types";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import { composeClinicAddress } from "./clinic-details-utils";

export function useClinicDetailsStep(clinicForm: UseFormReturn<ClinicDetails>) {
  const [mapPickerOpen, setMapPickerOpen] = useState(false);

  const shouldUseClinicTypeRadio = CLINIC_TYPE_OPTIONS.length < 4;
  const facilityLabel: "Clinic" | "Hospital" =
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

  return {
    mapPickerOpen,
    setMapPickerOpen,
    shouldUseClinicTypeRadio,
    facilityLabel,
    resolvedCountryCode,
    addressSummary,
  };
}
