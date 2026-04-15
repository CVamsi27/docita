"use client";

import { useCallback, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { Loader2, MapPin } from "lucide-react";
import {
  Autocomplete,
  GoogleMap,
  Marker,
  useJsApiLoader,
} from "@react-google-maps/api";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import styles from "./clinic-address-picker-dialog.module.css";
import type { LeafletMouseEvent, LatLngExpression } from "leaflet";

type LatLng = { lat: number; lng: number };

const DEFAULT_CENTER: LatLng = { lat: 20.5937, lng: 78.9629 }; // India
const GOOGLE_LIBRARIES = ["places"] as const;

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
  const [isResolving, setIsResolving] = useState(false);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);

  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const hasGoogleKey = Boolean(googleKey.trim());
  const { isLoaded: isGoogleLoaded, loadError: googleLoadError } =
    useJsApiLoader({
      id: "google-maps-script",
      googleMapsApiKey: hasGoogleKey ? googleKey : "",
      libraries: GOOGLE_LIBRARIES as unknown as ("places")[],
    });
  const shouldUseGoogle = hasGoogleKey && isGoogleLoaded && !googleLoadError;

  const addressValue = resolvedAddress || initialAddress;

  const handlePick = useCallback(async (pos: LatLng) => {
    setPicked(pos);
    setIsResolving(true);
    try {
      const display = await reverseGeocodeOSM(pos);
      if (display) {
        setResolvedAddress(display);
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
      } else {
        setResolvedAddress("");
      }
    } finally {
      setIsResolving(false);
    }
  }, []);

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
          {shouldUseGoogle ? (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="google-place-search">Search address</Label>
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
                  }}
                >
                  <Input
                    id="google-place-search"
                    placeholder="Search for your clinic location"
                    className="h-11"
                  />
                </Autocomplete>
                <p className="text-xs text-muted-foreground">
                  Search, then fine-tune by clicking the map.
                </p>
              </div>

              <div className={styles.mapRoot}>
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
                  {picked ? <Marker position={picked} /> : null}
                </GoogleMap>
              </div>
            </div>
          ) : (
            <div className={styles.mapRoot}>
              {hasGoogleKey && !isGoogleLoaded ? (
                <div className="flex h-full items-center justify-center rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading map...
                </div>
              ) : hasGoogleKey && googleLoadError ? (
                <div className="flex h-full items-center justify-center rounded-lg border bg-muted/30 p-6 text-sm text-muted-foreground">
                  Google Maps failed to load. Using OpenStreetMap instead.
                </div>
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
                  <CircleMarker
                    center={[picked.lat, picked.lng]}
                    radius={10}
                    pathOptions={{
                      color: "#0f766e",
                      fillColor: "#0f766e",
                      fillOpacity: 0.25,
                    }}
                  />
                ) : null}
              </MapContainer>
              )}
            </div>
          )}

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
                <Input id="resolved-address" value={addressValue} readOnly />
                {isResolving ? (
                  <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                ) : null}
              </div>
              <p className="text-xs text-muted-foreground">
                Address is auto-filled from the selected location. You can edit it after confirming.
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
                onConfirm({ address: resolvedAddress || initialAddress, location: picked });
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

