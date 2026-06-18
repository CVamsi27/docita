"use client";

import type { UseFormReturn } from "react-hook-form";
import { Form } from "@workspace/ui/components/form/form";
import type {
  ClinicSettingsFormValues,
  FacilityTypeType,
} from "@workspace/types";
import {
  IdentitySection,
  LocationSection,
  ContactComplianceSection,
  FormFooter,
} from "./clinic-general-settings-form-sections";

export function ClinicGeneralSettingsForm({
  form,
  facilityLabel,
  watchedMapsLink,
  isPending,
  facilityLabelValues,
  onSubmit,
}: {
  form: UseFormReturn<ClinicSettingsFormValues>;
  facilityLabel: string;
  watchedMapsLink: string;
  isPending: boolean;
  facilityLabelValues: readonly FacilityTypeType[];
  onSubmit: (data: ClinicSettingsFormValues) => void;
}) {
  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-8"
      >
        <IdentitySection
          form={form}
          facilityLabel={facilityLabel}
          facilityLabelValues={facilityLabelValues}
        />
        <LocationSection form={form} watchedMapsLink={watchedMapsLink} />
        <ContactComplianceSection form={form} />
        <FormFooter form={form} isPending={isPending} />
      </form>
    </Form>
  );
}
