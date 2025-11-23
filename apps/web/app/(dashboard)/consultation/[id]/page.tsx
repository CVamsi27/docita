"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { ArrowLeft, User } from "lucide-react"
import { ConsultationContent } from "@/components/consultation/consultation-content"
import { useEffect, useState } from "react"
import { API_URL } from "@/lib/api"
import { useNavigationStore } from "@/lib/stores/navigation-store"

export default function ConsultationPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = params.id as string
  const { popRoute, pushRoute } = useNavigationStore()
  
  const [appointmentData, setAppointmentData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadAppointment()
    // Track this page in navigation history
    pushRoute(`/consultation/${appointmentId}`)
  }, [appointmentId, pushRoute])

  const loadAppointment = async () => {
    try {
      const token = localStorage.getItem("docita_token")
      const response = await fetch(`${API_URL}/appointments/${appointmentId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      
      if (response.ok) {
        const data = await response.json()
        setAppointmentData(data)
      }
    } catch (error) {
      console.error("Failed to load appointment:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    const from = searchParams.get("from")
    const previousRoute = popRoute()
    
    // If coming from patient page, go back to patient
    if (from === "patient" && appointmentData?.patientId) {
      router.push(`/patients/${appointmentData.patientId}`)
    } 
    // If we have a previous route in history that's not this page, use it
    else if (previousRoute && !previousRoute.includes('/consultation/')) {
      router.push(previousRoute)
    } 
    // Default to appointments
    else {
      router.push("/appointments")
    }
  }

  const handleSave = () => {
    // Optionally reload appointment data after save
    loadAppointment()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading consultation...</p>
        </div>
      </div>
    )
  }

  if (!appointmentData) {
    return (
      <div className="flex flex-col items-center justify-center h-screen gap-4">
        <p className="text-muted-foreground">Appointment not found</p>
        <Button onClick={() => router.push("/appointments")}>Back to Appointments</Button>
      </div>
    )
  }

  const patientName = appointmentData.patient 
    ? `${appointmentData.patient.firstName} ${appointmentData.patient.lastName}`
    : "Patient"

  // Get default tab from query params
  const defaultTab = (searchParams.get("tab") as "observations" | "vitals" | "prescription" | "invoice") || "observations"

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              {patientName}
            </h1>
            <p className="text-sm text-muted-foreground">
              Consultation - {new Date(appointmentData.startTime).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleBack}>
            Close
          </Button>
        </div>
      </header>

      {/* Consultation Content */}
      <div className="flex-1 overflow-hidden">
        <ConsultationContent
          appointmentId={appointmentId}
          patientId={appointmentData.patientId}
          doctorId={appointmentData.doctorId}
          defaultTab={defaultTab}
          onSave={handleSave}
        />
      </div>
    </div>
  )
}
