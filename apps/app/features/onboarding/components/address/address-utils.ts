import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
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

export type OSMAddress = {
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

export const DEFAULT_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 }; // India
export const GOOGLE_LIBRARIES: "places"[] = ["places"];
export const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
export const SEARCH_DEBOUNCE_MS = 250;

export function isValidGoogleMapsApiKey(input: string): boolean {
  const key = input.trim();
  if (!key) return false;
  if (
    key === "undefined" ||
    key === "null" ||
    key === "YOUR_GOOGLE_MAPS_API_KEY" ||
    key === "NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"
  ) {
    return false;
  }
  return /^AIza[0-9A-Za-z-_]{20,}$/.test(key);
}

export function resolveLeafletAsset(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}

export const LEAFLET_MARKER_ICON = L.icon({
  iconRetinaUrl: resolveLeafletAsset(markerIcon2x),
  iconUrl: resolveLeafletAsset(markerIcon),
  shadowUrl: resolveLeafletAsset(markerShadow),
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Leaflet still falls back to its default marker lookup in a few code paths,
// so set the global defaults to the bundled assets as well.
Reflect.deleteProperty(L.Icon.Default.prototype, "_getIconUrl");
L.Icon.Default.mergeOptions({
  iconRetinaUrl: resolveLeafletAsset(markerIcon2x),
  iconUrl: resolveLeafletAsset(markerIcon),
  shadowUrl: resolveLeafletAsset(markerShadow),
});

export function hasText(value: string | undefined | null): value is string {
  return Boolean(value?.trim());
}

export function joinAddress(parts: Array<string | undefined | null>): string {
  return parts.filter(hasText).join(", ");
}

export function toAddressDetails(input: {
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
  ) {
    return null;
  }

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

export function getGoogleAddressComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string,
  shortName = false,
): string {
  const component = components?.find((entry) => entry.types.includes(type));
  return shortName
    ? (component?.short_name ?? "")
    : (component?.long_name ?? "");
}

export function parseGoogleAddressDetails(
  components: google.maps.GeocoderAddressComponent[] | undefined,
): ClinicAddressDetails | null {
  if (!components?.length) return null;

  return (
    toAddressDetails({
      addressLine1: joinAddress([
        getGoogleAddressComponent(components, "street_number"),
        getGoogleAddressComponent(components, "route"),
      ]),
      addressLine2: joinAddress([
        getGoogleAddressComponent(components, "sublocality_level_1"),
        getGoogleAddressComponent(components, "sublocality"),
        getGoogleAddressComponent(components, "neighborhood"),
      ]),
      city:
        getGoogleAddressComponent(components, "locality") ||
        getGoogleAddressComponent(components, "postal_town") ||
        getGoogleAddressComponent(components, "administrative_area_level_2"),
      state: getGoogleAddressComponent(
        components,
        "administrative_area_level_1",
      ),
      pincode: getGoogleAddressComponent(components, "postal_code"),
      countryCode: getGoogleAddressComponent(components, "country", true),
    }) ?? null
  );
}
