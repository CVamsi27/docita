"use client";

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
import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { MapPin, X } from "lucide-react";
import { useJsApiLoader } from "@react-google-maps/api";
import type { LatLngExpression } from "leaflet";
import type { Map as LeafletMapInstance } from "leaflet";
import {
  type ClinicAddressDetails,
  type ClinicAddressSelection,
  type LatLng,
  type PlaceSuggestion,
  DEFAULT_CENTER,
  GOOGLE_LIBRARIES,
  SEARCH_DEBOUNCE_MS,
  isValidGoogleMapsApiKey,
} from "./address/address-utils";
import {
  reverseGeocodeOSM,
  reverseGeocodeGoogle,
  searchOSM,
} from "./address/geocoding";
import { AddressMapPreview } from "./address/AddressMapPreview";
import { AddressSearchInput } from "./address/AddressSearchInput";
import { useMapLifecycle } from "./address/use-map-lifecycle";
import styles from "./clinic-address-picker-dialog.module.css";

export type { ClinicAddressDetails, ClinicAddressSelection };

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
  const [addressDetails, setAddressDetails] = useState<ClinicAddressDetails | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [autocomplete, setAutocomplete] = useState<google.maps.places.Autocomplete | null>(null);
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
  const { isLoaded: isGoogleLoaded, loadError: googleLoadError } = useJsApiLoader({
    id: "google-maps-script",
    googleMapsApiKey: hasGoogleKey ? rawGoogleKey.trim() : "",
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

  useMapLifecycle({
    open,
    shouldUseGoogle,
    googleMap,
    leafletMap,
    isMapViewportReady,
    isLeafletPainted,
    leafletRetryCount,
    centerExpression,
    mapZoom,
    mapViewportRef,
    triggerGoogleResize,
    setMapLayoutVersion,
    setMapInstanceKey,
    setLeafletRetryCount,
    setIsLeafletPainted,
  });

  // Reset state on open
  useEffect(() => {
    if (!open) return;
    setMapInstanceKey((v) => v + 1);
    setIsMapViewportReady(false);
    setIsLeafletPainted(false);
    setLeafletRetryCount(0);
    const frame = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => setIsMapViewportReady(true));
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

  // Auto-geolocate on open
  useEffect(() => {
    if (!open || picked || didAutoLocateRef.current) return;
    if (!navigator.geolocation) return;
    didAutoLocateRef.current = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const next = { lat: position.coords.latitude, lng: position.coords.longitude };
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
      () => { /* Ignore geolocation denial */ },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [open, picked, shouldUseGoogle]);

  // OSM search debounce
  useEffect(() => {
    if (!open || shouldUseGoogle) return;
    const q = searchQuery.trim();
    if (q.length < 3) { setSuggestions([]); return; }
    const searchId = ++lastSearchIdRef.current;
    setIsSearching(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const results = await searchOSM(q);
          if (lastSearchIdRef.current !== searchId) return;
          setSuggestions(results);
        } finally {
          if (lastSearchIdRef.current === searchId) setIsSearching(false);
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [open, searchQuery, shouldUseGoogle]);

  const applyReverseResult = useCallback(
    (result: { address: string; details?: ClinicAddressDetails } | null) => {
      if (result) {
        setResolvedAddress(result.address);
        setAddressDraft(result.address);
        setAddressDetails(result.details ?? null);
      } else {
        setResolvedAddress("");
        setAddressDetails(null);
      }
    },
    [],
  );

  const handlePick = useCallback(async (pos: LatLng) => {
    setPicked(pos);
    setIsResolving(true);
    try { applyReverseResult(await reverseGeocodeOSM(pos)); }
    finally { setIsResolving(false); }
  }, [applyReverseResult]);

  const handlePickWithGoogle = useCallback(async (pos: LatLng) => {
    setPicked(pos);
    setIsResolving(true);
    try { applyReverseResult(await reverseGeocodeGoogle(pos)); }
    finally { setIsResolving(false); }
  }, [applyReverseResult]);

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
      await (shouldUseGoogle ? handlePickWithGoogle(pos) : handlePick(pos));
    } catch { /* Silent fail */ } finally { setIsResolving(false); }
  }, [handlePick, handlePickWithGoogle, shouldUseGoogle]);

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
              Search an address, then click the map or drag the pin to refine the location.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col bg-background">
            <div className="border-b px-4 py-4 sm:px-6">
              <AddressSearchInput
                shouldUseGoogle={shouldUseGoogle}
                autocomplete={autocomplete}
                onAutocompleteLoad={setAutocomplete}
                onPlaceChanged={(pos, address, details) => {
                  setPicked(pos);
                  setResolvedAddress(address);
                  setAddressDraft(address);
                  setAddressDetails(details);
                }}
                searchQuery={searchQuery}
                setSearchQuery={(q) => {
                  setSearchQuery(q);
                  if (!q) setSuggestions([]);
                }}
                suggestions={suggestions}
                showSuggestions={showSuggestions}
                setShowSuggestions={setShowSuggestions}
                isSearching={isSearching}
                isResolving={isResolving}
                onSuggestionPick={(suggestion: PlaceSuggestion) => {
                  setPicked(suggestion.position);
                  setResolvedAddress(suggestion.label);
                  setAddressDraft(suggestion.label);
                  setAddressDetails(suggestion.details ?? null);
                  setSearchQuery(suggestion.label);
                  setSuggestions([]);
                }}
                onUseMyLocation={handleUseMyLocation}
              />
            </div>

            <div ref={mapViewportRef} className="relative flex-1 overflow-hidden p-3 sm:p-4">
              <div className={styles.mapRoot}>
                <AddressMapPreview
                  picked={picked}
                  center={center}
                  centerExpression={centerExpression}
                  mapZoom={mapZoom}
                  mapInstanceKey={mapInstanceKey}
                  isMapViewportReady={isMapViewportReady}
                  hasGoogleKey={hasGoogleKey}
                  isGoogleLoaded={isGoogleLoaded}
                  googleLoadError={googleLoadError}
                  shouldUseGoogle={shouldUseGoogle}
                  open={open}
                  mapLayoutVersion={mapLayoutVersion}
                  onPickGoogle={handlePickWithGoogle}
                  onPickOSM={handlePick}
                  onGoogleLoad={(map) => {
                    setGoogleMap(map);
                    setMapLayoutVersion((v) => v + 1);
                  }}
                  onLeafletLoad={setLeafletMap}
                  onLeafletPaint={() => setIsLeafletPainted(true)}
                />
              </div>
            </div>

            <div className="grid gap-3 border-t bg-muted/10 px-4 py-4 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end">
              <div className="rounded-lg border bg-background px-3 py-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="h-4 w-4" />
                  <span>Coordinates</span>
                </div>
                <p className="mt-1 font-mono text-foreground">
                  {picker.picked
                    ? `${picker.picked.lat.toFixed(6)}, ${picker.picked.lng.toFixed(6)}`
                    : "Pick a location on the map"}
                </p>
              </div>

              <div>
                <Label htmlFor="resolved-address">Address</Label>
                <div className="relative mt-2">
                  <Input
                    id="resolved-address"
                    value={picker.addressValue}
                    onChange={(event) => picker.setAddressDraft(event.target.value)}
                  />
                  {picker.isResolving ? (
                    <DocitaLoadingIndicator
                      variant="inline"
                      decorative
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                    />
                  ) : null}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-2 sm:flex-row lg:justify-end">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!picked) return;
                    onConfirm({ address: addressValue, location: picked, details: addressDetails ?? undefined });
                    onOpenChange(false);
                  }}
                  disabled={!picker.picked || picker.isResolving}
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
