import { useState, useMemo, useCallback } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { patientsAPI } from "@/lib/api"
import { createPatientSchema, CreatePatientInput } from "@workspace/types"
import { useRouter } from 'next/navigation'
import { useClinic } from '@/lib/clinic-context'

interface UsePatientFormProps {
    onPatientAdded: () => void
}

export function usePatientForm({ onPatientAdded }: UsePatientFormProps) {
    const router = useRouter()
    const { clinicId } = useClinic()
    const [loading, setLoading] = useState(false)

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
            setLoading(true)
            await patientsAPI.create({
                ...data,
                dateOfBirth: new Date(data.dateOfBirth),
                clinicId: clinicId || 'default-clinic-id', // Include clinicId from context
            } as any) // Type assertion to allow clinicId
            form.reset()
            onPatientAdded()
            onSuccess?.()
        } catch (error: unknown) {
            console.error("Failed to create patient:", error)
            const err = error as { message?: string }
            if (err.message?.includes("Unique constraint") || err.message?.includes("Duplicate")) {
                form.setError("phoneNumber", {
                    type: "manual",
                    message: "This phone number is already registered.",
                })
            } else {
                form.setError("root", {
                    type: "manual",
                    message: "Failed to create patient. Please try again.",
                })
            }
        } finally {
            setLoading(false)
        }
    }, [form, clinicId, onPatientAdded])

    return {
        form,
        loading,
        onSubmit,
    }
}
