import { useState } from "react"
import { Medication } from "@workspace/types"
import { API_URL } from "@/lib/api"

interface UsePrescriptionFormProps {
    appointmentId: string
    patientId: string
    doctorId: string
    onPrescriptionSaved?: () => void
}

export function usePrescriptionForm({
    appointmentId,
    patientId,
    doctorId,
    onPrescriptionSaved,
}: UsePrescriptionFormProps) {
    const [loading, setLoading] = useState(false)
    const [instructions, setInstructions] = useState("")
    const [medications, setMedications] = useState<Medication[]>([
        { name: "", dosage: "", frequency: "", duration: "" }
    ])

    const addMedication = () => {
        setMedications([...medications, { name: "", dosage: "", frequency: "", duration: "" }])
    }

    const removeMedication = (index: number) => {
        setMedications(medications.filter((_, i) => i !== index))
    }

    const updateMedication = (index: number, field: keyof Medication, value: string) => {
        const updated = [...medications]
        if (updated[index]) {
            updated[index][field] = value
            setMedications(updated)
        }
    }

    const handleSubmit = async (e: React.FormEvent, onSuccess?: () => void) => {
        e.preventDefault()
        setLoading(true)

        try {
            // Filter out empty medications
            const validMedications = medications.filter(
                med => med.name.trim() !== ""
            )

            const response = await fetch(`${API_URL}/prescriptions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    appointmentId,
                    patientId,
                    doctorId,
                    medications: validMedications,
                    instructions: instructions || undefined,
                }),
            })

            if (response.ok) {
                // Reset form
                setMedications([{ name: "", dosage: "", frequency: "", duration: "" }])
                setInstructions("")
                onPrescriptionSaved?.()
                onSuccess?.()
            }
        } catch (error) {
            console.error("Failed to save prescription:", error)
        } finally {
            setLoading(false)
        }
    }

    return {
        loading,
        instructions,
        setInstructions,
        medications,
        addMedication,
        removeMedication,
        updateMedication,
        handleSubmit,
    }
}
