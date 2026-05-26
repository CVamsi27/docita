"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/docita-loading-indicator";
import { Button } from "@workspace/ui/components/button";
import { SymbolTooltip } from "@workspace/ui/components/tooltip";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import { LocateFixed, Search, X } from "lucide-react";
import { Autocomplete } from "@react-google-maps/api";
import {
  type ClinicAddressDetails,
  type PlaceSuggestion,
  parseGoogleAddressDetails,
  formatAddressDetails,
} from "./address-utils";

export interface AddressSearchInputProps {
  shouldUseGoogle: boolean;
  autocomplete: google.maps.places.Autocomplete | null;
  onAutocompleteLoad: (instance: google.maps.places.Autocomplete) => void;
  onPlaceChanged: (pos: { lat: number; lng: number }, address: string, details: ClinicAddressDetails | null) => void;
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  suggestions: PlaceSuggestion[];
  showSuggestions: boolean;
  setShowSuggestions: (value: boolean) => void;
  isSearching: boolean;
  isResolving: boolean;
  onSuggestionPick: (suggestion: PlaceSuggestion) => void;
  onUseMyLocation: () => void | Promise<void>;
}

export function AddressSearchInput({
  shouldUseGoogle,
  autocomplete,
  onAutocompleteLoad,
  onPlaceChanged,
  searchQuery,
  setSearchQuery,
  suggestions,
  showSuggestions,
  setShowSuggestions,
  isSearching,
  isResolving,
  onSuggestionPick,
  onUseMyLocation,
}: AddressSearchInputProps) {
  return (
    <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
      <div className="space-y-2">
        <Label htmlFor="place-search">Search address</Label>
        {shouldUseGoogle ? (
          <Autocomplete
            onLoad={onAutocompleteLoad}
            onPlaceChanged={() => {
              const place = autocomplete?.getPlace();
              const location = place?.geometry?.location;
              if (!location) return;

              const pos = { lat: location.lat(), lng: location.lng() };
              const formatted = place?.formatted_address?.trim();
              const details = parseGoogleAddressDetails(place?.address_components);
              const address =
                formatted || (details ? formatAddressDetails(details) : "");

              onPlaceChanged(pos, address, details);
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
                window.setTimeout(() => setShowSuggestions(false), 120);
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
                    }}
                    aria-label="Clear search"
                  >
                    <X className="h-4 w-4 text-muted-foreground" aria-hidden />
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
                      onSuggestionPick(suggestion);
                      setShowSuggestions(false);
                    }}
                  >
                    <div className="line-clamp-2">{suggestion.label}</div>
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
        onClick={() => void onUseMyLocation()}
        disabled={isResolving}
      >
        <LocateFixed className="mr-2 h-4 w-4" />
        Use my location
      </Button>
    </div>
  );
}
