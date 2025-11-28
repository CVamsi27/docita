import { useEffect, useCallback, useMemo } from "react"
import { toast } from "sonner"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { apiHooks } from "@/lib/api-hooks"
import { createAppointmentSchema, CreateAppointmentInput } from "@workspace/types"

interface UseAppointmentFormProps {
    onAppointmentAdded: () => void
    selectedDate?: Date
    preselectedPatientId?: string
}

export function useAppointmentForm({ onAppointmentAdded, selectedDate, preselectedPatientId }: UseAppointmentFormProps) {
    const { data: patients = [] } = apiHooks.usePatients()
    const { mutateAsync: createAppointment, isPending: loading } = apiHooks.useCreateAppointment()

    const defaultValues = useMemo(() => ({
        patientId: preselectedPatientId || "",
        startTime: selectedDate ? selectedDate.toISOString().slice(0, 16) : "",
        endTime: "",
        status: "scheduled" as const,
        type: "consultation" as const,
        notes: "",
    }), [preselectedPatientId, selectedDate])

    const form = useForm<CreateAppointmentInput>({
        resolver: zodResolver(createAppointmentSchema),
        defaultValues,
    })

    useEffect(() => {
        if (selectedDate) {
            const start = new Date(selectedDate)
            start.setHours(9, 0, 0, 0)
            const offset = start.getTimezoneOffset() * 60000
            const localISOTime = (new Date(start.getTime() - offset)).toISOString().slice(0, 16)

            form.setValue("startTime", localISOTime)
        }
    }, [selectedDate, form])

    useEffect(() => {
        if (preselectedPatientId) {
            form.setValue("patientId", preselectedPatientId)
        }
    }, [preselectedPatientId, form])

    const onSubmit = useCallback(async (data: CreateAppointmentInput, onSuccess?: () => void) => {
        try {
            await createAppointment({
                ...data,
                doctorId: "1", // Hardcoded for now
                startTime: new Date(data.startTime).toISOString(),
                endTime: new Date(data.endTime || new Date(new Date(data.startTime).getTime() + 30 * 60000)).toISOString(), // Default 30 mins
            } as any)
            form.reset()
            onAppointmentAdded()
            onSuccess?.()
            toast.success("Appointment scheduled successfully")
        } catch (error) {
            console.error("Failed to create appointment:", error)
            toast.error("Failed to schedule appointment. Please try again.")
        }
    }, [form, onAppointmentAdded, createAppointment])

    return {
        form,
        loading,
        patients,
        onSubmit,
    }
}
