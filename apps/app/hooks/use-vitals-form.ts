import { useState } from "react"
import { toast } from "sonner"
import { apiHooks } from "@/lib/api-hooks"

interface UseVitalsFormProps {
    appointmentId: string
    onVitalsSaved?: () => void
}

export function useVitalsForm({
    appointmentId,
    onVitalsSaved,
}: UseVitalsFormProps) {
    const saveVitals = apiHooks.useSaveVitals(appointmentId)

    const [formData, setFormData] = useState({
        height: "",
        weight: "",
        bloodPressure: "",
        pulse: "",
        temperature: "",
        spo2: "",
    })

    const updateField = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void) => {
        e.preventDefault()

        try {
            await saveVitals.mutateAsync({
                height: formData.height ? parseFloat(formData.height) : undefined,
                weight: formData.weight ? parseFloat(formData.weight) : undefined,
                bloodPressure: formData.bloodPressure || undefined,
                pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
                temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
                spo2: formData.spo2 ? parseFloat(formData.spo2) : undefined,
            })

            // Reset form
            setFormData({
                height: "",
                weight: "",
                bloodPressure: "",
                pulse: "",
                temperature: "",
                spo2: "",
            })
            onVitalsSaved?.()
            onSuccess?.()
            toast.success("Vitals saved successfully")
        } catch (error) {
            console.error("Failed to save vitals:", error)
            toast.error("Failed to save vitals")
        }
    }

    return {
        loading: saveVitals.isPending,
        formData,
        updateField,
        handleSubmit,
    }
}
