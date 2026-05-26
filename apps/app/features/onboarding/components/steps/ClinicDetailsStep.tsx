import { UseFormReturn } from "react-hook-form";
import { Button } from "@workspace/ui/components/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import {
  ClinicAddressPickerDialog,
} from "@/features/onboarding/components/clinic-address-picker-dialog";
import { useClinicDetailsStep } from "./clinic-details/use-clinic-details-step";
import { composeClinicAddress, applyClinicAddressSelection } from "./clinic-details/clinic-details-utils";
import { ClinicIdentitySection } from "./clinic-details/ClinicIdentitySection";
import { ClinicContactSection } from "./clinic-details/ClinicContactSection";
import { ClinicAddressSection } from "./clinic-details/ClinicAddressSection";
import { ClinicBusinessSection } from "./clinic-details/ClinicBusinessSection";

interface ClinicDetailsStepProps {
  clinicForm: UseFormReturn<ClinicDetails>;
  onSubmit: (data: ClinicDetails) => void;
}

export function ClinicDetailsStep({
  clinicForm,
  onSubmit,
}: ClinicDetailsStepProps) {
  const {
    mapPickerOpen,
    setMapPickerOpen,
    shouldUseClinicTypeRadio,
    facilityLabel,
    resolvedCountryCode,
    addressSummary,
  } = useClinicDetailsStep(clinicForm);

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="ui-section-title text-[var(--fs-lg)] sm:text-[var(--fs-2xl)]">
          Step 1: {facilityLabel} Details
        </CardTitle>
        <p className="ui-page-subtitle">
          Start with the basics, then confirm your exact{" "}
          {facilityLabel.toLowerCase()} location
        </p>
      </CardHeader>
      <CardContent>
        <form
          id="step1"
          onSubmit={clinicForm.handleSubmit((data) =>
            onSubmit({
              ...data,
              address: composeClinicAddress(data),
            }),
          )}
          noValidate
          className="space-y-6"
        >
          <ClinicIdentitySection
            clinicForm={clinicForm}
            facilityLabel={facilityLabel}
            shouldUseClinicTypeRadio={shouldUseClinicTypeRadio}
          />

          <ClinicContactSection
            clinicForm={clinicForm}
            facilityLabel={facilityLabel}
          />

          <ClinicAddressSection
            clinicForm={clinicForm}
            resolvedCountryCode={resolvedCountryCode}
            addressSummary={addressSummary}
            onOpenMapPicker={() => setMapPickerOpen(true)}
          />

          <ClinicBusinessSection clinicForm={clinicForm} />
        </form>
      </CardContent>
      <CardFooter>
        <Button className="w-full" form="step1" type="submit">
          Next: Visit hours
        </Button>
      </CardFooter>

      <ClinicAddressPickerDialog
        open={mapPickerOpen}
        onOpenChange={setMapPickerOpen}
        initialAddress={addressSummary}
        onConfirm={(selection) => {
          applyClinicAddressSelection(clinicForm, selection);
        }}
      />
    </Card>
  );
}
