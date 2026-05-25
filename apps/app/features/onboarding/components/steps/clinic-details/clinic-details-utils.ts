import { UseFormReturn } from "react-hook-form";
import {
  DEFAULT_COUNTRY_CODE,
  normalizeCountryCode,
} from "@workspace/utils";
import type { ClinicAddressSelection } from "@/features/onboarding/components/clinic-address-picker-dialog";
import type { ClinicDetails } from "@/features/onboarding/components/types";

export function hasText(value: string | undefined | null): value is string {
  return Boolean(value?.trim());
}

export function resolveFacilityTypeLabel(
  label: string,
  facilityLabel: "Clinic" | "Hospital",
): string {
  return label.replace(/\bClinic\b/g, facilityLabel);
}

export function composeClinicAddress(values: Partial<ClinicDetails>): string {
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

export function applyClinicAddressSelection(
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

  clinicForm.setValue("mapsLocation", selection.location, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: false,
  });

  const existingLink = clinicForm.getValues("mapsLink")?.trim() ?? "";
  if (!existingLink) {
    clinicForm.setValue(
      "mapsLink",
      `https://www.google.com/maps?q=${selection.location.lat},${selection.location.lng}`,
      {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      },
    );
  }
}
