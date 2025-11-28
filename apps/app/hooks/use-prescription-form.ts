import { useState } from "react"
import { toast } from "sonner"
import { Medication } from "@workspace/types"
import { apiHooks } from "@/lib/api-hooks"

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
    const createPrescription = apiHooks.useCreatePrescription()
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

        try {
            // Filter out empty medications
            const validMedications = medications.filter(
                med => med.name.trim() !== ""
            )

            await createPrescription.mutateAsync({
                appointmentId,
                patientId,
                doctorId,
                medications: validMedications,
                instructions: instructions || undefined,
            })

            // Reset form
            setMedications([{ name: "", dosage: "", frequency: "", duration: "" }])
            setInstructions("")
            onPrescriptionSaved?.()
            onSuccess?.()
            toast.success("Prescription saved successfully")
        } catch (error) {
            console.error("Failed to save prescription:", error)
            toast.error("Failed to save prescription")
        }
    }

    return {
        loading: createPrescription.isPending,
        instructions,
        setInstructions,
        medications,
        addMedication,
        removeMedication,
        updateMedication,
        handleSubmit,
    }
}
