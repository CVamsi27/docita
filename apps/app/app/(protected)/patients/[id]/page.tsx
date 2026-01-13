"use client";

import { useParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  EditPatientDialog,
  PatientAllergyAlertContainer as PatientAllergyAlert,
  PatientFaceSheetHeaderContainer as PatientFaceSheetHeader,
  PatientMedicalHistoryContainer as PatientMedicalHistory,
  PatientStatsCardsContainer as PatientStatsCards,
  PatientTagManagerContainer as PatientTagManager,
  PatientTimelineCompact,
  PatientVitalsBannerContainer as PatientVitalsBanner,
} from "@/features/patients/components";
import { Button } from "@workspace/ui/components/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/tabs";
import { Activity, Calendar, Clock, FileText } from "lucide-react";
import { Feature } from "@/lib/stores/permission-store";
import { PatientWithMedicalHistory as PatientWithHistory } from "@workspace/types";

// New imports
import { usePatientDetailLogic } from "@/features/patients/hooks/use-patient-detail-logic";
import { PatientPageHeaderUI } from "@/features/patients/components/PatientPageHeaderUI";
import { PatientDocumentsTabUI } from "@/features/patients/components/PatientDocumentsTabUI";

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter(); // needed for fallback redirects in logic? No, logic handles it mostly but hook returns handlers.

  // Use the new hook
  const { state, handlers } = usePatientDetailLogic(params["id"] as string);

  const {
    patient,
    appointments,
    documents,
    statistics,
    loading,
    canAccessPatient,
    isEditDialogOpen,
    setIsEditDialogOpen,
    canAccess,
  } = state;

  const {
    handleBackToPatients,
    handleScheduleVisit,
    handleRepeatPrescription,
    handleRefetch,
  } = handlers;

  // Conditional returns
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
    <div className="flex flex-col gap-8 max-w-7xl mx-auto w-full p-6">
      {/* Top Navigation & Header */}
      <PatientPageHeaderUI
        patient={{
          id: patient.id,
          firstName: patient.firstName,
          lastName: patient.lastName,
        }}
        onBack={handleBackToPatients}
        onNavigateToPatients={handleBackToPatients}
        onEdit={() => setIsEditDialogOpen(true)}
      />

      {/* Hospital-Grade Sticky Face Sheet */}
      <PatientFaceSheetHeader patient={patient} />

      {/* Allergy Alert */}
      <div className="mt-4">
        <PatientAllergyAlert patientId={patient.id!} />
      </div>

      {/* Vitals Banner - Latest available */}
      <div className="mt-2">
        <PatientVitalsBanner appointments={appointments} />
      </div>

      {/* Stats Cards - always show, even if no appointments */}
      <div className="mt-2">
        <PatientStatsCards statistics={statistics} loading={loading} />
      </div>

      {/* Edit Patient Dialog */}
      <EditPatientDialog
        patient={patient}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onPatientUpdated={() => handleRefetch()}
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
            <PatientTimelineCompact
              appointments={appointments}
              onViewDetails={(id) =>
                router.push(`/consultation/${id}?from=patient`)
              }
              onRepeatPrescription={(id) => handleRepeatPrescription(id)}
            />
          )}
        </TabsContent>

        <TabsContent value="medical-history" className="mt-6">
          <PatientMedicalHistory
            patient={patient as PatientWithHistory}
            readOnly={true}
          />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <PatientDocumentsTabUI documents={documents} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
