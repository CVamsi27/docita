"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  usePrescriptionDefaults,
  useUpdatePrescriptionDefaults,
} from "@workspace/data-access";
import { toast } from "sonner";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { Form } from "@workspace/ui/components/form/form";
import {
  prescriptionDefaultsFormSchema,
  type PrescriptionDefaultsFormValues,
} from "@workspace/types";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  PrescriptionDefaultsSkeleton,
  PrescriptionDefaultsCardHeader,
  PrescriptionDefaultsInstructionsField,
  PrescriptionDefaultsFooterField,
  PrescriptionDefaultsCheckboxGroup,
  PrescriptionDefaultsFormActions,
} from "./PrescriptionDefaultsSettingsSections";

function PrescriptionDefaultsSettings() {
  const {
    data: initialSettings,
    isLoading: loading,
    refetch,
  } = usePrescriptionDefaults();
  const { mutate: updateSettings, isPending: saving } =
    useUpdatePrescriptionDefaults();
  const form = useForm<PrescriptionDefaultsFormValues>({
    resolver: zodResolver(prescriptionDefaultsFormSchema),
    defaultValues: {
      defaultInstructions: "",
      defaultFooterText: "",
      includeClinicHeader: true,
      includeDoctorSignature: true,
      includeQRCode: false,
    },
  });
  useEffect(() => {
    if (initialSettings) {
      form.reset({
        defaultInstructions: initialSettings.defaultInstructions ?? "",
        defaultFooterText: initialSettings.defaultFooterText ?? "",
        includeClinicHeader: initialSettings.includeClinicHeader ?? true,
        includeDoctorSignature: initialSettings.includeDoctorSignature ?? true,
        includeQRCode: initialSettings.includeQRCode ?? false,
      });
    }
  }, [initialSettings, form]);
  const onSubmit = (values: PrescriptionDefaultsFormValues) => {
    updateSettings(values, {
      onSuccess: () => {
        toast.success("Prescription defaults have been updated successfully");
        refetch();
      },
      onError: (error) => {
        showUserFacingErrorToast(
          error,
          "We could not save your prescription defaults. Please try again.",
          "save",
        );
      },
    });
  };
  if (loading) return <PrescriptionDefaultsSkeleton />;
  return (
    <Card>
      <PrescriptionDefaultsCardHeader />
      <CardContent className="pt-5">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            noValidate
            className="flex flex-col gap-6"
          >
            <PrescriptionDefaultsInstructionsField form={form} />
            <PrescriptionDefaultsFooterField form={form} />
            <PrescriptionDefaultsCheckboxGroup form={form} />
            <PrescriptionDefaultsFormActions saving={saving} />
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

export const PrescriptionDefaultsSettingsContainer =
  PrescriptionDefaultsSettings;
