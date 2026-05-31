"use client";

import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@workspace/ui/components/overlay/dialog";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { Input } from "@workspace/ui/components/form/input";
import { Label } from "@workspace/ui/components/form/label";
import { MapPin, X } from "lucide-react";
import type { ClinicAddressSelection } from "./address/address-utils";
import { AddressMapPreview } from "./address/AddressMapPreview";
import { AddressSearchInput } from "./address/AddressSearchInput";
import { useClinicAddressPicker } from "./address/use-clinic-address-picker";
import styles from "./clinic-address-picker-dialog.module.css";

export type {
  ClinicAddressDetails,
  ClinicAddressSelection,
} from "./address/address-utils";

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
  const picker = useClinicAddressPicker({ open, initialAddress });

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
              Search an address, then click the map or drag the pin to refine the
              location.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col bg-background">
            <div className="border-b px-4 py-4 sm:px-6">
              <AddressSearchInput
                shouldUseGoogle={picker.shouldUseGoogle}
                autocomplete={picker.autocomplete}
                onAutocompleteLoad={picker.setAutocomplete}
                onPlaceChanged={(pos, address, details) => {
                  picker.setPicked(pos);
                  picker.setResolvedAddress(address);
                  picker.setAddressDraft(address);
                  picker.setAddressDetails(details);
                }}
                searchQuery={picker.searchQuery}
                setSearchQuery={(q) => {
                  picker.setSearchQuery(q);
                  if (!q) picker.setSuggestions([]);
                }}
                suggestions={picker.suggestions}
                showSuggestions={picker.showSuggestions}
                setShowSuggestions={picker.setShowSuggestions}
                isSearching={picker.isSearching}
                isResolving={picker.isResolving}
                onSuggestionPick={(suggestion) => {
                  picker.setPicked(suggestion.position);
                  picker.setResolvedAddress(suggestion.label);
                  picker.setAddressDraft(suggestion.label);
                  picker.setAddressDetails(suggestion.details ?? null);
                  picker.setSearchQuery(suggestion.label);
                  picker.setSuggestions([]);
                }}
                onUseMyLocation={picker.handleUseMyLocation}
              />
            </div>

            <div
              ref={picker.mapViewportRef}
              className="relative flex-1 overflow-hidden p-3 sm:p-4"
            >
              <div className={styles.mapRoot}>
                <AddressMapPreview
                  picked={picker.picked}
                  center={picker.center}
                  centerExpression={picker.centerExpression}
                  mapZoom={picker.mapZoom}
                  mapInstanceKey={picker.mapInstanceKey}
                  isMapViewportReady={picker.isMapViewportReady}
                  hasGoogleKey={picker.hasGoogleKey}
                  isGoogleLoaded={picker.isGoogleLoaded}
                  googleLoadError={picker.googleLoadError}
                  shouldUseGoogle={picker.shouldUseGoogle}
                  open={open}
                  mapLayoutVersion={picker.mapLayoutVersion}
                  onPickGoogle={picker.handlePickWithGoogle}
                  onPickOSM={picker.handlePick}
                  onGoogleLoad={(map) => {
                    picker.setGoogleMap(map);
                    picker.setMapLayoutVersion((v) => v + 1);
                  }}
                  onLeafletLoad={picker.setLeafletMap}
                  onLeafletPaint={() => picker.setIsLeafletPainted(true)}
                />

                {picker.isMapViewportReady && !picker.picked ? (
                  <div className="pointer-events-none absolute inset-x-0 top-3 z-[450] flex justify-center px-3">
                    <div className="flex items-center gap-2 rounded-full border border-border/70 bg-background/95 px-3.5 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-primary" />
                      Click the map, search, or use your location to drop the pin
                    </div>
                  </div>
                ) : null}
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
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={() => {
                    if (!picker.picked) return;
                    onConfirm({
                      address: picker.addressValue,
                      location: picker.picked,
                      details: picker.addressDetails ?? undefined,
                    });
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
