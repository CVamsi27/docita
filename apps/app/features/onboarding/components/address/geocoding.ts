import { browserRequest } from "@/lib/browser-request";
import {
  type ClinicAddressSelection,
  type LatLng,
  type OSMAddress,
  type PlaceSuggestion,
  NOMINATIM_BASE,
  formatAddressDetails,
  parseGoogleAddressDetails,
  parseOSMAddressDetails,
} from "./address-utils";

export async function reverseGeocodeOSM(
  position: LatLng,
): Promise<ClinicAddressSelection | null> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(position.lat));
  url.searchParams.set("lon", String(position.lng));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const res = await browserRequest(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    display_name?: string;
    address?: OSMAddress;
  };
  const details = parseOSMAddressDetails(data.address);
  const address = details
    ? formatAddressDetails(details)
    : data.display_name?.trim() || "";

  if (!address) return null;

  return { address, location: position, details: details ?? undefined };
}

export async function searchOSM(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");

  const res = await browserRequest(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) return [];

  const data = (await res.json()) as Array<{
    place_id: number;
    display_name?: string;
    lat?: string;
    lon?: string;
    address?: OSMAddress;
  }>;

  return data
    .map((item) => {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const label = item.display_name?.trim();
      if (!label) return null;

      const suggestion: PlaceSuggestion = {
        id: String(item.place_id),
        label,
        position: { lat, lng },
        details: parseOSMAddressDetails(item.address) ?? undefined,
      };
      return suggestion;
    })
    .filter((x): x is PlaceSuggestion => Boolean(x));
}

export async function reverseGeocodeGoogle(
  position: LatLng,
): Promise<ClinicAddressSelection | null> {
  if (typeof window === "undefined" || !window.google?.maps?.Geocoder) {
    return null;
  }

  const geocoder = new window.google.maps.Geocoder();
  const result = await geocoder.geocode({ location: position });
  const first = result.results?.[0];
  if (!first) return null;

  const details = parseGoogleAddressDetails(first.address_components);
  const address = details
    ? formatAddressDetails(details)
    : first.formatted_address?.trim() || "";

  if (!address) return null;

  return { address, location: position, details: details ?? undefined };
}
