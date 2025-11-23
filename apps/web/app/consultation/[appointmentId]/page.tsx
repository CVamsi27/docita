import { Metadata } from "next"
import { notFound } from "next/navigation"
import prisma from "@workspace/db"
import { ConsultationContent } from "@/components/consultation/consultation-content"
import { Button } from "@workspace/ui/components/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@workspace/ui/components/avatar"

interface ConsultationPageProps {
  params: Promise<{
    appointmentId: string
  }>
}

export async function generateMetadata({ params }: ConsultationPageProps): Promise<Metadata> {
  const { appointmentId } = await params
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true }
  })

  if (!appointment) return { title: "Consultation Not Found" }

  return {
    title: `Consultation: ${appointment.patient.firstName} ${appointment.patient.lastName} | Docita`,
  }
}

export default async function ConsultationPage({ params }: ConsultationPageProps) {
  const { appointmentId } = await params
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      patient: true,
      doctor: true
    }
  })

  if (!appointment) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b px-6 py-4 flex items-center justify-between bg-card">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10 border">
              <AvatarImage src="" />
              <AvatarFallback>{appointment.patient.firstName.slice(0, 1)}{appointment.patient.lastName.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-lg font-semibold">{appointment.patient.firstName} {appointment.patient.lastName}</h1>
              <p className="text-sm text-muted-foreground">
                {appointment.patient.gender}, {new Date().getFullYear() - new Date(appointment.patient.dateOfBirth).getFullYear()} yrs • {appointment.patient.phoneNumber}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-right mr-4">
            <p className="text-sm font-medium">Dr. {appointment.doctor.name}</p>
            <p className="text-xs text-muted-foreground">{new Date(appointment.createdAt).toLocaleDateString()}</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden flex">
        {/* Patient Summary Sidebar (Optional, can be collapsible) */}
        <div className="w-80 border-r bg-muted/10 p-6 hidden xl:block overflow-y-auto">
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold mb-2">Allergies</h3>
              {appointment.patient.allergies ? (
                <div className="flex flex-wrap gap-2">
                  {appointment.patient.allergies.split(',').map((allergy: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs font-medium">
                      {allergy.trim()}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No known allergies</p>
              )}
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Medical History</h3>
              {appointment.patient.medicalHistory && appointment.patient.medicalHistory.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {appointment.patient.medicalHistory.map((condition: string, i: number) => (
                    <span key={i} className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium">
                      {condition}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">None recorded</p>
              )}
            </div>

            <div>
              <h3 className="font-semibold mb-2">Blood Group</h3>
              <p className="text-sm">{appointment.patient.bloodGroup || "Unknown"}</p>
            </div>
          </div>
        </div>

        {/* Consultation Form */}
        <div className="flex-1 flex flex-col bg-background">
          <ConsultationContent 
            appointmentId={appointment.id}
            patientId={appointment.patientId}
            doctorId={appointment.doctorId}
          />
        </div>
      </main>
    </div>
  )
}
