import type { UseFormReturn } from "react-hook-form";
import {
  DEFAULT_COUNTRY_CODE,
  normalizeCountryCode,
} from "@workspace/utils";
import type { ClinicAddressSelection } from "@/features/setup/components/onboarding/address-picker/address-utils";
import type { ClinicDetails } from "@/features/setup/components/onboarding/types";

function hasText(value: string | undefined | null): value is string {
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

  if (addressParts.length === 0) return values.address?.trim() ?? "";

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

/**
 * Extract `{ lat, lng }` from a pasted Google Maps URL so admins can supply the
 * required location by pasting a link instead of using the interactive picker.
 * Handles the common coordinate-bearing formats:
 *   …/@12.97,77.59,15z   ?q=12.97,77.59   &ll=12.97,77.59   !3d12.97!4d77.59
 *   q=loc:12.97,77.59
 * Short links (maps.app.goo.gl / goo.gl/maps) don't carry coordinates and
 * return null — those still need the map picker.
 */
function parseLatLngFromMapsUrl(
  raw: string,
): { lat: number; lng: number } | null {
  const url = raw?.trim();
  if (!url) return null;
  const num = "(-?\\d+(?:\\.\\d+)?)";
  const patterns = [
    new RegExp(`@${num},${num}`),
    new RegExp(`!3d${num}!4d${num}`),
    new RegExp(`[?&](?:q|ll|sll|daddr|center)=${num},${num}`),
    new RegExp(`q=loc:${num},${num}`),
  ];
  for (const re of patterns) {
    const m = url.match(re);
    if (!m) continue;
    const lat = Number(m[1]);
    const lng = Number(m[2]);
    if (
      Number.isFinite(lat) &&
      Number.isFinite(lng) &&
      Math.abs(lat) <= 90 &&
      Math.abs(lng) <= 180
    ) {
      return { lat, lng };
    }
  }
  return null;
}

/**
 * Parse a pasted Google Maps link and, if it carries coordinates, set them as
 * the clinic's map pin (`mapsLocation`). Returns true when a pin was derived.
 */
export function applyMapsLinkLocation(
  clinicForm: UseFormReturn<ClinicDetails>,
  link: string,
): boolean {
  const location = parseLatLngFromMapsUrl(link);
  if (!location) return false;
  clinicForm.setValue("mapsLocation", location, {
    shouldDirty: true,
    shouldTouch: true,
    shouldValidate: true,
  });
  return true;
}
