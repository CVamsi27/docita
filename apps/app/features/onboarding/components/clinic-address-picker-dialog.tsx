"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import {
  Autocomplete,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { MapContainer, Marker as LeafletMarker, TileLayer, useMapEvents } from "react-leaflet";
import styles from "./clinic-address-picker-dialog.module.css";
import type { LeafletMouseEvent, LatLngExpression } from "leaflet";
import type { LatLng as LeafletLatLng } from "leaflet";

type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 }; // India
const GOOGLE_LIBRARIES = ["places"] as const;
const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const SEARCH_DEBOUNCE_MS = 250;

type PlaceSuggestion = {
  id: string;
  label: string;
  position: LatLng;
};

function ClickToPick({
  onPick,
}: {
  onPick: (value: LatLng) => void;
}) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      onPick({ lat: e.latlng.lat, lng: e.latlng.lng });
    },
  });
  return null;
}

async function reverseGeocodeOSM(position: LatLng): Promise<string | null> {
  const url = new URL("https://nominatim.openstreetmap.org/reverse");
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("lat", String(position.lat));
  url.searchParams.set("lon", String(position.lng));
  url.searchParams.set("zoom", "18");
  url.searchParams.set("addressdetails", "1");

  const res = await fetch(url.toString(), {
    headers: {
      // Best-effort; browsers may ignore this header.
      Accept: "application/json",
    },
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { display_name?: string };
  return data.display_name?.trim() || null;
}

async function searchOSM(query: string): Promise<PlaceSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];
  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("q", trimmed);
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("limit", "6");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as Array<{
    place_id: number;
    display_name?: string;
    lat?: string;
    lon?: string;
  }>;

  return data
    .map((item) => {
      const lat = Number(item.lat);
      const lng = Number(item.lon);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      const label = item.display_name?.trim();
      if (!label) return null;
      return {
        id: String(item.place_id),
        label,
        position: { lat, lng },
      } satisfies PlaceSuggestion;
    })
    .filter((x): x is PlaceSuggestion => Boolean(x));
}

async function reverseGeocodeGoogle(position: LatLng): Promise<string | null> {
  if (typeof window === "undefined" || !window.google?.maps?.Geocoder) {
    return null;
  }

  const geocoder = new window.google.maps.Geocoder();
  const result = await geocoder.geocode({ location: position });
  const first = result.results?.[0];
  return first?.formatted_address?.trim() || null;
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
  onConfirm: (value: { address: string; location: LatLng }) => void;
}) {
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<string>("");
  const [addressDraft, setAddressDraft] = useState<string>(initialAddress);
  const [isResolving, setIsResolving] = useState(false);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const lastSearchIdRef = useRef(0);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const hasGoogleKey = Boolean(googleKey.trim());
  const { isLoaded: isGoogleLoaded, loadError: googleLoadError } =
    useJsApiLoader({
      id: "google-maps-script",
      googleMapsApiKey: hasGoogleKey ? googleKey : "",
      libraries: GOOGLE_LIBRARIES as unknown as ("places")[],
    });
  const shouldUseGoogle = hasGoogleKey && isGoogleLoaded && !googleLoadError;

  const addressValue = addressDraft || resolvedAddress || initialAddress;

  useEffect(() => {
    if (!open) return;
    setAddressDraft(initialAddress);
    setResolvedAddress("");
    setPicked(null);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  }, [initialAddress, open]);

  const handlePick = useCallback(async (pos: LatLng) => {
    setPicked(pos);
    setIsResolving(true);
    try {
      const display = await reverseGeocodeOSM(pos);
      if (display) {
        setResolvedAddress(display);
        setAddressDraft(display);
      } else {
        setResolvedAddress("");
      }
    } finally {
      setIsResolving(false);
    }
  }, []);

  const handlePickWithGoogle = useCallback(async (pos: LatLng) => {
    setPicked(pos);
    setIsResolving(true);
    try {
      const display = await reverseGeocodeGoogle(pos);
      if (display) {
        setResolvedAddress(display);
        setAddressDraft(display);
      } else {
        setResolvedAddress("");
      }
    } finally {
      setIsResolving(false);
    }
  }, []);

  const handleUseMyLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setIsResolving(true);
    try {
      const coords = await new Promise<GeolocationCoordinates>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 8000 },
        );
      });
      const pos = { lat: coords.latitude, lng: coords.longitude };
      if (shouldUseGoogle) {
        await handlePickWithGoogle(pos);
      } else {
        await handlePick(pos);
      }
    } catch {
      // Silent fail; user can still click/search.
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
    const timer = setTimeout(() => {
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

    return () => clearTimeout(timer);
  }, [open, searchQuery, shouldUseGoogle]);

  const center = useMemo(() => {
    if (picked) return picked;
    return DEFAULT_CENTER;
  }, [picked]);

  const centerExpression = useMemo(
    (): LatLngExpression => [center.lat, center.lng],
    [center.lat, center.lng],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-2rem)] max-w-2xl">
        <DialogHeader>
          <DialogTitle>Select clinic location</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2 flex-1">
              <Label htmlFor="place-search">Search address</Label>
              {shouldUseGoogle ? (
                <Autocomplete
                  onLoad={(instance) => setAutocomplete(instance)}
                  onPlaceChanged={() => {
                    const place = autocomplete?.getPlace();
                    const location = place?.geometry?.location;
                    const formatted = place?.formatted_address?.trim();
                    if (!location) return;
                    const pos = { lat: location.lat(), lng: location.lng() };
                    setPicked(pos);
                    setResolvedAddress(formatted ?? "");
                    setAddressDraft(formatted ?? "");
                  }}
                >
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="place-search"
                      placeholder="Search for your clinic location"
                      className="h-11 pl-9"
                    />
                  </div>
                </Autocomplete>
              ) : (
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="place-search"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={() => {
                      // Small delay so click on suggestion registers.
                      window.setTimeout(() => setShowSuggestions(false), 120);
                    }}
                    placeholder="Search for your clinic location"
                    className="h-11 pl-9"
                  />
                  {isSearching ? (
                    <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                  ) : null}
                  {showSuggestions && suggestions.length > 0 ? (
                    <div className="absolute z-50 mt-2 w-full rounded-lg border bg-popover shadow-md">
                      {suggestions.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          className="block w-full text-left px-3 py-2 text-sm hover:bg-muted/40"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => {
                            setPicked(s.position);
                            setResolvedAddress(s.label);
                            setAddressDraft(s.label);
                            setSearchQuery(s.label);
                            setSuggestions([]);
                            setShowSuggestions(false);
                          }}
                        >
                          <div className="line-clamp-2">{s.label}</div>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                Search, then fine-tune by clicking the map or dragging the pin.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="h-11"
              onClick={() => void handleUseMyLocation()}
              disabled={isResolving}
            >
              <LocateFixed className="mr-2 h-4 w-4" />
              Use my location
            </Button>
          </div>

          <div className={styles.mapRoot}>
            {hasGoogleKey && !isGoogleLoaded && !googleLoadError ? (
              <div className="flex h-full items-center justify-center rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading map...
              </div>
            ) : shouldUseGoogle ? (
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={center}
                zoom={picked ? 16 : 5}
                options={{
                  fullscreenControl: false,
                  mapTypeControl: false,
                  streetViewControl: false,
                }}
                onClick={(e) => {
                  const lat = e.latLng?.lat();
                  const lng = e.latLng?.lng();
                  if (typeof lat !== "number" || typeof lng !== "number") {
                    return;
                  }
                  void handlePickWithGoogle({ lat, lng });
                }}
              >
                {picked ? (
                  <Marker
                    position={picked}
                    draggable
                    onDragEnd={(e) => {
                      const lat = e.latLng?.lat();
                      const lng = e.latLng?.lng();
                      if (typeof lat !== "number" || typeof lng !== "number") {
                        return;
                      }
                      void handlePickWithGoogle({ lat, lng });
                    }}
                  />
                ) : null}
              </GoogleMap>
            ) : (
              <MapContainer
                center={centerExpression}
                zoom={picked ? 16 : 5}
                scrollWheelZoom
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <ClickToPick onPick={handlePick} />
                {picked ? (
                  <LeafletMarker
                    position={[picked.lat, picked.lng]}
                    draggable
                    eventHandlers={{
                      dragend: (e) => {
                        const marker = e.target as { getLatLng: () => LeafletLatLng };
                        const ll = marker.getLatLng();
                        void handlePick({ lat: ll.lat, lng: ll.lng });
                      },
                    }}
                  />
                ) : null}
              </MapContainer>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Coordinates</Label>
              <div className="flex items-center gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {picked ? (
                  <span className="font-mono">
                    {picked.lat.toFixed(6)}, {picked.lng.toFixed(6)}
                  </span>
                ) : (
                  <span className="text-muted-foreground">Click the map to choose</span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolved-address">Address</Label>
              <div className="relative">
                <Input
                  id="resolved-address"
                  value={addressValue}
                  onChange={(e) => setAddressDraft(e.target.value)}
                />
                {isResolving ? (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Address is auto-filled. You can edit it before confirming.
              </p>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                if (!picked) return;
                onConfirm({ address: addressValue, location: picked });
                onOpenChange(false);
              }}
              disabled={!picked || isResolving}
            >
              Use this location
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

