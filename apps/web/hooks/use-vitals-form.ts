import { useState } from "react"
import { API_URL } from "@/lib/api"

interface UseVitalsFormProps {
    appointmentId: string
    onVitalsSaved?: () => void
}

export function useVitalsForm({
    appointmentId,
    onVitalsSaved,
}: UseVitalsFormProps) {
    const [loading, setLoading] = useState(false)
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
        setLoading(true)

        try {
            const response = await fetch(`${API_URL}/appointments/${appointmentId}/vitals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    height: formData.height ? parseFloat(formData.height) : undefined,
                    weight: formData.weight ? parseFloat(formData.weight) : undefined,
                    bloodPressure: formData.bloodPressure || undefined,
                    pulse: formData.pulse ? parseInt(formData.pulse) : undefined,
                    temperature: formData.temperature ? parseFloat(formData.temperature) : undefined,
                    spo2: formData.spo2 ? parseFloat(formData.spo2) : undefined,
                }),
            })

            if (response.ok) {
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
            }
        } catch (error) {
            console.error("Failed to save vitals:", error)
        } finally {
            setLoading(false)
        }
    }

    return {
        loading,
        formData,
        updateField,
        handleSubmit,
    }
}
