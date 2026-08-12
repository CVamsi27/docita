import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useCreatePatient, useVerifyPatientAbha } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  createPatientRequestSchema,
  patientCreateFormSchema,
  type PatientCreateFormValues,
} from "@workspace/types";
import { validatePatientPhoneNumberForCountry } from "@/features/patients/rules/patient-rules";
import type { AbhaVerificationUiState } from "./abha-verification-field";
import {
  getAbhaVerificationErrorState,
  getAbhaVerificationResultState,
} from "./abha-verification-errors";

export function useAddPatientDialog({
  onPatientAdded,
  onOpenChange,
}: {
  onPatientAdded?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const createPatient = useCreatePatient();
  const { clinic } = useClinic();
  const [createdPatientId, setCreatedPatientId] = useState<string | null>(null);
  const [abhaStatus, setAbhaStatus] = useState<AbhaVerificationUiState>({
    kind: "idle",
    message:
      "Enter an ABHA address to verify after the patient record is saved.",
  });
  const verifyAbha = useVerifyPatientAbha();

  const form = useForm<PatientCreateFormValues>({
    resolver: zodResolver(patientCreateFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      phoneNumber: null,
      email: null,
      gender: "MALE",
      dateOfBirth: "",
      address: null,
      abhaAddress: null,
      dpdpConsent: undefined,
    },
  });

  const dpdpAccepted = form.watch("dpdpConsent")?.accepted === true;
  const abhaAddress = form.watch("abhaAddress");

  const handleInvalidSubmit = () => {
    showUserFacingErrorToast(
      "Please check the highlighted fields and try again.",
      "Please check the highlighted fields and try again.",
      "form",
    );
  };

  const handleSubmit = form.handleSubmit(async (values) => {
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

      const patient = await createPatient.mutateAsync(
        createPatientRequestSchema.parse({
          ...values,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phoneNumber: values.phoneNumber?.trim() || undefined,
          email: values.email?.trim() || undefined,
          dateOfBirth: values.dateOfBirth || undefined,
          abhaAddress: values.abhaAddress?.trim() || undefined,
        }),
      );
      const createdId = patient.id;
      if (!createdId) {
        toast.success("Patient added successfully");
        form.reset();
        onPatientAdded?.();
        onOpenChange?.(false);
        return;
      }
      setCreatedPatientId(createdId);
      onPatientAdded?.();

      const nextAbhaAddress = values.abhaAddress?.trim();
      if (nextAbhaAddress) {
        try {
          const result = await verifyAbha.mutateAsync({
            patientId: createdId,
            abhaAddress: nextAbhaAddress,
          });
          const nextStatus = getAbhaVerificationResultState(result);
          setAbhaStatus(nextStatus);
          if (!result.verified) {
            toast.success("Patient added successfully");
            return;
          }
          toast.success("Patient added and ABHA verified successfully");
        } catch (error) {
          setAbhaStatus(getAbhaVerificationErrorState(error));
          toast.success("Patient added successfully");
          return;
        }
      } else {
        toast.success("Patient added successfully");
      }
      form.reset();
      setCreatedPatientId(null);
      onOpenChange?.(false);
    } catch {
      showUserFacingErrorToast(
        "We could not add this patient. Please try again.",
      );
    }
  }, handleInvalidSubmit);

  const handleClose = (open: boolean) => {
    if (!open) {
      form.reset();
      setCreatedPatientId(null);
      setAbhaStatus({
        kind: "idle",
        message:
          "Enter an ABHA address to verify after the patient record is saved.",
      });
    }
    onOpenChange?.(open);
  };

  const handleVerifyCreatedAbha = async () => {
    const nextAbhaAddress = abhaAddress?.trim();
    if (!createdPatientId || !nextAbhaAddress) return;

    try {
      const result = await verifyAbha.mutateAsync({
        patientId: createdPatientId,
        abhaAddress: nextAbhaAddress,
      });
      setAbhaStatus(getAbhaVerificationResultState(result));
      if (result.verified) {
        toast.success("ABHA verified successfully");
      }
    } catch (error) {
      setAbhaStatus(getAbhaVerificationErrorState(error));
    }
  };

  return {
    form,
    dpdpAccepted,
    isPending: createPatient.isPending,
    abhaAddress,
    abhaStatus,
    createdPatientId,
    handleVerifyCreatedAbha,
    handleSubmit,
    handleClose,
  };
}
