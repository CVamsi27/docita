"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import {
  EditPatientDialog,
  PatientFaceSheetHeaderContainer as PatientFaceSheetHeader,
} from "@/features/patients/components";
import { PatientDetailTabs } from "@/features/patients/components/details/PatientDetailTabs";
import { PatientHeaderActions } from "@/features/patients/components/details/PatientHeaderActions";
import { PatientAdvisorRail } from "@/features/patients/components/details/patient-advisor-rail";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { User } from "lucide-react";
import { PatientDetailTabLoadingShell } from "@/features/patients/components/details/patient-detail-tab-loading-shell";
import { usePatientDetailLogic } from "@/features/patients/hooks/use-patient-detail-logic";
import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";

export default function PatientDetailPage() {
  return (
    <FeatureGate feature={Feature.BASIC_PATIENT_MANAGEMENT} showLockedCard>
      <PatientDetailPageContent />
    </FeatureGate>
  );
}

function PatientDetailPageContent() {
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
          loadingMessage="Loading patient details…"
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

      <div className="flex flex-col gap-6 py-6 lg:flex-row lg:items-start">
        <div className="min-w-0 flex-1 space-y-6">
          <EditPatientDialog
            patient={patient}
            open={isEditDialogOpen}
            onOpenChange={setIsEditDialogOpen}
            onPatientUpdated={() => handleRefetch()}
          />

          <Suspense fallback={<PatientDetailTabLoadingShell />}>
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
        <PatientAdvisorRail patient={patient} />
      </div>
    </AppPageScaffold>
  );
}
