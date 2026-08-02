"use client";

import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Button, Input, Label } from "@workspace/ui/components";
import { ClearSearchButton } from "@/components/buttons/clear-search-button";
import { LocateFixed, Search } from "lucide-react";
import type { PlaceSuggestion } from "./address-utils";

export interface AddressSearchInputProps {
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
            <ClearSearchButton onClear={() => setSearchQuery("")} />
          ) : null}
          {showSuggestions && suggestions.length > 0 ? (
            <div className="absolute z-50 mt-2 w-full rounded-lg border bg-popover shadow-lg">
              {suggestions.map((suggestion) => (
                <Button
                  key={suggestion.id}
                  variant="ghost"
                  className="block w-full px-3 py-2 text-left text-sm h-auto justify-start hover:bg-muted/40"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSuggestionPick(suggestion);
                    setShowSuggestions(false);
                  }}
                  aria-label={`Select ${suggestion.label}`}
                >
                  <div className="line-clamp-2">{suggestion.label}</div>
                </Button>
              ))}
            </div>
          ) : null}
        </div>
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
