import { useState } from "react"
import { API_URL } from "@/lib/api"

interface UseObservationsFormProps {
    appointmentId: string
    initialObservations?: string
    onObservationsSaved?: () => void
}

export function useObservationsForm({
    appointmentId,
    initialObservations = "",
    onObservationsSaved,
}: UseObservationsFormProps) {
    const [loading, setLoading] = useState(false)
    const [observations, setObservations] = useState(initialObservations)

    const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void) => {
        e.preventDefault()
        setLoading(true)

        try {
            const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    observations,
                }),
            })

            if (response.ok) {
                onObservationsSaved?.()
                onSuccess?.()
            }
        } catch (error) {
            console.error("Failed to save observations:", error)
        } finally {
            setLoading(false)
        }
    }

    return {
        loading,
        observations,
        setObservations,
        handleSubmit,
    }
}
