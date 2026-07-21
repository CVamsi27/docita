import { UseFormReturn } from "react-hook-form";
import { Building2 } from "lucide-react";
import type { ClinicDetails } from "@/features/onboarding/components/types";
import { ClinicAddressPickerDialog } from "@/features/onboarding/components/clinic-address-picker-dialog";
import { OnboardingStepBody, OnboardingStepCard, OnboardingStepFooter, OnboardingStepHeader } from "@/features/onboarding/components/shared";
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
    <OnboardingStepCard>
      <OnboardingStepHeader
        stepNumber={1}
        eyebrow={`${facilityLabel} details`}
        icon={<Building2 strokeWidth={1.5} />}
        title={`Tell us about your ${facilityLabel.toLowerCase()}`}
        description={`Start with the basics, then confirm your exact ${facilityLabel.toLowerCase()} location.`}
      />
      <OnboardingStepBody>
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
      </OnboardingStepBody>
      <OnboardingStepFooter
        primary={{
          label: "Continue to visit hours",
          form: "step1",
          type: "submit",
        }}
      />

      <ClinicAddressPickerDialog
        open={mapPickerOpen}
        onOpenChange={setMapPickerOpen}
        initialAddress={addressSummary}
        onConfirm={(selection) => {
          applyClinicAddressSelection(clinicForm, selection);
        }}
      />
    </OnboardingStepCard>
  );
}
