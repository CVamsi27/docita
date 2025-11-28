import { useState, useEffect, useCallback } from "react"
import { API_URL } from "@/lib/api"
import { Patient, Appointment, Document } from "@workspace/types"

interface UsePatientDataReturn {
    patient: Patient | null
    appointments: Appointment[]
    documents: Document[]
    loading: boolean
    error: string | null
    refetch: () => Promise<void>
}

export function usePatientData(patientId: string): UsePatientDataReturn {
    const [patient, setPatient] = useState<Patient | null>(null)
    const [appointments, setAppointments] = useState<Appointment[]>([])
    const [documents, setDocuments] = useState<Document[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const loadPatientData = useCallback(async () => {
        if (!patientId) return

        try {
            setLoading(true)
            setError(null)

            // Fetch patient details
            const patientResponse = await fetch(`${API_URL}/patients/${patientId}`)
            const patientData = await patientResponse.json()

            if (patientData && !patientData.error && !patientData.statusCode) {
                setPatient(patientData)
            } else {
                console.error("Invalid patient data:", patientData)
                setPatient(null)
                setError("Failed to load patient details")
            }

            // Fetch appointments
            const appointmentsResponse = await fetch(`${API_URL}/patients/${patientId}/appointments`)
            const appointmentsData = await appointmentsResponse.json()

            if (Array.isArray(appointmentsData)) {
                setAppointments(appointmentsData)
            } else {
                console.error("Invalid appointments data:", appointmentsData)
                setAppointments([])
            }

            // Fetch documents
            const documentsResponse = await fetch(`${API_URL}/patients/${patientId}/documents`)
            const documentsData = await documentsResponse.json()

            if (Array.isArray(documentsData)) {
                setDocuments(documentsData)
            } else {
                console.error("Invalid documents data:", documentsData)
                setDocuments([])
            }

        } catch (err) {
            console.error("Failed to load patient data:", err)
            setError("An error occurred while fetching data")
        } finally {
            setLoading(false)
        }
    }, [patientId])

    useEffect(() => {
        loadPatientData()
    }, [loadPatientData])

    return {
        patient,
        appointments,
        documents,
        loading,
        error,
        refetch: loadPatientData
    }
}
