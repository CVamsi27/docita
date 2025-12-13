"use client";

import { useCallback, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@workspace/ui/components/card";
import { PatientTagManager } from "@/components/patients/patient-tag-manager";
import { FhirExportDialog } from "@/components/patients/fhir-export-dialog";
import { usePatientData } from "@/hooks/use-patient-data";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { useSmartBack } from "@/hooks/use-smart-back";
import { useRepeatPrescription } from "@/hooks/use-repeat-prescription";
import { PatientFaceSheetHeader } from "@/components/patients/patient-face-sheet-header";
import { PatientStatsCards } from "@/components/patients/patient-stats-cards";
import { EditPatientDialog } from "@/components/patients/edit-patient-dialog";
import {
  BillingModal,
  ConsultationNotesModal,
  PrescriptionModal,
  VitalsModal,
} from "@/components/modals";
import {
  Activity,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  FileJson,
  FileText,
  HeartPulse,
  Pill,
  Receipt,
  Stethoscope,
} from "lucide-react";
import { format } from "date-fns";
import { Feature, usePermissionStore } from "@/lib/stores/permission-store";
import { PatientMedicalHistory } from "@/components/patients/patient-medical-history";
import { PatientWithMedicalHistory as PatientWithHistory } from "@workspace/types";
import { CRUDDialog } from "@workspace/ui/components/crud-dialog";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { patient, appointments, documents, loading, refetch } = usePatientData(
    params["id"] as string,
  );
  const { user } = useAuth();
  const goBack = useSmartBack("/");

  const { canAccess } = usePermissionStore();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Check if doctor can access this patient
  const canAccessPatient = useMemo(() => {
    if (user?.role !== "DOCTOR") return true; // Non-doctors can access all patients

    // Doctors can only access patients they have appointments with
    const hasAppointment = appointments.some(
      (apt) => apt.doctorId === user?.id,
    );
    return hasAppointment;
  }, [user, appointments]);

  // Modal state
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<
    string | null
  >(null);
  const [modalType, setModalType] = useState<
    "vitals" | "prescription" | "billing" | "notes" | "medical-history" | null
  >(null);

  const openModal = (
    appointmentId: string,
    type: "vitals" | "prescription" | "billing" | "notes" | "medical-history",
  ) => {
    setSelectedAppointmentId(appointmentId);
    setModalType(type);
  };

  const closeModal = () => {
    setSelectedAppointmentId(null);
    setModalType(null);
  };

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
    goBack();
  }, [goBack]);

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

  if (!canAccessPatient) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">
          You do not have access to this patient
        </p>
        <Button onClick={() => router.push("/patients")}>
          Back to Patients
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full p-6">
      {/* Top Navigation - Keep breadcrumbs but minimal */}
      <div className="flex items-center justify-between mb-4">
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
            <span
              className="cursor-pointer hover:text-foreground"
              onClick={() => router.push("/patients")}
            >
              Patients
            </span>
            <span>/</span>
            <span>
              {patient.firstName} {patient.lastName}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          {/* Actions like Edit, Export moved here */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditDialogOpen(true)}
          >
            Edit Profile
          </Button>
          <FhirExportDialog
            patientId={patient.id!}
            patientName={`${patient.firstName} ${patient.lastName}`}
          >
            <Button variant="ghost" size="icon">
              <FileJson className="h-4 w-4" />
            </Button>
          </FhirExportDialog>
        </div>
      </div>

      {/* Hospital-Grade Sticky Face Sheet */}
      <PatientFaceSheetHeader patient={patient} initials={initials} age={age} />

      {/* Stats Cards - shifted down */}
      <div className="mt-6">
        <PatientStatsCards
          appointments={appointments as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          lastVisit={lastVisit as any} // eslint-disable-line @typescript-eslint/no-explicit-any
          nextVisit={nextVisit as any} // eslint-disable-line @typescript-eslint/no-explicit-any
        />
      </div>

      {/* Edit Patient Dialog */}
      <EditPatientDialog
        patient={patient}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onPatientUpdated={() => refetch()}
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
              value="medical-history"
              className="rounded-full px-6 h-10 data-[state=active]:bg-background data-[state=active]:shadow-sm"
            >
              <Activity className="mr-2 h-4 w-4" /> Medical History
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
              <FileJson className="mr-2 h-4 w-4" /> Clinical Notes
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
                      {/* Header with Title and Doctor */}
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
                      </div>

                      {/* Clinical Data Grid */}
                      <div className="grid grid-cols-1 gap-4">
                        {/* Clinical Documentation */}
                        {(apt.chiefComplaint ||
                          apt.historyOfPresentIllness ||
                          apt.clinicalImpression ||
                          apt.finalDiagnosis ||
                          apt.treatmentPlan ||
                          apt.observations) && (
                          <div className="space-y-3">
                            {/* Chief Complaint */}
                            {apt.chiefComplaint && (
                              <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-4 space-y-2 border border-blue-200/50 dark:border-blue-800/30">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                  <FileText className="h-3 w-3" /> Chief
                                  Complaint
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {apt.chiefComplaint}
                                </p>
                              </div>
                            )}

                            {/* History of Present Illness */}
                            {apt.historyOfPresentIllness && (
                              <div className="bg-amber-50 dark:bg-amber-950/20 rounded-lg p-4 space-y-2 border border-amber-200/50 dark:border-amber-800/30">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                                  <FileText className="h-3 w-3" /> History of
                                  Present Illness
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {typeof apt.historyOfPresentIllness ===
                                  "string"
                                    ? apt.historyOfPresentIllness
                                    : JSON.stringify(
                                        apt.historyOfPresentIllness,
                                        null,
                                        2,
                                      )}
                                </p>
                              </div>
                            )}

                            {/* Clinical Impression */}
                            {apt.clinicalImpression && (
                              <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-4 space-y-2 border border-purple-200/50 dark:border-purple-800/30">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                                  <Stethoscope className="h-3 w-3" /> Clinical
                                  Assessment
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {apt.clinicalImpression}
                                </p>
                              </div>
                            )}

                            {/* Final Diagnosis */}
                            {apt.finalDiagnosis && (
                              <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-4 space-y-2 border border-green-200/50 dark:border-green-800/30">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
                                  <CheckCircle2 className="h-3 w-3" /> Final
                                  Diagnosis
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {apt.finalDiagnosis}
                                </p>
                              </div>
                            )}

                            {/* Treatment Plan */}
                            {apt.treatmentPlan && (
                              <div className="bg-teal-50 dark:bg-teal-950/20 rounded-lg p-4 space-y-2 border border-teal-200/50 dark:border-teal-800/30">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                                  <HeartPulse className="h-3 w-3" /> Treatment
                                  Plan
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {apt.treatmentPlan}
                                </p>
                              </div>
                            )}

                            {/* Legacy Observations */}
                            {apt.observations && (
                              <div className="bg-slate-50 dark:bg-slate-950/20 rounded-lg p-4 space-y-2 border border-slate-200/50 dark:border-slate-800/30">
                                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
                                  <FileText className="h-3 w-3" /> Additional
                                  Notes
                                </div>
                                <p className="text-sm text-foreground whitespace-pre-wrap">
                                  {apt.observations}
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Three Column Section: Vitals, Prescription, Invoice */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* Vitals Section */}
                          <div className="rounded-lg border border-blue-200/50 dark:border-blue-800/30 overflow-hidden">
                            {/* Header */}
                            <div className="bg-blue-50 dark:bg-blue-950/20 px-4 py-3 border-b border-blue-200/50 dark:border-blue-800/30">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-400">
                                <Activity className="h-4 w-4" /> Vitals
                              </div>
                            </div>
                            {/* Content */}
                            <div className="p-4 space-y-3">
                              {apt.vitalSign ? (
                                <div className="text-sm space-y-2">
                                  {apt.vitalSign.bloodPressure && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        BP
                                      </span>
                                      <span className="font-semibold">
                                        {apt.vitalSign.bloodPressure}
                                      </span>
                                    </div>
                                  )}
                                  {apt.vitalSign.pulse && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        HR
                                      </span>
                                      <span className="font-semibold">
                                        {apt.vitalSign.pulse} bpm
                                      </span>
                                    </div>
                                  )}
                                  {apt.vitalSign.temperature && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        Temp
                                      </span>
                                      <span className="font-semibold">
                                        {apt.vitalSign.temperature}°F
                                      </span>
                                    </div>
                                  )}
                                  {apt.vitalSign.weight && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        Weight
                                      </span>
                                      <span className="font-semibold">
                                        {apt.vitalSign.weight} kg
                                      </span>
                                    </div>
                                  )}
                                  {apt.vitalSign.height && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        Height
                                      </span>
                                      <span className="font-semibold">
                                        {apt.vitalSign.height} cm
                                      </span>
                                    </div>
                                  )}
                                  {apt.vitalSign.spo2 && (
                                    <div className="flex justify-between items-center">
                                      <span className="text-muted-foreground">
                                        SpO2
                                      </span>
                                      <span className="font-semibold">
                                        {apt.vitalSign.spo2}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground italic text-center py-2">
                                  No vitals recorded
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Prescription Section */}
                          <div className="rounded-lg border border-green-200/50 dark:border-green-800/30 overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="bg-green-50 dark:bg-green-950/20 px-4 py-3 border-b border-green-200/50 dark:border-green-800/30">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-green-700 dark:text-green-400">
                                <Pill className="h-4 w-4" /> Prescription
                              </div>
                            </div>
                            {/* Content */}
                            <div className="p-4 space-y-3 flex-1">
                              {apt.prescription ? (
                                <div className="space-y-3">
                                  <div className="space-y-2 max-h-32 overflow-y-auto">
                                    {apt.prescription.medications?.map(
                                      (med, idx) => (
                                        <div
                                          key={idx}
                                          className="text-sm border-b border-border/30 pb-2 last:border-0 last:pb-0"
                                        >
                                          <p className="font-medium text-foreground">
                                            {med.name}
                                          </p>
                                          <p className="text-xs text-muted-foreground">
                                            {med.dosage} • {med.frequency} •{" "}
                                            {med.duration}
                                          </p>
                                        </div>
                                      ),
                                    )}
                                  </div>
                                  {apt.prescription.instructions && (
                                    <p className="text-xs text-muted-foreground pt-2 border-t border-border/30 italic">
                                      {apt.prescription.instructions}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground italic text-center py-2">
                                  No prescription
                                </div>
                              )}
                            </div>
                            {/* Footer Actions */}
                            <div className="bg-muted/30 px-4 py-3 border-t border-green-200/50 dark:border-green-800/30 space-y-2">
                              {apt.prescription && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() =>
                                    router.push(
                                      `/prescriptions/${apt.prescription?.id}`,
                                    )
                                  }
                                >
                                  View Prescription
                                </Button>
                              )}
                              {apt.status === "completed" &&
                                apt.prescription &&
                                apt.id && (
                                  <Button
                                    variant="secondary"
                                    size="sm"
                                    className="w-full gap-1 text-xs"
                                    onClick={() =>
                                      handleRepeatPrescription(apt.id!)
                                    }
                                  >
                                    <Pill className="h-3 w-3" />
                                    Repeat Prescription
                                  </Button>
                                )}
                            </div>
                          </div>

                          {/* Invoice/Billing Section */}
                          <div className="rounded-lg border border-purple-200/50 dark:border-purple-800/30 overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="bg-purple-50 dark:bg-purple-950/20 px-4 py-3 border-b border-purple-200/50 dark:border-purple-800/30">
                              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">
                                <FileText className="h-4 w-4" /> Billing
                              </div>
                            </div>
                            {/* Content */}
                            <div className="p-4 space-y-3 flex-1">
                              {apt.invoice ? (
                                <div className="space-y-3">
                                  <div>
                                    <p className="text-xs text-muted-foreground mb-1">
                                      Total Amount
                                    </p>
                                    <p className="text-2xl font-bold text-foreground">
                                      ₹{apt.invoice.total?.toFixed(2)}
                                    </p>
                                  </div>
                                  <Badge
                                    variant={
                                      apt.invoice.status === "paid"
                                        ? "default"
                                        : "secondary"
                                    }
                                    className="w-full justify-center capitalize"
                                  >
                                    {apt.invoice.status}
                                  </Badge>
                                </div>
                              ) : (
                                <div className="text-sm text-muted-foreground italic text-center py-2">
                                  No invoice generated
                                </div>
                              )}
                            </div>
                            {/* Footer Actions */}
                            <div className="bg-muted/30 px-4 py-3 border-t border-purple-200/50 dark:border-purple-800/30 space-y-2">
                              {apt.invoice && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="w-full text-xs"
                                  onClick={() =>
                                    router.push(`/invoices/${apt.invoice?.id}`)
                                  }
                                >
                                  View Invoice
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        {apt.notes && (
                          <div className="bg-slate-50 dark:bg-slate-900/20 rounded-lg p-4 space-y-2 border border-slate-200/50 dark:border-slate-800/30">
                            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-400">
                              <FileText className="h-3 w-3" /> Appointment Notes
                            </div>
                            <p className="text-sm text-foreground">
                              {apt.notes}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Primary Actions Footer */}
                      <div className="flex flex-wrap gap-2 pt-4 border-t border-border/30">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(apt.id!, "vitals");
                          }}
                        >
                          <Activity className="h-3.5 w-3.5" /> Vitals
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(apt.id!, "prescription");
                          }}
                        >
                          <Pill className="h-3.5 w-3.5" /> Rx
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(apt.id!, "medical-history");
                          }}
                        >
                          <Activity className="h-3.5 w-3.5" /> History
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(apt.id!, "billing");
                          }}
                        >
                          <Receipt className="h-3.5 w-3.5" /> Invoice
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            openModal(apt.id!, "notes");
                          }}
                        >
                          <FileText className="h-3.5 w-3.5" /> Notes
                        </Button>
                        <Button
                          className="flex-1 rounded-full ml-auto"
                          size="sm"
                          onClick={() =>
                            router.push(`/consultation/${apt.id}?from=patient`)
                          }
                        >
                          {apt.status === "completed"
                            ? "View Details"
                            : "Full Consultation"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="medical-history" className="mt-6">
          <PatientMedicalHistory
            patient={patient as PatientWithHistory}
            readOnly={true}
          />
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

        <TabsContent value="notes" className="space-y-4 mt-0">
          {appointments.filter(
            (apt) =>
              apt.chiefComplaint ||
              apt.historyOfPresentIllness ||
              apt.clinicalImpression ||
              apt.finalDiagnosis ||
              apt.treatmentPlan ||
              apt.observations ||
              apt.reviewOfSystems ||
              apt.pastMedicalHistory ||
              apt.provisionalDiagnosis ||
              apt.differentialDiagnosis,
          ).length === 0 ? (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <FileText className="h-16 w-16 mb-4 opacity-10" />
                <p className="text-lg font-medium">No clinical notes yet</p>
                <p className="text-sm">
                  Clinical notes from consultations will appear here.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointments
                .filter(
                  (apt) =>
                    apt.chiefComplaint ||
                    apt.historyOfPresentIllness ||
                    apt.clinicalImpression ||
                    apt.finalDiagnosis ||
                    apt.treatmentPlan ||
                    apt.observations ||
                    apt.reviewOfSystems ||
                    apt.pastMedicalHistory ||
                    apt.provisionalDiagnosis ||
                    apt.differentialDiagnosis,
                )
                .sort(
                  (a, b) =>
                    new Date(b.startTime).getTime() -
                    new Date(a.startTime).getTime(),
                )
                .map((apt) => (
                  <Card key={apt.id} className="overflow-hidden">
                    <div className="bg-muted/30 px-4 py-3 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Badge variant="outline" className="text-xs">
                            {format(new Date(apt.startTime), "MMM d, yyyy")}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {apt.doctor?.name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            router.push(`/consultation/${apt.id}?from=patient`)
                          }
                        >
                          View Full
                        </Button>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-3">
                      {apt.chiefComplaint && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            Chief Complaint
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded border">
                            {apt.chiefComplaint}
                          </div>
                        </div>
                      )}

                      {apt.historyOfPresentIllness && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            History of Present Illness
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded border">
                            {typeof apt.historyOfPresentIllness === "string"
                              ? apt.historyOfPresentIllness
                              : JSON.stringify(
                                  apt.historyOfPresentIllness,
                                  null,
                                  2,
                                )}
                          </div>
                        </div>
                      )}

                      {apt.reviewOfSystems && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            Review of Systems
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded border">
                            {apt.reviewOfSystems}
                          </div>
                        </div>
                      )}

                      {apt.provisionalDiagnosis && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            Provisional Diagnosis
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded border">
                            {apt.provisionalDiagnosis}
                          </div>
                        </div>
                      )}

                      {apt.clinicalImpression && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            Clinical Assessment
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded border">
                            {apt.clinicalImpression}
                          </div>
                        </div>
                      )}

                      {apt.differentialDiagnosis && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            Differential Diagnosis
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded border">
                            {apt.differentialDiagnosis}
                          </div>
                        </div>
                      )}

                      {apt.finalDiagnosis && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            Final Diagnosis
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded border">
                            {apt.finalDiagnosis}
                          </div>
                        </div>
                      )}

                      {apt.treatmentPlan && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            Treatment Plan
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded border">
                            {apt.treatmentPlan}
                          </div>
                        </div>
                      )}

                      {apt.pastMedicalHistory && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            Past Medical History
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded border">
                            {apt.pastMedicalHistory}
                          </div>
                        </div>
                      )}

                      {apt.observations && (
                        <div className="space-y-1">
                          <div className="text-xs font-semibold text-muted-foreground uppercase">
                            Additional Notes
                          </div>
                          <div className="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded border">
                            {apt.observations}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Components */}
      {selectedAppointmentId && patient && (
        <>
          <VitalsModal
            open={modalType === "vitals"}
            onOpenChange={(open) => !open && closeModal()}
            appointmentId={selectedAppointmentId}
            patientName={`${patient.firstName} ${patient.lastName}`}
            onSaved={refetch}
          />
          <PrescriptionModal
            open={modalType === "prescription"}
            onOpenChange={(open) => !open && closeModal()}
            appointmentId={selectedAppointmentId}
            patientId={patient.id!}
            doctorId={
              appointments.find((a) => a.id === selectedAppointmentId)
                ?.doctorId || ""
            }
            patientName={`${patient.firstName} ${patient.lastName}`}
            initialDiagnoses={
              appointments
                .find((a) => a.id === selectedAppointmentId)
                ?.diagnoses?.map((d) => ({
                  id: d.id || crypto.randomUUID(),
                  icdCodeId: d.icdCodeId || d.icdCode?.id || "",
                  icdCode: d.icdCode,
                  isPrimary: d.isPrimary ?? false,
                  notes: d.notes,
                  createdAt: d.createdAt || new Date().toISOString(),
                })) || []
            }
            onSaved={refetch}
          />
          <BillingModal
            open={modalType === "billing"}
            onOpenChange={(open) => !open && closeModal()}
            appointmentId={selectedAppointmentId}
            patientId={patient.id!}
            patientName={`${patient.firstName} ${patient.lastName}`}
            onSaved={refetch}
          />
          <ConsultationNotesModal
            open={modalType === "notes"}
            onOpenChange={(open) => !open && closeModal()}
            appointmentId={selectedAppointmentId}
            patientId={patient.id!}
            patientName={`${patient.firstName} ${patient.lastName}`}
            onSaved={refetch}
          />
        </>
      )}

      {/* Medical History Modal */}
      {modalType === "medical-history" && patient && (
        <CRUDDialog
          open={true}
          onOpenChange={closeModal}
          title={`Medical History - ${patient.firstName} ${patient.lastName}`}
          submitLabel="Save & Close"
          onSubmit={closeModal}
          contentClassName="max-w-3xl max-h-[90vh] overflow-y-auto"
        >
          <div className="py-4">
            <PatientMedicalHistory
              patient={patient as PatientWithHistory}
              readOnly={false}
            />
          </div>
        </CRUDDialog>
      )}
    </div>
  );
}
