"use client";

import { Button, Input, Label } from "@workspace/ui/components";
import { DocitaLoadingIndicator } from "@workspace/ui/components/feedback/docita-loading-indicator";
import type { ClinicAddressDetails, LatLng } from "./address-picker/address-utils";

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
    <div className="grid gap-3 border-t bg-muted/10 px-4 py-4 sm:px-6">
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

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
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
