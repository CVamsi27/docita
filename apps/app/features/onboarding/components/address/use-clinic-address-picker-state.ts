"use client";

import { useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";
import { useJsApiLoader } from "@react-google-maps/api";
import type { Map as LeafletMapInstance } from "leaflet";
import {
  type ClinicAddressDetails,
  type LatLng,
  type PlaceSuggestion,
  GOOGLE_LIBRARIES,
  isValidGoogleMapsApiKey,
} from "./address-utils";

export interface AddressPickerState {
  picked: LatLng | null;
  setPicked: (value: LatLng | null) => void;
  resolvedAddress: string;
  setResolvedAddress: (value: string) => void;
  addressDraft: string;
  setAddressDraft: (value: string) => void;
  addressDetails: ClinicAddressDetails | null;
  setAddressDetails: (value: ClinicAddressDetails | null) => void;
  isResolving: boolean;
  setIsResolving: (value: boolean) => void;
  autocomplete: google.maps.places.Autocomplete | null;
  setAutocomplete: (value: google.maps.places.Autocomplete | null) => void;
}

export interface SearchState {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  suggestions: PlaceSuggestion[];
  setSuggestions: (value: PlaceSuggestion[]) => void;
  isSearching: boolean;
  setIsSearching: (value: boolean) => void;
  showSuggestions: boolean;
  setShowSuggestions: (value: boolean) => void;
  lastSearchIdRef: MutableRefObject<number>;
}

export interface MapPickerState {
  googleMap: google.maps.Map | null;
  setGoogleMap: (value: google.maps.Map | null) => void;
  leafletMap: LeafletMapInstance | null;
  setLeafletMap: (value: LeafletMapInstance | null) => void;
  mapLayoutVersion: number;
  setMapLayoutVersion: Dispatch<SetStateAction<number>>;
  mapInstanceKey: number;
  setMapInstanceKey: Dispatch<SetStateAction<number>>;
  isMapViewportReady: boolean;
  setIsMapViewportReady: Dispatch<SetStateAction<boolean>>;
  isLeafletPainted: boolean;
  setIsLeafletPainted: Dispatch<SetStateAction<boolean>>;
  leafletRetryCount: number;
  setLeafletRetryCount: Dispatch<SetStateAction<number>>;
  mapViewportRef: MutableRefObject<HTMLDivElement | null>;
}

export function useAddressPickerState(
  initialAddress: string,
): AddressPickerState {
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [addressDraft, setAddressDraft] = useState(initialAddress);
  const [addressDetails, setAddressDetails] =
    useState<ClinicAddressDetails | null>(null);
  const [isResolving, setIsResolving] = useState(false);
  const [autocomplete, setAutocomplete] =
    useState<google.maps.places.Autocomplete | null>(null);
  return {
    picked,
    setPicked,
    resolvedAddress,
    setResolvedAddress,
    addressDraft,
    setAddressDraft,
    addressDetails,
    setAddressDetails,
    isResolving,
    setIsResolving,
    autocomplete,
    setAutocomplete,
  };
}

export function useAddressSearchState(): SearchState {
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const lastSearchIdRef = useRef(0);
  const [showSuggestions, setShowSuggestions] = useState(false);
  return {
    searchQuery,
    setSearchQuery,
    suggestions,
    setSuggestions,
    isSearching,
    setIsSearching,
    showSuggestions,
    setShowSuggestions,
    lastSearchIdRef,
  };
}

export function useMapPickerState(): MapPickerState {
  const [googleMap, setGoogleMap] = useState<google.maps.Map | null>(null);
  const [leafletMap, setLeafletMap] = useState<LeafletMapInstance | null>(null);
  const [mapLayoutVersion, setMapLayoutVersion] = useState(0);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
  const [isMapViewportReady, setIsMapViewportReady] = useState(false);
  const [isLeafletPainted, setIsLeafletPainted] = useState(false);
  const [leafletRetryCount, setLeafletRetryCount] = useState(0);
  const mapViewportRef = useRef<HTMLDivElement | null>(null);
  return {
    googleMap,
    setGoogleMap,
    leafletMap,
    setLeafletMap,
    mapLayoutVersion,
    setMapLayoutVersion,
    mapInstanceKey,
    setMapInstanceKey,
    isMapViewportReady,
    setIsMapViewportReady,
    isLeafletPainted,
    setIsLeafletPainted,
    leafletRetryCount,
    setLeafletRetryCount,
    mapViewportRef,
  };
}

export function useGoogleMapsAvailability() {
  const rawGoogleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const hasGoogleKey = isValidGoogleMapsApiKey(rawGoogleKey);
  const { isLoaded: isGoogleLoaded, loadError: googleLoadError } =
    useJsApiLoader({
      id: "google-maps-script",
      googleMapsApiKey: hasGoogleKey ? rawGoogleKey.trim() : "",
      libraries: GOOGLE_LIBRARIES,
    });
  return { hasGoogleKey, isGoogleLoaded, googleLoadError };
}
