import { useState, useEffect, useCallback, useMemo } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { appointmentsAPI, patientsAPI } from "@/lib/api"
import { createAppointmentSchema, CreateAppointmentInput, Patient } from "@workspace/types"

interface UseAppointmentFormProps {
    onAppointmentAdded: () => void
    selectedDate?: Date
    preselectedPatientId?: string
}

export function useAppointmentForm({ onAppointmentAdded, selectedDate, preselectedPatientId }: UseAppointmentFormProps) {
    const [loading, setLoading] = useState(false)
    const [patients, setPatients] = useState<Patient[]>([])

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

    const loadPatients = useCallback(async () => {
        try {
            const data = await patientsAPI.getAll()
            setPatients(data)
        } catch (error) {
            console.error("Failed to load patients:", error)
        }
    }, [])

    const onSubmit = useCallback(async (data: CreateAppointmentInput, onSuccess?: () => void) => {
        try {
            setLoading(true)
            await appointmentsAPI.create({
                ...data,
                doctorId: "1", // Hardcoded for now
                startTime: new Date(data.startTime),
                endTime: new Date(data.endTime || new Date(new Date(data.startTime).getTime() + 30 * 60000)), // Default 30 mins
            })
            form.reset()
            onAppointmentAdded()
            onSuccess?.()
        } catch (error) {
            console.error("Failed to create appointment:", error)
        } finally {
            setLoading(false)
        }
    }, [form, onAppointmentAdded])

    return {
        form,
        loading,
        patients,
        loadPatients,
        onSubmit,
    }
}
