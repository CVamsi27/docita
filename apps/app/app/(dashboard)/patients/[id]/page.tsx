"use client";

import { useMemo, useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@workspace/ui/components/card";
import { PatientTagManager } from "@/components/patients/patient-tag-manager";
import { WhatsAppButton } from "@/components/common/whatsapp-button";
import { usePatientData } from "@/hooks/use-patient-data";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { useNavigationStore } from "@/lib/stores/navigation-store";
import { useRepeatPrescription } from "@/hooks/use-repeat-prescription";
import { useClinic } from "@/lib/clinic-context";
import { PatientProfileHeader } from "@/components/patients/patient-profile-header";
import { PatientStatsCards } from "@/components/patients/patient-stats-cards";
import { EditPatientDialog } from "@/components/patients/edit-patient-dialog";
import {
  ArrowLeft,
  Calendar,
  FileText,
  Pill,
  Activity,
  Stethoscope,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { format } from "date-fns";
import { usePermissionStore, Feature } from "@/lib/stores/permission-store";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { patient, appointments, documents, loading, refetch } = usePatientData(
    params.id as string,
  );
  const { popRoute, pushRoute } = useNavigationStore();
  const { clinic } = useClinic();
  const { canAccess } = usePermissionStore();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Track this page in navigation history using useEffect to avoid setState during render
  useEffect(() => {
    if (params.id) {
      pushRoute(`/patients/${params.id}`);
    }
  }, [params.id, pushRoute]);

  const age = useMemo(
    () =>
      patient?.dateOfBirth
        ? new Date().getFullYear() - new Date(patient.dateOfBirth).getFullYear()
        : "N/A",
    [patient],
  );

  const lastVisit = useMemo(() => {
    if (!appointments.length) return undefined;
    const completed = appointments
      .filter((a) => a.status === "completed")
      .sort(
        (a, b) =>
          new Date(b.startTime).getTime() - new Date(a.startTime).getTime(),
      );
    return completed.length > 0
      ? new Date(completed[0]?.startTime || "")
      : undefined;
  }, [appointments]);

  const nextVisit = useMemo(() => {
    if (!appointments.length) return undefined;
    const upcoming = appointments
      .filter(
        (a) => a.status === "scheduled" && new Date(a.startTime) > new Date(),
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    return upcoming.length > 0
      ? new Date(upcoming[0]?.startTime || "")
      : undefined;
  }, [appointments]);

  const handleScheduleVisit = useCallback(() => {
    if (patient?.id) {
      router.push(`/appointments?patientId=${patient.id}&action=new`);
    }
  }, [router, patient?.id]);

  const handleBackToPatients = useCallback(() => {
    const previousRoute = popRoute();
    if (
      previousRoute &&
      patient?.id &&
      previousRoute !== `/patients/${patient.id}`
    ) {
      router.push(previousRoute);
    } else {
      router.push("/patients");
    }
  }, [router, patient?.id, popRoute]);

  const { repeatPrescription } = useRepeatPrescription();

  const handleRepeatPrescription = useCallback(
    (appointmentId: string) => {
      if (patient?.id) {
        repeatPrescription(appointmentId, patient.id);
      }
    },
    [patient?.id, repeatPrescription],
  );

  // All hooks must be called before any conditional returns
  const initials = useMemo(
    () =>
      patient
        ? `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}`
        : "",
    [patient],
  );

  // Conditional returns after all hooks
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">Loading patient details...</p>
        </div>
      </div>
    );
  }

  if (!patient || !patient.id) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Patient not found</p>
        <Button onClick={() => router.push("/patients")}>
          Back to Patients
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full p-6">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleBackToPatients}
            className="rounded-full hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Patients</span>
            <span>/</span>
            <span className="font-medium text-foreground">
              {patient.firstName} {patient.lastName}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          <WhatsAppButton
            phoneNumber={patient.phoneNumber}
            message={`Hello ${patient.firstName}, this is a message from ${clinic?.name || "Docita Clinic"}.`}
            variant="outline"
            className="rounded-full"
          />
          {canAccess(Feature.CALENDAR_SLOTS) && (
            <Button
              onClick={handleScheduleVisit}
              className="rounded-full shadow-lg shadow-primary/20"
            >
              <Calendar className="mr-2 h-4 w-4" /> Schedule Visit
            </Button>
          )}
        </div>
      </div>

      {/* Premium Profile Header */}
      <PatientProfileHeader
        patient={patient}
        initials={initials}
        age={age}
        onEdit={() => setIsEditDialogOpen(true)}
      />

      {/* Edit Patient Dialog */}
      <EditPatientDialog
        patient={patient}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onPatientUpdated={() => refetch()}
      />

      {/* Stats Cards */}
      <PatientStatsCards
        appointments={appointments}
        lastVisit={lastVisit}
        nextVisit={nextVisit}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="history" className="w-full">
        <div className="flex items-center justify-between mb-6">
          <TabsList className="bg-muted/50 p-1 rounded-full h-12">
            <TabsTrigger
              value="history"
              className="rounded-full px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Clock className="mr-2 h-4 w-4" /> Timeline
            </TabsTrigger>
            <TabsTrigger
              value="documents"
              className="rounded-full px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <FileText className="mr-2 h-4 w-4" /> Documents
            </TabsTrigger>
            <TabsTrigger
              value="notes"
              className="rounded-full px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Activity className="mr-2 h-4 w-4" /> Clinical Notes
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <PatientTagManager patientId={patient.id!} />
          </div>
        </div>

        <TabsContent value="history" className="space-y-6 mt-0">
          {appointments.length === 0 ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Calendar className="h-16 w-16 mb-4 opacity-10" />
                <p className="text-lg font-medium">No visits recorded yet</p>
                <p className="text-sm">
                  {canAccess(Feature.CALENDAR_SLOTS)
                    ? "Schedule a visit to start tracking history."
                    : "Visit history will appear here."}
                </p>
                {canAccess(Feature.CALENDAR_SLOTS) && (
                  <Button
                    variant="link"
                    onClick={handleScheduleVisit}
                    className="mt-2"
                  >
                    Schedule Now
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6">
              {appointments.map((apt) => (
                <Card
                  key={apt.id}
                  className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all duration-300 group"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Date Column */}
                    <div className="bg-primary/5 p-6 md:w-56 flex flex-col justify-center items-center md:items-start border-b md:border-b-0 md:border-r border-border/50 group-hover:bg-primary/10 transition-colors">
                      <span className="text-4xl font-bold text-primary tracking-tighter">
                        {format(new Date(apt.startTime), "d")}
                      </span>
                      <span className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                        {format(new Date(apt.startTime), "MMM yyyy")}
                      </span>
                      <span className="text-xs text-muted-foreground mt-2 font-medium">
                        {format(new Date(apt.startTime), "EEEE • h:mm a")}
                      </span>

                      <Badge
                        variant={
                          apt.status === "completed" ? "default" : "secondary"
                        }
                        className="mt-4 w-full justify-center capitalize rounded-full"
                      >
                        {apt.status}
                      </Badge>
                    </div>

                    {/* Content Column */}
                    <div className="flex-1 p-6 flex flex-col justify-between gap-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-xl text-foreground flex items-center gap-2">
                            {apt.type}
                            {apt.status === "completed" && (
                              <CheckCircle2 className="h-5 w-5 text-green-500" />
                            )}
                          </h4>
                          <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                            <Stethoscope className="h-4 w-4" />
                            <span className="font-medium">
                              {apt.doctor?.name}
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-full"
                            onClick={() =>
                              router.push(
                                `/consultation/${apt.id}?from=patient`,
                              )
                            }
                          >
                            {apt.status === "completed"
                              ? "View Details"
                              : "Start Consultation"}
                          </Button>
                          {apt.status === "completed" &&
                            apt.prescription &&
                            apt.id && (
                              <Button
                                size="sm"
                                variant="secondary"
                                className="rounded-full gap-1"
                                onClick={() =>
                                  handleRepeatPrescription(apt.id!)
                                }
                              >
                                <Pill className="h-3 w-3" />
                                Repeat Rx
                              </Button>
                            )}
                        </div>
                      </div>

                      {/* Clinical Data Grid */}
                      <div className="grid grid-cols-1 gap-4">
                        {/* Observations */}
                        {apt.observations && (
                          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              <FileText className="h-3 w-3" /> Clinical
                              Observations
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {apt.observations}
                            </p>
                          </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Vitals */}
                          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              <Activity className="h-3 w-3" /> Vitals
                            </div>
                            {apt.vitalSign ? (
                              <div className="text-sm font-medium space-y-1">
                                {apt.vitalSign.bloodPressure && (
                                  <div className="flex justify-between">
                                    <span>BP</span>{" "}
                                    <span>{apt.vitalSign.bloodPressure}</span>
                                  </div>
                                )}
                                {apt.vitalSign.pulse && (
                                  <div className="flex justify-between">
                                    <span>HR</span>{" "}
                                    <span>{apt.vitalSign.pulse} bpm</span>
                                  </div>
                                )}
                                {apt.vitalSign.temperature && (
                                  <div className="flex justify-between">
                                    <span>Temp</span>{" "}
                                    <span>{apt.vitalSign.temperature}°F</span>
                                  </div>
                                )}
                                {apt.vitalSign.weight && (
                                  <div className="flex justify-between">
                                    <span>Weight</span>{" "}
                                    <span>{apt.vitalSign.weight} kg</span>
                                  </div>
                                )}
                                {apt.vitalSign.height && (
                                  <div className="flex justify-between">
                                    <span>Height</span>{" "}
                                    <span>{apt.vitalSign.height} cm</span>
                                  </div>
                                )}
                                {apt.vitalSign.spo2 && (
                                  <div className="flex justify-between">
                                    <span>SpO2</span>{" "}
                                    <span>{apt.vitalSign.spo2}%</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground italic">
                                No vitals recorded
                              </div>
                            )}
                          </div>

                          {/* Prescription */}
                          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              <Pill className="h-3 w-3" /> Prescription
                            </div>
                            {apt.prescription ? (
                              <div className="space-y-2">
                                {apt.prescription.medications?.map(
                                  (med, idx) => (
                                    <div
                                      key={idx}
                                      className="text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0"
                                    >
                                      <p className="font-medium">{med.name}</p>
                                      <p className="text-xs text-muted-foreground">
                                        {med.dosage} • {med.frequency} •{" "}
                                        {med.duration}
                                      </p>
                                    </div>
                                  ),
                                )}
                                {apt.prescription.instructions && (
                                  <p className="text-xs text-muted-foreground pt-2 border-t">
                                    {apt.prescription.instructions}
                                  </p>
                                )}
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-xs"
                                  onClick={() =>
                                    router.push(
                                      `/prescriptions/${apt.prescription?.id}`,
                                    )
                                  }
                                >
                                  View Full Prescription
                                </Button>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground italic">
                                No prescription
                              </div>
                            )}
                          </div>

                          {/* Invoice */}
                          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              <FileText className="h-3 w-3" /> Invoice
                            </div>
                            {apt.invoice ? (
                              <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm">Total</span>
                                  <span className="text-lg font-bold">
                                    ₹{apt.invoice.total?.toFixed(2)}
                                  </span>
                                </div>
                                <Badge
                                  variant={
                                    apt.invoice.status === "paid"
                                      ? "default"
                                      : "secondary"
                                  }
                                  className="w-full justify-center"
                                >
                                  {apt.invoice.status}
                                </Badge>
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-xs"
                                  onClick={() =>
                                    router.push(`/invoices/${apt.invoice?.id}`)
                                  }
                                >
                                  View Invoice
                                </Button>
                              </div>
                            ) : (
                              <div className="text-sm text-muted-foreground italic">
                                No invoice
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Notes */}
                        {apt.notes && (
                          <div className="bg-muted/30 rounded-xl p-4 space-y-2">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                              <FileText className="h-3 w-3" /> Appointment Notes
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {apt.notes}
                            </p>
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

        <TabsContent value="documents" className="mt-6">
          <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-4">
            {documents.map((doc) => (
              <Card
                key={doc.id}
                className="group cursor-pointer hover:shadow-md transition-all border-none bg-muted/30 hover:bg-background"
              >
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="p-4 bg-primary/10 rounded-full text-primary group-hover:scale-110 transition-transform">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-semibold truncate w-full px-2">
                      {doc.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(doc.createdAt), "MMM d, yyyy")}
                    </p>
                  </div>
                  <Badge variant="secondary" className="mt-2">
                    {doc.type}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {documents.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                <FileText className="h-12 w-12 mb-4 opacity-20" />
                <p>No documents found</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="border-dashed">
            <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mb-4 opacity-20" />
              <p>Clinical notes feature coming soon</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
