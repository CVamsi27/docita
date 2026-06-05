"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  type ClinicAddressDetails,
  type LatLng,
  DEFAULT_CENTER,
  SEARCH_DEBOUNCE_MS,
} from "./address-utils";
import {
  reverseGeocodeOSM,
  reverseGeocodeGoogle,
  searchOSM,
} from "./geocoding";
import { useMapLifecycle } from "./use-map-lifecycle";
import {
  getAddressValue,
  getCenter,
  getMapZoom,
  getCenterExpression,
  triggerGoogleMapResize,
} from "./clinic-address-picker-helpers";
import {
  useAddressPickerState,
  useAddressSearchState,
  useGoogleMapsAvailability,
  useMapPickerState,
  type AddressPickerState,
  type MapPickerState,
  type SearchState,
} from "./use-clinic-address-picker-state";

interface ClinicAddressPickerOptions {
  open: boolean;
  initialAddress: string;
}

type ReverseGeocodeResult = {
  address: string;
  details?: ClinicAddressDetails;
} | null;

export function useClinicAddressPicker({
  open,
  initialAddress,
}: ClinicAddressPickerOptions) {
  const pickerState = useAddressPickerState(initialAddress);
  const searchState = useAddressSearchState();
  const mapState = useMapPickerState();
  const googleAvailability = useGoogleMapsAvailability();
  const shouldUseGoogle =
    googleAvailability.hasGoogleKey &&
    googleAvailability.isGoogleLoaded &&
    !googleAvailability.googleLoadError;
  const addressValue = getAddressValue(
    pickerState.addressDraft,
    pickerState.resolvedAddress,
    initialAddress,
  );
  const center = useMemo(
    () => getCenter(pickerState.picked, DEFAULT_CENTER),
    [pickerState.picked],
  );
  const mapZoom = getMapZoom(pickerState.picked);
  const centerExpression = useMemo<ReturnType<typeof getCenterExpression>>(
    () => getCenterExpression(center),
    [center],
  );
  const triggerGoogleResize = useGoogleResize(
    mapState.googleMap,
    center,
    shouldUseGoogle,
  );

  useMapLifecycle({
    open,
    shouldUseGoogle,
    googleMap: mapState.googleMap,
    leafletMap: mapState.leafletMap,
    isMapViewportReady: mapState.isMapViewportReady,
    isLeafletPainted: mapState.isLeafletPainted,
    leafletRetryCount: mapState.leafletRetryCount,
    centerExpression,
    mapZoom,
    mapViewportRef: mapState.mapViewportRef,
    triggerGoogleResize,
    setMapLayoutVersion: mapState.setMapLayoutVersion,
    setMapInstanceKey: mapState.setMapInstanceKey,
    setLeafletRetryCount: mapState.setLeafletRetryCount,
    setIsLeafletPainted: mapState.setIsLeafletPainted,
  });

  useResetPickerOnOpen({
    open,
    initialAddress,
    pickerState,
    searchState,
    mapState,
  });
  useAutoLocateOnOpen({ open, shouldUseGoogle, pickerState });
  useOsmSearchSuggestions({ open, shouldUseGoogle, searchState });
  const actions = useReverseGeocodeActions({ shouldUseGoogle, pickerState });

  return {
    picked: pickerState.picked,
    addressValue,
    addressDetails: pickerState.addressDetails,
    addressDraft: pickerState.addressDraft,
    setAddressDraft: pickerState.setAddressDraft,
    isResolving: pickerState.isResolving,
    autocomplete: pickerState.autocomplete,
    setAutocomplete: pickerState.setAutocomplete,
    searchQuery: searchState.searchQuery,
    setSearchQuery: searchState.setSearchQuery,
    suggestions: searchState.suggestions,
    setSuggestions: searchState.setSuggestions,
    showSuggestions: searchState.showSuggestions,
    setShowSuggestions: searchState.setShowSuggestions,
    isSearching: searchState.isSearching,
    shouldUseGoogle,
    ...googleAvailability,
    center,
    centerExpression,
    mapZoom,
    mapInstanceKey: mapState.mapInstanceKey,
    isMapViewportReady: mapState.isMapViewportReady,
    mapLayoutVersion: mapState.mapLayoutVersion,
    mapViewportRef: mapState.mapViewportRef,
    ...actions,
    setPicked: pickerState.setPicked,
    setResolvedAddress: pickerState.setResolvedAddress,
    setAddressDetails: pickerState.setAddressDetails,
    setGoogleMap: mapState.setGoogleMap,
    setLeafletMap: mapState.setLeafletMap,
    setMapLayoutVersion: mapState.setMapLayoutVersion,
    setIsLeafletPainted: mapState.setIsLeafletPainted,
  };
}

function useGoogleResize(
  googleMap: google.maps.Map | null,
  center: LatLng,
  shouldUseGoogle: boolean,
) {
  return useCallback(() => {
    triggerGoogleMapResize(googleMap, center, shouldUseGoogle);
  }, [center, googleMap, shouldUseGoogle]);
}

function useResetPickerOnOpen(params: {
  open: boolean;
  initialAddress: string;
  pickerState: AddressPickerState;
  searchState: SearchState;
  mapState: MapPickerState;
}) {
  const { open, initialAddress, pickerState, searchState, mapState } = params;
  const {
    setAddressDraft,
    setAddressDetails,
    setResolvedAddress,
    setPicked,
  } = pickerState;
  const { setSearchQuery, setSuggestions, setShowSuggestions } = searchState;
  const {
    setMapInstanceKey,
    setIsMapViewportReady,
    setIsLeafletPainted,
    setLeafletRetryCount,
  } = mapState;
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
    return () => window.cancelAnimationFrame(frame);
  }, [
    initialAddress,
    open,
    setAddressDetails,
    setAddressDraft,
    setIsLeafletPainted,
    setIsMapViewportReady,
    setLeafletRetryCount,
    setMapInstanceKey,
    setPicked,
    setResolvedAddress,
    setSearchQuery,
    setShowSuggestions,
    setSuggestions,
  ]);
}

function useAutoLocateOnOpen(params: {
  open: boolean;
  shouldUseGoogle: boolean;
  pickerState: AddressPickerState;
}) {
  const { open, shouldUseGoogle, pickerState } = params;
  const {
    picked,
    setPicked,
    setIsResolving,
    setResolvedAddress,
    setAddressDraft,
    setAddressDetails,
  } = pickerState;
  const didAutoLocateRef = useRef(false);
  useEffect(() => {
    if (open) return;
    didAutoLocateRef.current = false;
  }, [open]);
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
      () => undefined,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
    );
  }, [
    open,
    picked,
    setAddressDetails,
    setAddressDraft,
    setIsResolving,
    setPicked,
    setResolvedAddress,
    shouldUseGoogle,
  ]);
}

function useOsmSearchSuggestions(params: {
  open: boolean;
  shouldUseGoogle: boolean;
  searchState: SearchState;
}) {
  const { open, shouldUseGoogle, searchState } = params;
  const {
    searchQuery,
    setSuggestions,
    lastSearchIdRef,
    setIsSearching,
  } = searchState;
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
          if (lastSearchIdRef.current === searchId) {
            setIsSearching(false);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [
    lastSearchIdRef,
    open,
    searchQuery,
    setIsSearching,
    setSuggestions,
    shouldUseGoogle,
  ]);
}

function useReverseGeocodeActions(params: {
  shouldUseGoogle: boolean;
  pickerState: AddressPickerState;
}) {
  const { shouldUseGoogle, pickerState } = params;
  const {
    setPicked,
    setIsResolving,
    setResolvedAddress,
    setAddressDraft,
    setAddressDetails,
  } = pickerState;
  const applyReverseResult = useCallback(
    (result: ReverseGeocodeResult) => {
      if (result) {
        setResolvedAddress(result.address);
        setAddressDraft(result.address);
        setAddressDetails(result.details ?? null);
      } else {
        setResolvedAddress("");
        setAddressDetails(null);
      }
    },
    [setAddressDetails, setAddressDraft, setResolvedAddress],
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
    [applyReverseResult, setIsResolving, setPicked],
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
    [applyReverseResult, setIsResolving, setPicked],
  );

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
      await (shouldUseGoogle ? handlePickWithGoogle(pos) : handlePick(pos));
    } catch {
      return;
    } finally {
      setIsResolving(false);
    }
  }, [handlePick, handlePickWithGoogle, setIsResolving, shouldUseGoogle]);

  return {
    handlePick,
    handlePickWithGoogle,
    handleUseMyLocation,
  };
}
