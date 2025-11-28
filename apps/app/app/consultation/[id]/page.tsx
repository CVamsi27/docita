/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

import { useParams, useRouter, useSearchParams } from "next/navigation"
import { Button } from "@workspace/ui/components/button"
import { ArrowLeft, User } from "lucide-react"
import { ConsultationContent } from "@/components/consultation/consultation-content"
import { ConsultationSidebar } from "@/components/consultation/consultation-sidebar"
import { useEffect } from "react"
import { useNavigationStore } from "@/lib/stores/navigation-store"
import { apiHooks } from "@/lib/api-hooks"
import { useQueryClient } from "@tanstack/react-query"

export default function ConsultationPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const appointmentId = params.id as string
  const { popRoute, pushRoute } = useNavigationStore()
  const queryClient = useQueryClient()
  
  const { data: appointmentData, isLoading: loading } = apiHooks.useAppointment(appointmentId)

  useEffect(() => {
    // Track this page in navigation history
    pushRoute(`/consultation/${appointmentId}`)
  }, [appointmentId, pushRoute])

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
    // Refetch appointment data after save
    queryClient.invalidateQueries({ queryKey: ["appointments", appointmentId] })
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

      {/* Main Content with Sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar */}
        <aside className="hidden lg:block w-80 border-r overflow-y-auto">
          <ConsultationSidebar appointment={appointmentData} />
        </aside>

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
    </div>
  )
}
