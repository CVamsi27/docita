"use client";

import { useRef, useState } from "react";
import type { MutableRefObject } from "react";
import {
  type ClinicAddressDetails,
  type LatLng,
  type PlaceSuggestion,
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

export function useAddressPickerState(
  initialAddress: string,
): AddressPickerState {
  const [picked, setPicked] = useState<LatLng | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [addressDraft, setAddressDraft] = useState(initialAddress);
  const [addressDetails, setAddressDetails] =
    useState<ClinicAddressDetails | null>(null);
  const [isResolving, setIsResolving] = useState(false);
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


