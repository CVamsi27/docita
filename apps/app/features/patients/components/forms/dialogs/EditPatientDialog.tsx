"use client";

import React, { FC } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Patient } from "@workspace/types";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useUpdatePatient } from "@workspace/data-access";
import { FormDialog } from "@workspace/ui/components/form/form-dialog";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  Form,
} from "@workspace/ui/components/form/form";
import { updatePatientRequestSchema } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import { validatePatientPhoneNumberForCountry } from "@/features/patients/rules/patient-rules";
import {
  PatientBasicInfoFields,
  PatientDemographicFields,
  DialogActionButtons,
} from "./EditPatientDialogSections";
import { GENDER_VALUES } from "./EditPatientDialogHelpers";

interface EditPatientDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  patient?: Patient | null;
  onPatientUpdated?: () => void;
}

export const EditPatientDialog: FC<EditPatientDialogProps> = ({
  open = false,
  onOpenChange,
  patient,
  onPatientUpdated,
}) => {
  const updatePatient = useUpdatePatient(patient?.id ?? "");
  const { clinic } = useClinic();
  type PatientUpdateFormValues = z.infer<typeof updatePatientRequestSchema>;

  const form = useForm<PatientUpdateFormValues>({
    resolver: zodResolver(updatePatientRequestSchema),
    values: patient
      ? {
          firstName: patient.firstName ?? "",
          lastName: patient.lastName ?? "",
          phoneNumber: patient.phoneNumber ?? null,
          email: patient.email ?? null,
          gender:
            parseStringEnumMember(GENDER_VALUES, patient.gender ?? "MALE") ??
            "MALE",
          dateOfBirth: patient.dateOfBirth
            ? String(patient.dateOfBirth).split("T")[0]
            : null,
          address: typeof patient.address === "string" ? patient.address : null,
          mrn: patient.mrn ?? null,
          metadata: null,
          clinicId: undefined,
        }
      : undefined,
  });

  const handleInvalidSubmit = () => {
    showUserFacingErrorToast(
      "Please check the highlighted fields and try again.",
      "Please check the highlighted fields and try again.",
      "form",
    );
  };

  const handleSubmit = form.handleSubmit(async (values) => {
    if (!patient) return;
    try {
      const phoneError = validatePatientPhoneNumberForCountry(
        values.phoneNumber,
        clinic?.countryCode,
      );
      if (phoneError) {
        form.setError("phoneNumber", {
          type: "manual",
          message: phoneError,
        });
        showUserFacingErrorToast(
          "Please check the highlighted fields and try again.",
          "Please check the highlighted fields and try again.",
          "form",
        );
        return;
      }

      await updatePatient.mutateAsync(
        updatePatientRequestSchema.parse({
          ...values,
          firstName: values.firstName?.trim() || undefined,
          lastName: values.lastName?.trim() || undefined,
          gender: values.gender || undefined,
          phoneNumber: values.phoneNumber?.trim() || undefined,
          email: values.email?.trim() || undefined,
          dateOfBirth: values.dateOfBirth || undefined,
        }),
      );
      toast.success("Patient updated successfully");
      onPatientUpdated?.();
      onOpenChange?.(false);
    } catch {
      showUserFacingErrorToast(
        "We could not save this patient. Please try again.",
      );
    }
  }, handleInvalidSubmit);

  if (!patient) return null;

  return (
    <FormDialog
      open={open}
      onOpenChange={(o) => onOpenChange?.(o)}
      title="Edit Patient"
      description="Update the patient's information"
    >
      <Form {...form}>
        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <PatientBasicInfoFields control={form.control} />
            <PatientDemographicFields control={form.control} />
          </div>

          <DialogActionButtons
            form={form}
            onCancel={() => onOpenChange?.(false)}
            isPending={updatePatient.isPending}
          />
        </form>
      </Form>
    </FormDialog>
  );
};
