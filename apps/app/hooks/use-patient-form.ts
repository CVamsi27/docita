import { useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useForm, UseFormReturn, Resolver } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { apiHooks } from "@/lib/api-hooks";
import { createPatientSchema, CreatePatientInput } from "@workspace/types";
import { useRouter } from "next/navigation";
import { useClinic } from "@/lib/clinic-context";

interface UsePatientFormProps {
  onPatientAdded: () => void;
}

export function usePatientForm({ onPatientAdded }: UsePatientFormProps): {
  form: UseFormReturn<CreatePatientInput>;
  loading: boolean;
  onSubmit: (data: CreatePatientInput, onSuccess?: () => void) => Promise<void>;
} {
  const router = useRouter();
  const { clinicId } = useClinic();
  const { mutateAsync: createPatient, isPending: loading } =
    apiHooks.useCreatePatient();

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
    resolver: zodResolver(
      createPatientSchema,
    ) as unknown as Resolver<CreatePatientInput>,
    defaultValues,
  });

  const onSubmit = useCallback(
    async (data: CreatePatientInput, onSuccess?: () => void) => {
      try {
        await createPatient({
          ...data,
          clinicId: clinicId || "default-clinic-id",
        } as CreatePatientInput & { clinicId: string });
        form.reset();
        onPatientAdded();
        onSuccess?.();
        toast.success("Patient added successfully");
      } catch (error: unknown) {
        console.error("Failed to create patient:", error);
        const err = error as { message?: string };
        const errorMessage = err.message || "Failed to create patient";

        if (
          errorMessage.includes("Unique constraint") ||
          errorMessage.includes("Duplicate") ||
          errorMessage.includes("already exists")
        ) {
          form.setError("phoneNumber", {
            type: "manual",
            message: "This phone number is already registered.",
          });
          toast.error("This phone number is already registered.");
        } else {
          form.setError("root", {
            type: "manual",
            message: errorMessage,
          });
          toast.error(errorMessage);
        }
      }
    },
    [form, clinicId, onPatientAdded, createPatient],
  );

  return {
    form: form as unknown as UseFormReturn<CreatePatientInput>,
    loading,
    onSubmit,
  };
}
