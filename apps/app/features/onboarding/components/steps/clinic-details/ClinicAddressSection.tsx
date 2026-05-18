import { UseFormReturn } from "react-hook-form";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Label } from "@workspace/ui/components/label";
import type { ClinicDetails } from "@/features/onboarding/components/types";

interface ClinicAddressSectionProps {
  clinicForm: UseFormReturn<ClinicDetails>;
  resolvedCountryCode: string;
  addressSummary: string;
  onOpenMapPicker: () => void;
}

export function ClinicAddressSection({
  clinicForm,
  resolvedCountryCode,
  addressSummary,
  onOpenMapPicker,
}: ClinicAddressSectionProps) {
  return (
    <div className="rounded-lg border bg-muted/20 p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <Label className="text-base font-semibold" htmlFor="addressLine1">
            Address
          </Label>
          <p className="text-xs text-muted-foreground">
            Use a structured address so it adapts cleanly across regions
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 rounded-lg sm:self-start"
          onClick={onOpenMapPicker}
        >
          Open map picker
        </Button>
      </div>

      <div className="mt-4 space-y-4">
        <div className="space-y-2">
          <Label htmlFor="addressLine1">
            Address Line 1<span className="text-destructive ml-0.5">*</span>
          </Label>
          <Input
            id="addressLine1"
            {...clinicForm.register("addressLine1")}
            placeholder="Address line 1"
            aria-invalid={!!clinicForm.formState.errors.addressLine1}
            aria-describedby={
              clinicForm.formState.errors.addressLine1
                ? "clinic-address-line1-error"
                : undefined
            }
          />
          {clinicForm.formState.errors.addressLine1 && (
            <p
              id="clinic-address-line1-error"
              className="text-sm text-destructive"
            >
              {clinicForm.formState.errors.addressLine1.message}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="addressLine2">Address Line 2</Label>
          <Input
            id="addressLine2"
            {...clinicForm.register("addressLine2")}
            placeholder="Address line 2"
            aria-invalid={!!clinicForm.formState.errors.addressLine2}
            aria-describedby={
              clinicForm.formState.errors.addressLine2
                ? "clinic-address-line2-error"
                : undefined
            }
          />
          {clinicForm.formState.errors.addressLine2 && (
            <p
              id="clinic-address-line2-error"
              className="text-sm text-destructive"
            >
              {clinicForm.formState.errors.addressLine2.message}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="city">
              City<span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="city"
              {...clinicForm.register("city")}
              placeholder="City"
              aria-invalid={!!clinicForm.formState.errors.city}
              aria-describedby={
                clinicForm.formState.errors.city
                  ? "clinic-city-error"
                  : undefined
              }
            />
            {clinicForm.formState.errors.city && (
              <p id="clinic-city-error" className="text-sm text-destructive">
                {clinicForm.formState.errors.city.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="state">
              State / Province
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              id="state"
              {...clinicForm.register("state")}
              placeholder="State"
              aria-invalid={!!clinicForm.formState.errors.state}
              aria-describedby={
                clinicForm.formState.errors.state
                  ? "clinic-state-error"
                  : undefined
              }
            />
            {clinicForm.formState.errors.state && (
              <p id="clinic-state-error" className="text-sm text-destructive">
                {clinicForm.formState.errors.state.message}
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="countryCode">Country</Label>
            <Input
              id="countryCode"
              readOnly
              value={resolvedCountryCode}
              className="bg-background/60"
              aria-describedby="clinic-country-help"
            />
            <p
              id="clinic-country-help"
              className="text-xs text-muted-foreground"
            >
              Synced with the phone country selection
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pincode">Postal Code / Pincode</Label>
            <Input
              id="pincode"
              {...clinicForm.register("pincode")}
              placeholder="Postal code"
              aria-invalid={!!clinicForm.formState.errors.pincode}
              aria-describedby={
                clinicForm.formState.errors.pincode
                  ? "clinic-pincode-error"
                  : undefined
              }
            />
            {clinicForm.formState.errors.pincode && (
              <p
                id="clinic-pincode-error"
                className="text-sm text-destructive"
              >
                {clinicForm.formState.errors.pincode.message}
              </p>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-background/70 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Address preview
          </p>
          <p className="mt-2 text-sm leading-6 text-foreground">
            {addressSummary || "Your structured address will appear here"}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="mapsLink">Google Maps link</Label>
          <Input
            id="mapsLink"
            type="url"
            inputMode="url"
            autoComplete="url"
            {...clinicForm.register("mapsLink")}
            placeholder="https://maps.google.com/..."
            aria-invalid={!!clinicForm.formState.errors.mapsLink}
            aria-describedby={
              clinicForm.formState.errors.mapsLink
                ? "clinic-maps-link-error"
                : "clinic-maps-link-help"
            }
          />
          {clinicForm.formState.errors.mapsLink ? (
            <p
              id="clinic-maps-link-error"
              className="text-sm text-destructive"
            >
              {clinicForm.formState.errors.mapsLink.message}
            </p>
          ) : (
            <p
              id="clinic-maps-link-help"
              className="text-xs text-muted-foreground"
            >
              Paste a Google Maps share link (or Plus code URL). Patients see
              this in appointment confirmations next to the date and time.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
