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
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-state";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { CalendarPlus, Clock, FileText, Pencil, User } from "lucide-react";
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
      <AppPageScaffold>
        <DataState
          status="loading"
          className="min-h-[50vh]"
          loadingMessage="Loading patient details..."
        />
      </AppPageScaffold>
    );
  }

  if (error) {
    return (
      <AppPageScaffold>
        <DataState
          status="error"
          className="min-h-[50vh]"
          errorMessage="Failed to load patient details."
          onRetry={handleRefetch}
        />
      </AppPageScaffold>
    );
  }

  if (!patient || !patient.id) {
    return (
      <AppPageScaffold>
        <DataState
          status="empty"
          className="min-h-[50vh]"
          emptyIcon={User}
          emptyTitle="Patient not found"
          emptyDescription="This patient record is unavailable."
          emptyAction={{
            label: "Back to Patients",
            onClick: handleBackToPatients,
          }}
        />
      </AppPageScaffold>
    );
  }

  if (!canAccessPatient) {
    return (
      <AppPageScaffold>
        <DataState
          status="error"
          className="min-h-[50vh]"
          errorMessage="You do not have access to this patient."
          onRetry={handleBackToPatients}
        />
      </AppPageScaffold>
    );
  }

  return (
    <AppPageScaffold contentClassName="space-y-0">
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

      <div className="space-y-6 px-4 py-6 md:px-6">
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
    </AppPageScaffold>
  );
}
