import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Resolver, useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreatePatient } from "@/hooks/api/use-patients";
import {
  CreatePatientInput,
  createPatientRequestSchema,
  createPatientSchema,
} from "@workspace/types";
import { useClinic } from "@/lib/clinic-context";
import { showUserFacingErrorToast } from "@/lib/user-facing-errors";

interface UsePatientFormProps {
  onPatientAdded: () => void;
}

export function usePatientForm({ onPatientAdded }: UsePatientFormProps): {
  form: UseFormReturn<CreatePatientInput>;
  loading: boolean;
  onSubmit: (data: CreatePatientInput, onSuccess?: () => void) => Promise<void>;
} {
  const { clinicId } = useClinic();
  const { mutateAsync: createPatient, isPending: loading } = useCreatePatient();

  const defaultValues = useMemo(
    () => ({
      firstName: "",
      lastName: "",
      dateOfBirth: "",
      gender: "MALE" as const,
      phoneNumber: "",
      email: "",
      address: "",
      medicalHistory: [],
      isolationStatus: "NONE" as const,
      fallRisk: false,
    }),
    [],
  );

  const form = useForm<CreatePatientInput>({
    resolver: zodResolver(createPatientSchema) as Resolver<CreatePatientInput>,
    defaultValues,
  });

  const onSubmit = useCallback(
    async (data: CreatePatientInput, onSuccess?: () => void) => {
      try {
        const payload = createPatientRequestSchema.parse({
          ...data,
          clinicId: clinicId || "default-clinic-id",
        });

        await createPatient(payload);
        form.reset();
        await onPatientAdded();
        if (onSuccess) {
          await onSuccess();
        }
        toast.success("Patient added successfully");
      } catch (error: unknown) {

        const err = error as { message?: string };
        const errorMessage = err.message || "Failed to create patient";
        const fallbackMessage = "We could not add the patient. Please try again.";

        if (
          errorMessage.includes("Unique constraint") ||
          errorMessage.includes("Duplicate") ||
          errorMessage.includes("already exists")
        ) {
          form.setError("phoneNumber", {
            type: "manual",
            message: "This phone number is already registered.",
          });
          showUserFacingErrorToast(
            null,
            "This phone number is already registered.",
            "form",
          );
        } else {
          form.setError("root", {
            type: "manual",
            message: fallbackMessage,
          });
          showUserFacingErrorToast(error, fallbackMessage, "save");
        }
      }
    },
    [form, clinicId, onPatientAdded, createPatient],
  );

  return {
    form,
    loading,
    onSubmit,
  };
}
