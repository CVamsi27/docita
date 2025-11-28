import { useMemo, useCallback } from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiHooks } from "@/lib/api-hooks"
import { createPatientSchema, CreatePatientInput } from "@workspace/types"
import { useRouter } from 'next/navigation'
import { useClinic } from '@/lib/clinic-context'

interface UsePatientFormProps {
    onPatientAdded: () => void
}

export function usePatientForm({ onPatientAdded }: UsePatientFormProps) {
    const router = useRouter()
    const { clinicId } = useClinic()
    const { mutateAsync: createPatient, isPending: loading } = apiHooks.useCreatePatient()

    const defaultValues = useMemo(() => ({
        firstName: "",
        lastName: "",
        dateOfBirth: "",
        gender: "MALE" as const,
        phoneNumber: "",
        email: "",
        address: "",
        medicalHistory: [],
    }), [])

    const form = useForm<CreatePatientInput>({
        resolver: zodResolver(createPatientSchema),
        defaultValues,
    })

    const onSubmit = useCallback(async (data: CreatePatientInput, onSuccess?: () => void) => {
        try {
            await createPatient({
                ...data,
                dateOfBirth: new Date(data.dateOfBirth),
                clinicId: clinicId || 'default-clinic-id', // Include clinicId from context
            } as any) // Type assertion to allow clinicId
            form.reset()
            onPatientAdded()
            onSuccess?.()
            toast.success("Patient added successfully")
        } catch (error: unknown) {
            console.error("Failed to create patient:", error)
            const err = error as { message?: string }
            if (err.message?.includes("Unique constraint") || err.message?.includes("Duplicate")) {
                form.setError("phoneNumber", {
                    type: "manual",
                    message: "This phone number is already registered.",
                })
                toast.error("This phone number is already registered.")
            } else {
                form.setError("root", {
                    type: "manual",
                    message: "Failed to create patient. Please try again.",
                })
                toast.error("Failed to create patient. Please try again.")
            }
        }
    }, [form, clinicId, onPatientAdded, createPatient])

    return {
        form,
        loading,
        onSubmit,
    }
}
