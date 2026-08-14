import { DEFAULT_COUNTRY_CODE, normalizeCountryCode } from "@workspace/utils";

export type LatLng = { lat: number; lng: number };

export type ClinicAddressDetails = {
  addressLine1: string;
  addressLine2: string;
  city: string;
  state: string;
  pincode: string;
  countryCode: string;
};

export type ClinicAddressSelection = {
  address: string;
  location: LatLng;
  details?: ClinicAddressDetails;
};

type OSMAddress = {
  house_number?: string;
  road?: string;
  neighbourhood?: string;
  suburb?: string;
  city?: string;
  town?: string;
  village?: string;
  municipality?: string;
  county?: string;
  state?: string;
  postcode?: string;
  country?: string;
  country_code?: string;
};

export type PlaceSuggestion = {
  id: string;
  label: string;
  position: LatLng;
  details?: ClinicAddressDetails;
};

export const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
export const SEARCH_DEBOUNCE_MS = 250;

function hasText(value: string | undefined | null): value is string {
  return Boolean(value?.trim());
}

function joinAddress(parts: Array<string | undefined | null>): string {
  return parts.filter(hasText).join(", ");
}

function toAddressDetails(input: {
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  countryCode?: string;
}): ClinicAddressDetails | null {
  const details: ClinicAddressDetails = {
    addressLine1: input.addressLine1?.trim() ?? "",
    addressLine2: input.addressLine2?.trim() ?? "",
    city: input.city?.trim() ?? "",
    state: input.state?.trim() ?? "",
    pincode: input.pincode?.trim() ?? "",
    countryCode:
      normalizeCountryCode(input.countryCode) ?? DEFAULT_COUNTRY_CODE,
  };

  if (
    !details.addressLine1 &&
    !details.addressLine2 &&
    !details.city &&
    !details.state &&
    !details.pincode
  ) return null;

  return details;
}

export function formatAddressDetails(details: ClinicAddressDetails): string {
  return joinAddress([
    details.addressLine1,
    details.addressLine2,
    details.city,
    details.state,
    details.pincode,
    details.countryCode,
  ]);
}

function readOsmAddressField(
  address: Record<string, unknown>,
  key: keyof OSMAddress,
): string | undefined {
  const value = address[key];
  return typeof value === "string" ? value : undefined;
}

export function parseOSMAddressDetails(
  address?: OSMAddress | Record<string, unknown>,
): ClinicAddressDetails | null {
  if (!address || typeof address !== "object") return null;

  const line1 = joinAddress([
    readOsmAddressField(address, "house_number"),
    readOsmAddressField(address, "road"),
  ]);
  const line2 = joinAddress([
    readOsmAddressField(address, "neighbourhood"),
    readOsmAddressField(address, "suburb"),
    readOsmAddressField(address, "county"),
  ]);
  const city =
    readOsmAddressField(address, "city")?.trim() ||
    readOsmAddressField(address, "town")?.trim() ||
    readOsmAddressField(address, "village")?.trim() ||
    readOsmAddressField(address, "municipality")?.trim() ||
    "";

  return (
    toAddressDetails({
      addressLine1: line1 || line2 || readOsmAddressField(address, "road") || "",
      addressLine2: line2 && line2 !== line1 ? line2 : "",
      city,
      state: readOsmAddressField(address, "state"),
      pincode: readOsmAddressField(address, "postcode"),
      countryCode: readOsmAddressField(address, "country_code"),
    }) ?? null
  );
}
