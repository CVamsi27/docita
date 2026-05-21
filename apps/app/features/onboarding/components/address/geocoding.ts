import { z } from "zod";
import { browserRequest } from "@/lib/auth/browser-request";
import { isRecord } from "@workspace/utils";
import {
  type ClinicAddressSelection,
  type LatLng,
  type PlaceSuggestion,
  NOMINATIM_BASE,
  formatAddressDetails,
  parseGoogleAddressDetails,
  parseOSMAddressDetails,
} from "./address-utils";

const osmAddressSchema = z.record(z.string(), z.unknown());

const osmReverseResponseSchema = z.object({
  display_name: z.string().optional(),
  address: osmAddressSchema.optional(),
});

const osmSearchResultSchema = z.object({
  place_id: z.number(),
  display_name: z.string().optional(),
  lat: z.string().optional(),
  lon: z.string().optional(),
  address: osmAddressSchema.optional(),
});

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

  const parsed = osmReverseResponseSchema.safeParse(await res.json());
  if (!parsed.success) return null;
  const data = parsed.data;
  const details = parseOSMAddressDetails(
    isRecord(data.address) ? data.address : undefined,
  );
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

  const raw = await res.json();
  if (!Array.isArray(raw)) return [];

  return raw
    .map((item) => {
      const parsed = osmSearchResultSchema.safeParse(item);
      if (!parsed.success) return null;
      const row = parsed.data;
      const lat = Number(row.lat);
      const lng = Number(row.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const label = row.display_name?.trim();
      if (!label) return null;
      const suggestion: PlaceSuggestion = {
        id: String(row.place_id),
        label,
        position: { lat, lng },
        details:
          parseOSMAddressDetails(
            isRecord(row.address) ? row.address : undefined,
          ) ?? undefined,
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
