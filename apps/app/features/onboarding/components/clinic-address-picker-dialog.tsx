"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/dialog";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { LocateFixed, MapPin, Search, X } from "lucide-react";
import {
  Autocomplete,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import {
  MapContainer,
  Marker as LeafletMarker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";
import type { LeafletMouseEvent, LatLngExpression } from "leaflet";
import type { LatLng as LeafletLatLng } from "leaflet";
import type { Map as LeafletMapInstance } from "leaflet";
import { DEFAULT_COUNTRY_CODE, normalizeCountryCode } from "@workspace/utils";
import { browserRequest } from "@/lib/browser-request";
import styles from "./clinic-address-picker-dialog.module.css";

type LatLng = { lat: number; lng: number };

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

const DEFAULT_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 }; // India
const GOOGLE_LIBRARIES: "places"[] = ["places"];
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const SEARCH_DEBOUNCE_MS = 250;

function isValidGoogleMapsApiKey(input: string): boolean {
  const key = input.trim();
  if (!key) return false;
  // Prevent loading Google Maps with placeholder/non-key values.
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

function resolveLeafletAsset(asset: string | { src: string }): string {
  return typeof asset === "string" ? asset : asset.src;
}

const LEAFLET_MARKER_ICON = L.icon({
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
delete (
  L.Icon.Default.prototype as typeof L.Icon.Default.prototype & {
    _getIconUrl?: unknown;
  }
)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: resolveLeafletAsset(markerIcon2x),
  iconUrl: resolveLeafletAsset(markerIcon),
  shadowUrl: resolveLeafletAsset(markerShadow),
});

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

type PlaceSuggestion = {
  id: string;
  label: string;
  position: LatLng;
  details?: ClinicAddressDetails;
};

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
  ) {
    return null;
  }

  return details;
}

function formatAddressDetails(details: ClinicAddressDetails): string {
  return joinAddress([
    details.addressLine1,
    details.addressLine2,
    details.city,
    details.state,
    details.pincode,
    details.countryCode,
  ]);
}

function parseOSMAddressDetails(
  address?: OSMAddress,
): ClinicAddressDetails | null {
  if (!address) return null;

  const line1 = joinAddress([address.house_number, address.road]);
  const line2 = joinAddress([
    address.neighbourhood,
    address.suburb,
    address.county,
  ]);
  const city =
    address.city?.trim() ||
    address.town?.trim() ||
    address.village?.trim() ||
    address.municipality?.trim() ||
    "";

  return (
    toAddressDetails({
      addressLine1: line1 || line2 || address.road || "",
      addressLine2: line2 && line2 !== line1 ? line2 : "",
      city,
      state: address.state,
      pincode: address.postcode,
      countryCode: address.country_code,
    }) ?? null
  );
}

function getGoogleAddressComponent(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  type: string,
  shortName = false,
): string {
  const component = components?.find((entry) => entry.types.includes(type));
  return shortName
    ? (component?.short_name ?? "")
    : (component?.long_name ?? "");
}

function parseGoogleAddressDetails(
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

function ClickToPick({ onPick }: { onPick: (value: LatLng) => void }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

function LeafletMapSync({
  active,
  center,
  zoom,
  layoutVersion,
}: {
  active: boolean;
  center: LatLngExpression;
  zoom: number;
  layoutVersion: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!active) return;
    const frame = window.requestAnimationFrame(() => {
      try {
        const container = map.getContainer();
        if (!container?.isConnected) return;
        map.invalidateSize();
        map.setView(center, zoom, { animate: false });
      } catch {
        // Ignore stale-map races while the dialog is remounting/closing.
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [active, center, zoom, layoutVersion, map]);

  return null;
}

function LeafletMapHandle({
  onReady,
}: {
  onReady: (map: LeafletMapInstance) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
  }, [map, onReady]);

  return null;
}

async function reverseGeocodeOSM(
  position: LatLng,
): Promise<ClinicAddressSelection | null> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(position.lat));
  url.searchParams.set("lon", String(position.lng));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const res = await browserRequest(url.toString(), {
    headers: {
      Accept: "application/json",
    },
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

  return {
    address,
    location: position,
    details: details ?? undefined,
  };
}

async function searchOSM(query: string): Promise<PlaceSuggestion[]> {
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

async function reverseGeocodeGoogle(
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

  return {
    address,
    location: position,
    details: details ?? undefined,
  };
}

export function ClinicAddressPickerDialog({
  open,
  onOpenChange,
  initialAddress,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  initialAddress: string;
  onConfirm: (value: ClinicAddressSelection) => void;
}) {
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [addressDraft, setAddressDraft] = useState(initialAddress);
  const [addressDetails, setAddressDetails] =
    useState<ClinicAddressDetails | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const lastSearchIdRef = useRef(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [googleMap, setGoogleMap] = useState<google.maps.Map | null>(null);
  const [leafletMap, setLeafletMap] = useState<LeafletMapInstance | null>(null);
  const [mapLayoutVersion, setMapLayoutVersion] = useState(0);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
  const [isMapViewportReady, setIsMapViewportReady] = useState(false);
  const [isLeafletPainted, setIsLeafletPainted] = useState(false);
  const [leafletRetryCount, setLeafletRetryCount] = useState(0);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  const didAutoLocateRef = useRef(false);

  const rawGoogleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const hasGoogleKey = isValidGoogleMapsApiKey(rawGoogleKey);
  const googleKey = hasGoogleKey ? rawGoogleKey.trim() : "";
  const { isLoaded: isGoogleLoaded, loadError: googleLoadError } =
    useJsApiLoader({
      id: "google-maps-script",
      googleMapsApiKey: hasGoogleKey ? googleKey : "",
      libraries: GOOGLE_LIBRARIES,
    });
  const shouldUseGoogle = hasGoogleKey && isGoogleLoaded && !googleLoadError;

  const addressValue = addressDraft || resolvedAddress || initialAddress;

  const center = useMemo(() => picked ?? DEFAULT_CENTER, [picked]);
  const mapZoom = picked ? 16 : 5;
  const centerExpression = useMemo<LatLngExpression>(
    () => [center.lat, center.lng],
    [center],
  );
  const triggerGoogleResize = useCallback(() => {
    if (!shouldUseGoogle || !googleMap) return;
    window.google.maps.event.trigger(googleMap, "resize");
    googleMap.setCenter(center);
  }, [center, googleMap, shouldUseGoogle]);

  useEffect(() => {
    if (!open) return;
    setMapInstanceKey((value) => value + 1);
    setIsMapViewportReady(false);
    setIsLeafletPainted(false);
    setLeafletRetryCount(0);
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        setIsMapViewportReady(true);
      });
    });
    setAddressDraft(initialAddress);
    setAddressDetails(null);
    setResolvedAddress("");
    setPicked(null);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
    didAutoLocateRef.current = false;
    return () => window.cancelAnimationFrame(frame);
  }, [initialAddress, open]);

  useEffect(() => {
    if (!open) return;
    const node = mapViewportRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;

    let frame = 0;
    const bump = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setMapLayoutVersion((version) => version + 1);
      });
    };

    const observer = new ResizeObserver(bump);
    observer.observe(node);
    bump();

    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !shouldUseGoogle || !googleMap) return;

    const timeouts = [60, 220, 460].map((delay) =>
      window.setTimeout(() => {
        triggerGoogleResize();
      }, delay),
    );

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [googleMap, mapLayoutVersion, open, shouldUseGoogle, triggerGoogleResize]);

  useEffect(() => {
    if (!open || shouldUseGoogle || !leafletMap) return;

    const timeouts = [80, 220, 420, 700].map((delay) =>
      window.setTimeout(() => {
        try {
          const container = leafletMap.getContainer();
          if (!container?.isConnected) return;
          leafletMap.invalidateSize({ pan: false });
          leafletMap.setView(centerExpression, mapZoom, {
            animate: false,
          });
        } catch {
          // Ignore stale-map races while remounting.
        }
      }, delay),
    );

    return () => {
      timeouts.forEach((id) => window.clearTimeout(id));
    };
  }, [
    centerExpression,
    mapZoom,
    leafletMap,
    open,
    shouldUseGoogle,
    mapLayoutVersion,
  ]);

  useEffect(() => {
    if (!open || shouldUseGoogle || !isMapViewportReady || isLeafletPainted)
      return;
    if (leafletRetryCount >= 2) return;

    const timer = window.setTimeout(() => {
      setLeafletRetryCount((count) => count + 1);
      setIsLeafletPainted(false);
      setMapInstanceKey((value) => value + 1);
      setMapLayoutVersion((version) => version + 1);
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    isLeafletPainted,
    isMapViewportReady,
    leafletRetryCount,
    open,
    shouldUseGoogle,
  ]);

  useEffect(() => {
    if (!open || picked || didAutoLocateRef.current) return;
    if (!navigator.geolocation) return;

    didAutoLocateRef.current = true;

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setPicked(next);

        void (async () => {
          setIsResolving(true);
          try {
            const result = shouldUseGoogle
              ? await reverseGeocodeGoogle(next)
              : await reverseGeocodeOSM(next);

            if (!result) return;
            setResolvedAddress(result.address);
            setAddressDraft(result.address);
            setAddressDetails(result.details ?? null);
          } finally {
            setIsResolving(false);
          }
        })();
      },
      () => {
        // Ignore geolocation denial; user can still choose manually.
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 60_000,
      },
    );
  }, [open, picked, shouldUseGoogle]);

  const handlePick = useCallback(async (pos: LatLng) => {
    setPicked(pos);
    setIsResolving(true);
    try {
      const result = await reverseGeocodeOSM(pos);
      if (result) {
        setResolvedAddress(result.address);
        setAddressDraft(result.address);
        setAddressDetails(result.details ?? null);
      } else {
        setResolvedAddress("");
        setAddressDetails(null);
      }
    } finally {
      setIsResolving(false);
    }
  }, []);

  const handlePickWithGoogle = useCallback(async (pos: LatLng) => {
    setPicked(pos);
    setIsResolving(true);
    try {
      const result = await reverseGeocodeGoogle(pos);
      if (result) {
        setResolvedAddress(result.address);
        setAddressDraft(result.address);
        setAddressDetails(result.details ?? null);
      } else {
        setResolvedAddress("");
        setAddressDetails(null);
      }
    } finally {
      setIsResolving(false);
    }
  }, []);

  const handleUseMyLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setIsResolving(true);
    try {
      const coords = await new Promise<GeolocationCoordinates>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => resolve(pos.coords),
            (err) => reject(err),
            { enableHighAccuracy: true, timeout: 8000 },
          );
        },
      );
      const pos = { lat: coords.latitude, lng: coords.longitude };
      if (shouldUseGoogle) {
        await handlePickWithGoogle(pos);
      } else {
        await handlePick(pos);
      }
    } catch {
      // Silent fail; users can still search and pick manually.
    } finally {
      setIsResolving(false);
    }
  }, [handlePick, handlePickWithGoogle, shouldUseGoogle]);

  useEffect(() => {
    if (!open) return;
    if (shouldUseGoogle) return;

    const q = searchQuery.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    const searchId = ++lastSearchIdRef.current;
    setIsSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const results = await searchOSM(q);
          if (lastSearchIdRef.current !== searchId) return;
          setSuggestions(results);
        } finally {
          if (lastSearchIdRef.current === searchId) {
            setIsSearching(false);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [open, searchQuery, shouldUseGoogle]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby="clinic-location-dialog-description"
        className="h-[92dvh] max-h-[92dvh] w-[min(100vw-1rem,1080px)] max-w-none overflow-hidden rounded-lg border border-border/70 bg-background p-0 shadow-md data-[state=open]:animate-none data-[state=closed]:animate-none sm:w-[min(100vw-2rem,1080px)]"
      >
        <div className="flex h-full min-h-0 flex-col">
          <DialogHeader className="border-b bg-background px-4 py-4 sm:px-6 sm:py-5">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle>Select facility location</DialogTitle>
              <SymbolTooltip label="Close location picker">
                <DialogClose asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Close location picker"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DialogClose>
              </SymbolTooltip>
            </div>
            <DialogDescription
              id="clinic-location-dialog-description"
              className="text-sm text-muted-foreground"
            >
              Search an address, then click the map or drag the pin to refine
              the location.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col bg-background">
            <div className="border-b px-4 py-4 sm:px-6">
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
                <div className="space-y-2">
                  <Label htmlFor="place-search">Search address</Label>
                  {shouldUseGoogle ? (
                    <Autocomplete
                      onLoad={(instance) => setAutocomplete(instance)}
                      onPlaceChanged={() => {
                        const place = autocomplete?.getPlace();
                        const location = place?.geometry?.location;
                        if (!location) return;

                        const pos = {
                          lat: location.lat(),
                          lng: location.lng(),
                        };
                        const formatted = place?.formatted_address?.trim();
                        const details = parseGoogleAddressDetails(
                          place?.address_components,
                        );
                        const address =
                          formatted ||
                          (details ? formatAddressDetails(details) : "");

                        setPicked(pos);
                        setResolvedAddress(address);
                        setAddressDraft(address);
                        setAddressDetails(details);
                      }}
                    >
                      <div className="relative">
                        <Search
                          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                          aria-hidden
                        />
                        <Input
                          id="place-search"
                          placeholder="Facility location"
                          className="h-11 pl-9"
                          aria-label="Search facility location"
                        />
                      </div>
                    </Autocomplete>
                  ) : (
                    <div className="relative">
                      <Search
                        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        id="place-search"
                        value={searchQuery}
                        onChange={(event) => {
                          setSearchQuery(event.target.value);
                          setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        onBlur={() => {
                          window.setTimeout(
                            () => setShowSuggestions(false),
                            120,
                          );
                        }}
                        placeholder="Facility location"
                        className={`h-11 pl-9${searchQuery.trim() || isSearching ? " pr-10" : ""}`}
                        aria-label="Search facility location"
                      />
                      {isSearching ? (
                        <DocitaLoadingIndicator
                          variant="inline"
                          decorative
                          className="absolute right-3 top-1/2 -translate-y-1/2"
                        />
                      ) : searchQuery.trim() ? (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <SymbolTooltip label="Clear search">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setSearchQuery("");
                                setSuggestions([]);
                              }}
                              aria-label="Clear search"
                            >
                              <X
                                className="h-4 w-4 text-muted-foreground"
                                aria-hidden
                              />
                            </Button>
                          </SymbolTooltip>
                        </div>
                      ) : null}
                      {showSuggestions && suggestions.length > 0 ? (
                        <div className="absolute z-50 mt-2 w-full rounded-lg border bg-popover shadow-lg">
                          {suggestions.map((suggestion) => (
                            <button
                              key={suggestion.id}
                              type="button"
                              className="block w-full px-3 py-2 text-left text-sm hover:bg-muted/40"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => {
                                setPicked(suggestion.position);
                                setResolvedAddress(suggestion.label);
                                setAddressDraft(suggestion.label);
                                setAddressDetails(suggestion.details ?? null);
                                setSearchQuery(suggestion.label);
                                setSuggestions([]);
                                setShowSuggestions(false);
                              }}
                            >
                              <div className="line-clamp-2">
                                {suggestion.label}
                              </div>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full lg:w-auto"
                  onClick={() => void handleUseMyLocation()}
                  disabled={isResolving}
                >
                  <LocateFixed className="mr-2 h-4 w-4" />
                  Use my location
                </Button>
              </div>
            </div>

            <div
              ref={mapViewportRef}
              className="relative flex-1 overflow-hidden p-3 sm:p-4"
            >
              <div className={styles.mapRoot}>
                {!isMapViewportReady ? (
                  <div className="flex h-full items-center justify-center rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                    Preparing map…
                  </div>
                ) : hasGoogleKey && !isGoogleLoaded && !googleLoadError ? (
                  <div className="flex h-full items-center justify-center rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="mr-2"
                    />
                    Loading map…
                  </div>
                ) : shouldUseGoogle ? (
                  <GoogleMap
                    key={`google-map-${mapInstanceKey}`}
                    onLoad={(map) => {
                      setGoogleMap(map);
                      setMapLayoutVersion((version) => version + 1);
                    }}
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={center}
                    zoom={picked ? 16 : 5}
                    options={{
                      fullscreenControl: false,
                      mapTypeControl: false,
                      streetViewControl: false,
                    }}
                    onClick={(event) => {
                      const lat = event.latLng?.lat();
                      const lng = event.latLng?.lng();
                      if (typeof lat !== "number" || typeof lng !== "number")
                        return;
                      void handlePickWithGoogle({ lat, lng });
                    }}
                  >
                    {picked ? (
                      <Marker
                        position={picked}
                        draggable
                        onDragEnd={(event) => {
                          const lat = event.latLng?.lat();
                          const lng = event.latLng?.lng();
                          if (
                            typeof lat !== "number" ||
                            typeof lng !== "number"
                          ) {
                            return;
                          }
                          void handlePickWithGoogle({ lat, lng });
                        }}
                      />
                    ) : null}
                  </GoogleMap>
                ) : (
                  <MapContainer
                    key={`leaflet-map-${mapInstanceKey}`}
                    center={centerExpression}
                    zoom={mapZoom}
                    scrollWheelZoom
                  >
                    <LeafletMapHandle onReady={setLeafletMap} />
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      eventHandlers={{
                        tileload: () => setIsLeafletPainted(true),
                        load: () => setIsLeafletPainted(true),
                      }}
                    />
                    <ClickToPick onPick={handlePick} />
                    <LeafletMapSync
                      active={open}
                      center={centerExpression}
                      zoom={mapZoom}
                      layoutVersion={mapLayoutVersion}
                    />
                    {picked ? (
                      <LeafletMarker
                        position={[picked.lat, picked.lng]}
                        icon={LEAFLET_MARKER_ICON}
                        draggable
                        eventHandlers={{
                          dragend: (event) => {
                            const marker = event.target as {
                              getLatLng: () => LeafletLatLng;
                            };
                            const ll = marker.getLatLng();
                            void handlePick({ lat: ll.lat, lng: ll.lng });
                          },
                        }}
                      />
                    ) : null}
                  </MapContainer>
                )}
              </div>
            </div>

            <div className="grid gap-3 border-t bg-muted/10 px-4 py-4 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end">
              <div className="rounded-lg border bg-background px-3 py-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Coordinates</span>
                </div>
                <p className="mt-1 font-mono text-foreground">
                  {picked
                    ? `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}`
                    : "Pick a location on the map"}
                </p>
              </div>

              <div>
                <Label htmlFor="resolved-address">Address</Label>
                <div className="relative mt-2">
                  <Input
                    id="resolved-address"
                    value={addressValue}
                    onChange={(event) => setAddressDraft(event.target.value)}
                  />
                  {isResolving ? (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!picked) return;
                    onConfirm({
                      address: addressValue,
                      location: picked,
                      details: addressDetails ?? undefined,
                    });
                    onOpenChange(false);
                  }}
                  disabled={!picked || isResolving}
                >
                  Use this location
                </Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
