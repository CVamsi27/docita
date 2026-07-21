"use client";

import {
  Button,
  Input,
  Label
} from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import { MapPin } from "lucide-react";
import type { ClinicAddressDetails, LatLng } from "./address/address-utils";

interface ClinicAddressPickerFooterProps {
  picked: LatLng | null;
  addressValue: string;
  isResolving: boolean;
  onAddressDraftChange: (value: string) => void;
  addressDetails: ClinicAddressDetails | null;
  onCancel: () => void;
  onConfirm: (value: {
    address: string;
    location: LatLng;
    details?: ClinicAddressDetails;
  }) => void;
}

export function ClinicAddressPickerFooter({
  picked,
  addressValue,
  isResolving,
  onAddressDraftChange,
  addressDetails,
  onCancel,
  onConfirm,
}: ClinicAddressPickerFooterProps) {
  return (
    <div className="grid gap-3 border-t bg-muted/10 px-4 py-4 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto] lg:items-end">
      <div className="rounded-lg border bg-background px-3 py-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4" />
          <span>Coordinates</span>
        </div>
        <p className="mt-1 font-mono text-foreground">
          {picked
            ? `${picked.lat.toFixed(6)}, ${picked.lng.toFixed(6)}`
            : "Pick a location on the map"}
        </p>
      </div>

      <div>
        <Label htmlFor="resolved-address">Address</Label>
        <div className="relative mt-2">
          <Input
            id="resolved-address"
            value={addressValue}
            onChange={(event) => onAddressDraftChange(event.target.value)}
          />
          {isResolving ? (
            <DocitaLoadingIndicator
              variant="inline"
              decorative
              className="absolute right-3 top-1/2 -translate-y-1/2"
            />
          ) : null}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row lg:justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          onClick={() => {
            if (!picked) return;
            onConfirm({
              address: addressValue,
              location: picked,
              details: addressDetails ?? undefined,
            });
            onCancel();
          }}
          disabled={!picked || isResolving}
        >
          Use this location
        </Button>
      </div>
    </div>
  );
}
