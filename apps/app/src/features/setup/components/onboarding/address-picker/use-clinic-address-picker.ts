"use client";

import { useCallback, useEffect, useRef } from "react";
import {
  type ClinicAddressDetails,
  type LatLng,
  SEARCH_DEBOUNCE_MS,
} from "./address-utils";
import { reverseGeocodeOSM, searchOSM } from "./geocoding";
import {
  useAddressPickerState,
  useAddressSearchState,
  type AddressPickerState,
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
  const addressValue =
    pickerState.addressDraft || pickerState.resolvedAddress || initialAddress;

  useResetPickerOnOpen({ open, initialAddress, pickerState, searchState });
  useAutoLocateOnOpen({ open, pickerState });
  useOsmSearchSuggestions({ open, searchState });
  const actions = useReverseGeocodeActions(pickerState);

  return {
    picked: pickerState.picked,
    addressValue,
    addressDetails: pickerState.addressDetails,
    addressDraft: pickerState.addressDraft,
    setAddressDraft: pickerState.setAddressDraft,
    isResolving: pickerState.isResolving,
    searchQuery: searchState.searchQuery,
    setSearchQuery: searchState.setSearchQuery,
    suggestions: searchState.suggestions,
    setSuggestions: searchState.setSuggestions,
    showSuggestions: searchState.showSuggestions,
    setShowSuggestions: searchState.setShowSuggestions,
    isSearching: searchState.isSearching,
    handleUseMyLocation: actions.handleUseMyLocation,
    setPicked: pickerState.setPicked,
    setResolvedAddress: pickerState.setResolvedAddress,
    setAddressDetails: pickerState.setAddressDetails,
  };
}

function useResetPickerOnOpen(params: {
  open: boolean;
  initialAddress: string;
  pickerState: AddressPickerState;
  searchState: SearchState;
}) {
  const { open, initialAddress, pickerState, searchState } = params;
  const {
    setAddressDraft,
    setAddressDetails,
    setResolvedAddress,
    setPicked,
  } = pickerState;
  const { setSearchQuery, setSuggestions, setShowSuggestions } = searchState;
  useEffect(() => {
    if (!open) return;
    setAddressDraft(initialAddress);
    setAddressDetails(null);
    setResolvedAddress("");
    setPicked(null);
    setSearchQuery("");
    setSuggestions([]);
    setShowSuggestions(false);
  }, [
    initialAddress,
    open,
    setAddressDetails,
    setAddressDraft,
    setPicked,
    setResolvedAddress,
    setSearchQuery,
    setShowSuggestions,
    setSuggestions,
  ]);
}

function useAutoLocateOnOpen(params: {
  open: boolean;
  pickerState: AddressPickerState;
}) {
  const { open, pickerState } = params;
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
            const result = await reverseGeocodeOSM(next);
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
  ]);
}

function useOsmSearchSuggestions(params: {
  open: boolean;
  searchState: SearchState;
}) {
  const { open, searchState } = params;
  const { searchQuery, setSuggestions, lastSearchIdRef, setIsSearching } =
    searchState;
  useEffect(() => {
    if (!open) return;
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
  }, [lastSearchIdRef, open, searchQuery, setIsSearching, setSuggestions]);
}

function useReverseGeocodeActions(pickerState: AddressPickerState) {
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
      await handlePick(pos);
    } catch {
      return;
    } finally {
      setIsResolving(false);
    }
  }, [handlePick, setIsResolving]);

  return {
    handlePick,
    handleUseMyLocation,
  };
}
