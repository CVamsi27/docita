"use client";

import { Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle, SymbolTooltip } from "@workspace/ui/components";
import { MapPin, X } from "lucide-react";
import type { ClinicAddressSelection } from "./address-picker/address-utils";
import { AddressSearchInput } from "./address-picker/AddressSearchInput";
import { useClinicAddressPicker } from "./address-picker/use-clinic-address-picker";
import { ClinicAddressPickerFooter } from "./clinic-address-picker-dialog-sections";


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
        className="max-h-[92dvh] w-[min(100vw-1rem,720px)] max-w-none overflow-hidden rounded-lg border border-border/70 bg-background p-0 shadow-md data-[state=open]:animate-none data-[state=closed]:animate-none sm:w-[min(100vw-2rem,720px)]"
      >
        <div className="flex h-full max-h-[92dvh] min-h-0 flex-col">
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
              Search an address or use your current location, then confirm the
              pin coordinates for the facility.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-background">
            <div className="border-b px-4 py-4 sm:px-6">
              <AddressSearchInput
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

            <div className="flex-1 px-4 py-4 sm:px-6">
              <div className="flex min-h-[120px] items-center gap-3 rounded-lg border border-dashed bg-muted/20 p-4">
                <MapPin className="h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0 space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    {picker.picked
                      ? "Location selected"
                      : "No location selected yet"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {picker.picked
                      ? `${picker.picked.lat.toFixed(6)}, ${picker.picked.lng.toFixed(6)}`
                      : "Search an address or use your location to drop the pin"}
                  </p>
                </div>
              </div>
            </div>

            <ClinicAddressPickerFooter
              picked={picker.picked}
              addressValue={picker.addressValue}
              isResolving={picker.isResolving}
              onAddressDraftChange={picker.setAddressDraft}
              addressDetails={picker.addressDetails}
              onCancel={() => onOpenChange(false)}
              onConfirm={onConfirm}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
