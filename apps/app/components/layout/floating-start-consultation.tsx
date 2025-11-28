"use client"

import { Button } from "@workspace/ui/components/button"
import { Stethoscope } from "lucide-react"
import { useRouter } from "next/navigation"
import { apiHooks } from "@/lib/api-hooks"
import { useEffect, useState } from "react"
import type { Appointment } from "@workspace/types"

export function FloatingStartConsultation() {
  const router = useRouter()
  const { data: appointments = [] } = apiHooks.useAppointments()
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null)

  useEffect(() => {
    // Find the next upcoming appointment that's not completed
    const now = new Date()
    const upcoming = appointments
      .filter((apt: Appointment) => 
        apt.status !== "completed" && 
        apt.status !== "cancelled" &&
        new Date(apt.startTime) <= new Date(now.getTime() + 2 * 60 * 60 * 1000) // Within 2 hours
      )
      .sort((a: Appointment, b: Appointment) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      )[0]

    setNextAppointment(upcoming || null)
  }, [appointments])

  if (!nextAppointment) {
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const patient = (nextAppointment as any).patient
  const patientName = patient 
    ? `${patient.firstName} ${patient.lastName}`
    : "Patient"

  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden">
      <Button
        size="lg"
        className="h-14 gap-3 rounded-full shadow-2xl shadow-primary/50 hover:shadow-primary/70 transition-all hover:scale-105"
        onClick={() => router.push(`/consultation/${nextAppointment.id}`)}
      >
        <Stethoscope className="h-5 w-5" />
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold">Start Consultation</span>
          <span className="text-xs opacity-90">{patientName}</span>
        </div>
      </Button>
    </div>
  )
}
