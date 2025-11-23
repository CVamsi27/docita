"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { Calendar } from "@workspace/ui/components/calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Badge } from "@workspace/ui/components/badge"
import { Button } from "@workspace/ui/components/button"
import { format, isSameDay } from "date-fns"
import { appointmentsAPI } from "@/lib/api"
import { Appointment, Patient } from "@workspace/types"
import { AddAppointmentDialog } from "@/components/appointments/add-appointment-dialog"
import { ConsultationModal } from "@/components/consultation/consultation-modal"
import { Clock, User, Stethoscope } from "lucide-react"

interface AppointmentWithPatient extends Appointment {
  patient?: Patient
}

import { useSearchParams, useRouter } from "next/navigation"

import { Suspense } from "react"

function AppointmentsContent() {
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [appointments, setAppointments] = useState<AppointmentWithPatient[]>([])
  const [loading, setLoading] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true)
      const data = await appointmentsAPI.getAll()
      setAppointments(data)
    } catch (error) {
      console.error("Failed to load appointments:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAppointments()
    if (searchParams.get("action") === "new") {
      setIsAddDialogOpen(true)
    }
  }, [searchParams, loadAppointments])

  const handleDialogChange = useCallback((open: boolean) => {
    setIsAddDialogOpen(open)
    if (!open) {
      // Remove the query param when dialog closes
      const newParams = new URLSearchParams(searchParams.toString())
      newParams.delete("action")
      newParams.delete("patientId")
      router.replace(`/appointments?${newParams.toString()}`)
    }
  }, [searchParams, router])

  const filteredAppointments = useMemo(() => 
    appointments.filter(apt => 
      date && isSameDay(new Date(apt.startTime), date)
    ).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
    [appointments, date]
  )

  const preselectedPatientId = useMemo(() => 
    searchParams.get("patientId") || undefined,
    [searchParams]
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Appointments</h1>
          <p className="text-muted-foreground">
            Schedule and manage patient appointments.
          </p>
        </div>
        <AddAppointmentDialog 
          onAppointmentAdded={loadAppointments} 
          selectedDate={date}
          open={isAddDialogOpen}
          onOpenChange={handleDialogChange}
          preselectedPatientId={preselectedPatientId}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-[300px_1fr]">
        <Card className="h-fit border-border shadow-sm">
          <CardHeader>
            <CardTitle>Calendar</CardTitle>
          </CardHeader>
          <CardContent className="p-0 flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border border-border"
            />
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardHeader>
            <CardTitle>Schedule for {date ? format(date, "MMMM d, yyyy") : "Selected Date"}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              {loading ? (
                <div className="text-center py-8 text-muted-foreground">Loading appointments...</div>
              ) : filteredAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground border-2 border-dashed border-border rounded-lg bg-muted/10">
                  <p>No appointments scheduled for this day.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors bg-card">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="flex flex-col items-center justify-center w-16 h-16 bg-primary/10 rounded-md text-primary">
                          <span className="text-lg font-bold">{format(new Date(apt.startTime), "HH:mm")}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold flex items-center gap-2 text-foreground">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : `Patient ID: ${apt.patientId}`}
                          </h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <Clock className="h-3 w-3" />
                            {format(new Date(apt.startTime), "h:mm a")} - {format(new Date(apt.endTime), "h:mm a")}
                            <span className="capitalize px-2 py-0.5 bg-muted rounded-full text-xs text-muted-foreground">
                              {apt.type}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={apt.status === 'confirmed' ? 'default' : 'secondary'}>
                          {apt.status}
                        </Badge>
                        <ConsultationModal
                          appointmentId={apt.id!}
                          patientId={apt.patientId}
                          doctorId={apt.doctorId}
                          patientName={apt.patient ? `${apt.patient.firstName} ${apt.patient.lastName}` : `Patient ${apt.patientId}`}
                          trigger={
                            <Button size="sm" variant={apt.status === "completed" ? "outline" : "default"}>
                              <Stethoscope className="mr-2 h-4 w-4" />
                              {apt.status === "completed" ? "View" : "Start"}
                            </Button>
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default function AppointmentsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <AppointmentsContent />
    </Suspense>
  )
}

