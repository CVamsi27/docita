"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import {
  EditPatientDialog,
  PatientFaceSheetHeaderContainer as PatientFaceSheetHeader,
} from "@/features/patients/components";
import { PatientDetailTabs } from "@/features/patients/components/details/PatientDetailTabs";
import { PatientHeaderActions } from "@/features/patients/components/details/PatientHeaderActions";
import { AppPageScaffold } from "@workspace/ui/components/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-state";
import { Skeleton } from "@workspace/ui/components/skeleton";
import { User } from "lucide-react";
import { usePatientDetailLogic } from "@/features/patients/hooks/use-patient-detail-logic";

function PatientDetailTabsFallback() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-10 w-full max-w-4xl" />
      <Skeleton className="h-64 rounded-lg" />
    </div>
  );
}

export default function PatientDetailPage() {
  const params = useParams();
  const patientId = (params["id"] as string) ?? "";

  const { state, handlers } = usePatientDetailLogic(patientId);

  const {
    loading,
    error,
    canAccessPatient,
    canEditPatient,
    canCreateAppointment,
    canRecordPatientVitals,
    isEditDialogOpen,
    setIsEditDialogOpen,
    appointments,
    statistics,
  } = state;

  const patient = state.patient;

  const { handleBackToPatients, handleScheduleVisit, handleRefetch } = handlers;

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
          errorMessage="We could not open this patient record. Please try again."
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
          emptyDescription="This patient record is unavailable"
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
          errorMessage="You do not have access to this patient"
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
          <PatientHeaderActions
            patientId={patient.id}
            appointments={appointments}
            canEditPatient={canEditPatient}
            canCreateAppointment={canCreateAppointment}
            onScheduleVisit={handleScheduleVisit}
            onEdit={() => setIsEditDialogOpen(true)}
          />
        }
      />

      <div className="space-y-6 py-6">
        <EditPatientDialog
          patient={patient}
          open={isEditDialogOpen}
          onOpenChange={setIsEditDialogOpen}
          onPatientUpdated={() => handleRefetch()}
        />

        <Suspense fallback={<PatientDetailTabsFallback />}>
          <PatientDetailTabs
            patient={patient}
            patientId={patient.id}
            appointments={appointments}
            statistics={statistics}
            canEditPatient={canEditPatient}
            canRecordPatientVitals={canRecordPatientVitals}
            onScheduleVisit={handleScheduleVisit}
          />
        </Suspense>
      </div>
    </AppPageScaffold>
  );
}
