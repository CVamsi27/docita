"use client"

import { useMemo, useCallback, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { PatientTagManager } from "@/components/patients/patient-tag-manager"
import { WhatsAppButton } from "@/components/common/whatsapp-button"
import { usePatientData } from "@/hooks/use-patient-data"
import { Button } from "@workspace/ui/components/button"
import { Badge } from "@workspace/ui/components/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@workspace/ui/components/tabs"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import { useNavigationStore } from "@/lib/stores/navigation-store"
import { 
  ArrowLeft, 
  Calendar, 
  Phone, 
  Mail, 
  FileText,
  Pill,
  Heart,
  Droplet,
  AlertCircle,
  Stethoscope,
  History,
  Activity
} from "lucide-react"
import { format } from "date-fns"

export default function PatientDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { patient, appointments, documents, loading } = usePatientData(params.id as string)
  const { popRoute, pushRoute } = useNavigationStore()

  // All hooks must be called before any conditional returns
  const initials = useMemo(() => 
    patient ? `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}` : "",
    [patient]
  )
  
  const age = useMemo(() => 
    patient?.dateOfBirth ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear() : "N/A",
    [patient]
  )

  const handleScheduleVisit = useCallback(() => {
    if (patient?.id) {
      router.push(`/appointments?patientId=${patient.id}&action=new`)
    }
  }, [router, patient?.id])

  const handleViewHistory = useCallback(() => {
    if (patient?.id) {
      router.push(`/patients/${patient.id}/history`)
    }
  }, [router, patient?.id])

  const handleBackToPatients = useCallback(() => {
    const previousRoute = popRoute()
    if (previousRoute && patient?.id && previousRoute !== `/patients/${patient.id}`) {
      router.push(previousRoute)
    } else {
      router.push("/dashboard")
    }
  }, [router, patient?.id, popRoute])

  // Track this page in navigation history
  useEffect(() => {
    if (params.id) {
      pushRoute(`/patients/${params.id}`)
    }
  }, [params.id, pushRoute])

  // Conditional returns after all hooks
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading patient details...</p>
        </div>
      </div>
    )
  }

  if (!patient || !patient.id) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Patient not found</p>
        <Button onClick={() => router.push("/patients")}>Back to Patients</Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto w-full">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackToPatients}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Patient Details</h1>
            <p className="text-sm text-muted-foreground">View and manage patient records</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleScheduleVisit}>
            <Calendar className="mr-2 h-4 w-4" /> Schedule Visit
          </Button>
          <Button variant="outline" onClick={handleViewHistory}>
            <History className="mr-2 h-4 w-4" />
            Full History
          </Button>
        </div>
      </div>

      {/* Patient Profile Card */}
      <Card className="border-none shadow-md bg-gradient-to-br from-card to-muted/20 overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6 items-start">
            <Avatar className="h-24 w-24 border-4 border-background shadow-sm">
              <AvatarFallback className="text-3xl bg-primary/10 text-primary font-bold">{initials}</AvatarFallback>
            </Avatar>
            
            <div className="flex-1 space-y-4 w-full">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-3xl font-bold text-foreground">{patient.firstName} {patient.lastName}</h2>
                    <Badge variant={patient.gender === "MALE" ? "default" : "secondary"} className="uppercase text-xs">
                      {patient.gender}
                    </Badge>
                    {patient.bloodGroup && (
                      <Badge variant="outline" className="gap-1 border-red-200 text-red-600 bg-red-50 dark:bg-red-950/30 dark:border-red-900 dark:text-red-400">
                        <Droplet className="h-3 w-3 fill-current" />
                        {patient.bloodGroup}
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      <span>{age} years old</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-4 w-4" />
                      <span>{patient.phoneNumber}</span>
                    </div>
                    {patient.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="h-4 w-4" />
                        <span>{patient.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <PatientTagManager patientId={patient.id!} />
                  <WhatsAppButton 
                    phoneNumber={patient.phoneNumber} 
                    message={`Hello ${patient.firstName}, this is a message from ${process.env.NEXT_PUBLIC_CLINIC_NAME || 'Docita Clinic'}.`}
                  />
                </div>
              </div>

              {/* Tags Display */}
              {patient.tags && patient.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {patient.tags.map((tag: any) => (
                    <Badge 
                      key={tag.id} 
                      style={{ backgroundColor: tag.color }}
                      className="text-white border-0"
                    >
                      {tag.tag}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Allergies Alert */}
              {patient.allergies && (
                <div className="flex items-start gap-3 p-3 bg-destructive/5 border border-destructive/10 rounded-lg text-destructive text-sm">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div>
                    <span className="font-semibold">Allergies:</span> {patient.allergies}
                  </div>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="visits" className="w-full space-y-6">
        <TabsList className="w-full justify-start h-12 bg-muted/50 p-1 rounded-lg overflow-x-auto flex-nowrap">
          <TabsTrigger value="visits" className="flex-1 min-w-[120px]">Visits & Consultations</TabsTrigger>
          <TabsTrigger value="prescriptions" className="flex-1 min-w-[120px]">Prescriptions</TabsTrigger>
          <TabsTrigger value="documents" className="flex-1 min-w-[120px]">Documents</TabsTrigger>
          <TabsTrigger value="medical" className="flex-1 min-w-[120px]">Medical History</TabsTrigger>
        </TabsList>

        <TabsContent value="visits" className="space-y-4">
          <h3 className="text-lg font-semibold">Recent Visits</h3>
          
          {appointments.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calendar className="h-12 w-12 mb-4 opacity-20" />
                <p>No visits recorded yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {appointments.map((apt) => (
                <Card key={apt.id} className="overflow-hidden hover:shadow-md transition-shadow">
                  <div className="flex flex-col md:flex-row">
                    {/* Date Column */}
                    <div className="bg-muted/30 p-4 md:w-48 flex flex-col justify-center items-center md:items-start border-b md:border-b-0 md:border-r border-border">
                      <span className="text-2xl font-bold text-primary">
                        {format(new Date(apt.startTime), "d")}
                      </span>
                      <span className="text-sm font-medium uppercase text-muted-foreground">
                        {format(new Date(apt.startTime), "MMM yyyy")}
                      </span>
                      <span className="text-xs text-muted-foreground mt-1">
                        {format(new Date(apt.startTime), "EEEE")}
                      </span>
                      <Badge variant="outline" className="mt-3 w-full justify-center">
                        {format(new Date(apt.startTime), "h:mm a")}
                      </Badge>
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 p-4 md:p-6 flex flex-col justify-between gap-4">
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-lg">{apt.type}</h4>
                              <Badge variant={apt.status === "completed" ? "default" : "secondary"}>
                                {apt.status}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                              <Stethoscope className="h-3 w-3" /> Dr. {apt.doctor?.name}
                            </p>
                          </div>
                          <Button 
                            size="sm" 
                            variant={apt.status === "completed" ? "outline" : "default"}
                            onClick={() => router.push(`/consultation/${apt.id}?from=patient`)}
                          >
                            {apt.status === "completed" ? "View Details" : "Start Consultation"}
                          </Button>
                        </div>

                        {apt.notes && (
                          <p className="text-sm text-muted-foreground bg-muted/20 p-2 rounded mt-2">
                            &quot;{apt.notes}&quot;
                          </p>
                        )}
                      </div>

                      {/* Quick Stats Row */}
                      <div className="flex flex-wrap gap-4 pt-4 border-t border-border/50">
                        {apt.vitalSign && (
                          <div className="flex items-center gap-2 text-sm">
                            <Activity className="h-4 w-4 text-green-500" />
                            <span className="font-medium">Vitals Recorded</span>
                          </div>
                        )}
                        {apt.prescription && (
                          <div className="flex items-center gap-2 text-sm">
                            <Pill className="h-4 w-4 text-blue-500" />
                            <span className="font-medium">{apt.prescription?.medications?.length || 0} Meds</span>
                          </div>
                        )}
                        {apt.observations && (
                          <div className="flex items-center gap-2 text-sm">
                            <FileText className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">Notes Added</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="prescriptions" className="space-y-4">
          {appointments.filter(apt => apt.prescription).length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Pill className="h-12 w-12 mb-4 opacity-20" />
                <p>No prescriptions found</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {appointments.filter(apt => apt.prescription).map((apt) => (
                <Card key={apt.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-base">
                          {format(new Date(apt.startTime), "MMMM d, yyyy")}
                        </CardTitle>
                        <CardDescription>Dr. {apt.doctor?.name}</CardDescription>
                      </div>
                      <Button variant="ghost" size="icon">
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {apt.prescription?.medications.slice(0, 3).map((med: any, idx: number) => (
                        <div key={idx} className="flex items-center gap-3 text-sm">
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0" />
                          <span className="font-medium">{med.name}</span>
                          <span className="text-muted-foreground text-xs ml-auto">{med.dosage}</span>
                        </div>
                      ))}
                      {(apt.prescription?.medications?.length || 0) > 3 && (
                        <p className="text-xs text-muted-foreground pl-5">
                          + {(apt.prescription?.medications?.length || 0) - 3} more medications
                        </p>
                      )}
                      <Button 
                        variant="outline" 
                        className="w-full mt-4"
                        onClick={() => {
                          // Open consultation modal to prescription tab
                          // This would ideally be handled by state or a specific handler
                        }}
                      >
                        View Full Prescription
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          {documents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mb-4 opacity-20" />
                <p>No documents uploaded</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3 md:grid-cols-3">
              {documents.map((doc) => (
                <Card key={doc.id} className="hover:bg-muted/50 transition-colors cursor-pointer group">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.name}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(doc.createdAt), "MMM d, yyyy")}
                      </p>
                      <Badge variant="secondary" className="mt-2 text-[10px] h-5">
                        {doc.type}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="medical" className="space-y-4">
           <Card>
            <CardHeader>
              <CardTitle>Medical History & Conditions</CardTitle>
              <CardDescription>Chronic conditions, surgeries, and past medical events</CardDescription>
            </CardHeader>
            <CardContent>
              {patient.medicalHistory?.length === 0 ? (
                <p className="text-muted-foreground">No medical history recorded</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {patient.medicalHistory?.map((condition: string, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-destructive/5 border border-destructive/10 rounded-full text-destructive text-sm font-medium">
                      <Heart className="h-3 w-3 fill-current" />
                      {condition}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
