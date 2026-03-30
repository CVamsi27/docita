"use client";

import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import {
  EditPatientDialog,
  PatientFaceSheetHeaderContainer as PatientFaceSheetHeader,
  PatientTagManagerContainer as PatientTagManager,
} from "@/features/patients/components";
import { Skeleton } from "@workspace/ui/components/skeleton";

const PatientMedicalHistory = dynamic(
  () =>
    import("@/features/patients/components").then(
      (m) => m.PatientMedicalHistoryContainer,
    ),
  { loading: () => <Skeleton className="h-64 rounded-xl" />, ssr: false },
);

const MedicalDocumentList = dynamic(
  () =>
    import(
      "@/features/medical-documents/components/MedicalDocumentList"
    ).then((m) => m.MedicalDocumentList),
  { loading: () => <Skeleton className="h-64 rounded-xl" />, ssr: false },
);

const UnifiedTimelineContainer = dynamic(
  () =>
    import(
      "@/features/patients/components/timeline/UnifiedTimelineContainer"
    ).then((m) => m.UnifiedTimelineContainer),
  { loading: () => <Skeleton className="h-64 rounded-xl" />, ssr: false },
);
import { Button } from "@workspace/ui/components/button";
import { ErrorState } from "@workspace/ui/components/error-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { CalendarPlus, Clock, FileText, Pencil } from "lucide-react";
import { Feature } from "@/lib/stores/permission-store";
import { PatientWithMedicalHistory as PatientWithHistory } from "@workspace/types";
import { usePatientDetailLogic } from "@/features/patients/hooks/use-patient-detail-logic";
import { PatientSnapshotStrip } from "@/features/_shared/components/patient-history";
import { usePatientSnapshot } from "@/hooks/api/use-patient-timeline";

export default function PatientDetailPage() {
  const params = useParams();

  const { state, handlers } = usePatientDetailLogic(params["id"] as string);

  const {
    loading,
    error,
    canAccessPatient,
    isEditDialogOpen,
    setIsEditDialogOpen,
    canAccess,
  } = state;

  const patient = state.patient;

  const {
    handleBackToPatients,
    handleScheduleVisit,
    handleRefetch,
  } = handlers;

  const patientId = patient?.id ?? "";
  const { data: snapshot } = usePatientSnapshot(patientId);

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

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <ErrorState
          message="Failed to load patient details."
          onRetry={handleRefetch}
        />
      </div>
    );
  }

  if (!patient || !patient.id) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">Patient not found</p>
        <Button onClick={handleBackToPatients}>Back to Patients</Button>
      </div>
    );
  }

  if (!canAccessPatient) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <p className="text-muted-foreground">
          You do not have access to this patient
        </p>
        <Button onClick={handleBackToPatients}>Back to Patients</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col max-w-7xl mx-auto w-full">
      <PatientFaceSheetHeader
        patient={patient}
        onBack={handleBackToPatients}
        actions={
          <>
            {canAccess(Feature.CALENDAR_SLOTS) && (
              <Button size="sm" onClick={handleScheduleVisit}>
                <CalendarPlus className="h-4 w-4 mr-1.5" />
                Schedule Visit
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil className="h-4 w-4 mr-1.5" />
              Edit
            </Button>
          </>
        }
      />

      <div className="px-6 py-6 space-y-6">
        {snapshot && (
          <PatientSnapshotStrip snapshot={snapshot} layout="horizontal" showVitals />
        )}

        <EditPatientDialog
          patient={patient}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onPatientUpdated={() => handleRefetch()}
        />

        <Tabs defaultValue="timeline" className="w-full">
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger value="timeline">
                <Clock className="mr-2 h-4 w-4" />
                Timeline
              </TabsTrigger>
              <TabsTrigger value="records">
                <FileText className="mr-2 h-4 w-4" />
                Records
              </TabsTrigger>
              <TabsTrigger value="documents">
                <FileText className="mr-2 h-4 w-4" />
                Documents
              </TabsTrigger>
            </TabsList>

            <div className="flex items-center gap-2">
              <PatientTagManager patientId={patient.id!} />
            </div>
          </div>

          <TabsContent value="timeline" className="mt-0">
            <UnifiedTimelineContainer patientId={patient.id!} />
          </TabsContent>

          <TabsContent value="records" className="mt-0">
            <PatientMedicalHistory
              patient={patient as PatientWithHistory}
              readOnly={true}
              variant="consultation"
            />
          </TabsContent>

          <TabsContent value="documents" className="mt-0">
            <MedicalDocumentList patientId={patient.id!} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
