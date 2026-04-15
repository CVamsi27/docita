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
import { ApiError } from "@/lib/errors";

interface UsePatientFormProps {
  onPatientAdded: () => void;
}

function isDuplicatePatientError(error: unknown): boolean {
  if (!(error instanceof ApiError)) {
    return false;
  }

  if (error.statusCode === 409 || error.code === "DUPLICATE_ENTRY") {
    return true;
  }

  return /already exists|duplicate/i.test(error.message);
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
        const fallbackMessage = "We could not add this patient. Please try again.";

        if (isDuplicatePatientError(error)) {
          form.setError("phoneNumber", {
            type: "manual",
            message: "This phone number is already registered",
          });
          showUserFacingErrorToast(
            null,
            "This phone number is already registered",
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
