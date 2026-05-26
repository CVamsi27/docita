"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useClinic } from "@/lib/contexts/clinic-context";
import { useCreatePatient } from "@workspace/data-access";
import { showUserFacingErrorToast } from "@/lib/errors/user-facing-errors";
import {
  createPatientRequestSchema,
  patientCreateFormSchema,
  type PatientCreateFormValues,
} from "@workspace/types";
import { validatePatientPhoneNumberForCountry } from "@/features/patients/rules/patient-rules";

export function useAddPatientDialog({
  onPatientAdded,
  onOpenChange,
}: {
  onPatientAdded?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const createPatient = useCreatePatient();
  const { clinic } = useClinic();

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
      dpdpConsent: undefined,
    },
  });

  const dpdpAccepted = form.watch("dpdpConsent")?.accepted === true;

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

      await createPatient.mutateAsync(
        createPatientRequestSchema.parse({
          ...values,
          firstName: values.firstName.trim(),
          lastName: values.lastName.trim(),
          phoneNumber: values.phoneNumber?.trim() || undefined,
          email: values.email?.trim() || undefined,
          dateOfBirth: values.dateOfBirth || undefined,
        }),
      );
      toast.success("Patient added successfully");
      form.reset();
      onPatientAdded?.();
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
    }
    onOpenChange?.(open);
  };

  return {
    form,
    dpdpAccepted,
    handleSubmit,
    handleClose,
    isPending: createPatient.isPending,
  };
}
