"use client";

import React, { FC, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Patient } from "@workspace/types";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useUpdatePatient, useVerifyPatientAbha } from "@workspace/data-access";
import { FormDialog } from "@workspace/ui/components/form/form-dialog";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import { Form } from "@workspace/ui/components/form/form";
import { updatePatientRequestSchema } from "@workspace/types";
import { parseStringEnumMember } from "@workspace/utils";
import { validatePatientPhoneNumberForCountry } from "@/features/patients/rules/patient-rules";
import {
  PatientBasicInfoFields,
  PatientDemographicFields,
  DialogActionButtons,
} from "./EditPatientDialogSections";
import { GENDER_VALUES } from "./EditPatientDialogHelpers";
import {
  AbhaVerificationField,
  type AbhaVerificationUiState,
} from "./abha-verification-field";
import {
  getAbhaVerificationErrorState,
  getAbhaVerificationResultState,
} from "./abha-verification-errors";

interface EditPatientDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  patient?: Patient | null;
  onPatientUpdated?: () => void;
}

function getInitialAbhaStatus(
  patient?: Patient | null,
): AbhaVerificationUiState {
  if (patient?.abhaVerifiedAt) {
    return {
      kind: "verified",
      message: "ABHA verified",
      detail: patient.abhaKycName
        ? `ABDM KYC name: ${patient.abhaKycName}`
        : "The ABHA identity is linked to this patient.",
    };
  }
  return {
    kind: "idle",
    message: "Verify the ABHA address after saving or editing the value.",
  };
}

export const EditPatientDialog: FC<EditPatientDialogProps> = ({
  open = false,
  onOpenChange,
  patient,
  onPatientUpdated,
}) => {
  const updatePatient = useUpdatePatient(patient?.id ?? "");
  const verifyAbha = useVerifyPatientAbha();
  const { clinic } = useClinic();
  type PatientUpdateFormValues = z.infer<typeof updatePatientRequestSchema>;
  const initialAbhaStatus = useMemo(
    () => getInitialAbhaStatus(patient),
    [patient],
  );
  const [abhaStatus, setAbhaStatus] =
    useState<AbhaVerificationUiState>(initialAbhaStatus);

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
          abhaAddress: patient.abhaAddress ?? null,
          mrn: patient.mrn ?? null,
          metadata: null,
          clinicId: undefined,
        }
      : undefined,
  });
  const abhaAddress = form.watch("abhaAddress");

  useEffect(() => {
    setAbhaStatus(initialAbhaStatus);
  }, [initialAbhaStatus]);

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
          abhaAddress: values.abhaAddress?.trim() || undefined,
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

  const handleVerifyAbha = async () => {
    if (!patient?.id) return;
    const nextAbhaAddress = abhaAddress?.trim();
    if (!nextAbhaAddress) return;

    try {
      const result = await verifyAbha.mutateAsync({
        patientId: patient.id,
        abhaAddress: nextAbhaAddress,
      });
      setAbhaStatus(getAbhaVerificationResultState(result));
      if (result.verified) {
        toast.success("ABHA verified successfully");
        onPatientUpdated?.();
      }
    } catch (error) {
      setAbhaStatus(getAbhaVerificationErrorState(error));
    }
  };

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
            <AbhaVerificationField
              control={form.control}
              currentValue={abhaAddress}
              isPending={verifyAbha.isPending}
              patientId={patient.id}
              status={abhaStatus}
              onVerify={handleVerifyAbha}
            />
            <PatientDemographicFields control={form.control} />
          </div>

          <DialogActionButtons
            onCancel={() => onOpenChange?.(false)}
            isPending={updatePatient.isPending || verifyAbha.isPending}
          />
        </form>
      </Form>
    </FormDialog>
  );
};
