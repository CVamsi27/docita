"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import type { LatLngExpression } from "leaflet";
import type { Map as LeafletMapInstance } from "leaflet";
import {
  type ClinicAddressDetails,
  type LatLng,
  type PlaceSuggestion,
  DEFAULT_CENTER,
  GOOGLE_LIBRARIES,
  SEARCH_DEBOUNCE_MS,
  isValidGoogleMapsApiKey,
} from "./address-utils";
import {
  reverseGeocodeOSM,
  reverseGeocodeGoogle,
  searchOSM,
} from "./geocoding";
import { useMapLifecycle } from "./use-map-lifecycle";

export function useClinicAddressPicker({
  open,
  initialAddress,
}: {
  open: boolean;
  initialAddress: string;
}) {
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [addressDraft, setAddressDraft] = useState(initialAddress);
  const [addressDetails, setAddressDetails] = useState<ClinicAddressDetails | null>(
    null,
  );
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
        /* Ignore geolocation denial */
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [open, picked, shouldUseGoogle]);

  useEffect(() => {
    if (!open || shouldUseGoogle) return;
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

  const handlePick = useCallback(
    async (pos: LatLng) => {
      setPicked(pos);
      setIsResolving(true);
      try {
        applyReverseResult(await reverseGeocodeOSM(pos));
      } finally {
        setIsResolving(false);
      }
    },
    [applyReverseResult],
  );

  const handlePickWithGoogle = useCallback(
    async (pos: LatLng) => {
      setPicked(pos);
      setIsResolving(true);
      try {
        applyReverseResult(await reverseGeocodeGoogle(pos));
      } finally {
        setIsResolving(false);
      }
    },
    [applyReverseResult],
  );

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
    } catch {
      /* Silent fail */
    } finally {
      setIsResolving(false);
    }
  }, [handlePick, handlePickWithGoogle, shouldUseGoogle]);

  return {
    picked,
    addressValue,
    addressDetails,
    addressDraft,
    setAddressDraft,
    isResolving,
    autocomplete,
    setAutocomplete,
    searchQuery,
    setSearchQuery,
    suggestions,
    setSuggestions,
    showSuggestions,
    setShowSuggestions,
    isSearching,
    shouldUseGoogle,
    hasGoogleKey,
    isGoogleLoaded,
    googleLoadError,
    center,
    centerExpression,
    mapZoom,
    mapInstanceKey,
    isMapViewportReady,
    mapLayoutVersion,
    mapViewportRef,
    handlePick,
    handlePickWithGoogle,
    handleUseMyLocation,
    setPicked,
    setResolvedAddress,
    setAddressDetails,
    setGoogleMap,
    setLeafletMap,
    setMapLayoutVersion,
    setIsLeafletPainted,
  };
}
