import type { UseFormReturn } from "react-hook-form";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import { ClinicAddressHeader, AddressLine1Field, AddressLine2Field, CityStateFields, CountryPostalFields, AddressPreview, GoogleMapsLinkField } from "./ClinicAddressSectionSections";

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
  const mapsLocation = clinicForm.watch("mapsLocation");
  const isPinned =
    typeof mapsLocation?.lat === "number" &&
    typeof mapsLocation?.lng === "number";
  const mapsLocationError = clinicForm.formState.errors.mapsLocation?.message;

  return (
    <div>
      <ClinicAddressHeader
        isPinned={isPinned}
        onOpenMapPicker={onOpenMapPicker}
        mapsLocationError={mapsLocationError}
      />

      <div className="mt-4 space-y-4">
        <AddressLine1Field clinicForm={clinicForm} />
        <AddressLine2Field clinicForm={clinicForm} />
        <CityStateFields clinicForm={clinicForm} />
        <CountryPostalFields
          clinicForm={clinicForm}
          resolvedCountryCode={resolvedCountryCode}
        />
        <AddressPreview addressSummary={addressSummary} />
        <GoogleMapsLinkField clinicForm={clinicForm} />
      </div>
    </div>
  );
}
