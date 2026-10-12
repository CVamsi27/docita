import { Feature } from "@workspace/types";
import { FeatureGate } from "@/components/auth/feature-gate";
import { PageFeatureGate } from "@/components/auth/PageFeatureGate";
import { useTranslation } from "react-i18next";
import { AddAppointmentDialogContainer } from "@/features/appointments";
import { AddPatientDialog, EditPatientDialog } from "@/features/patients/components/forms/PatientDialogs";

import { usePatientsLogic } from "@/features/patients/hooks/use-patients-logic";
import { usePermissions } from "@/hooks/use-permissions";
import { PatientsPageUI } from "./PatientsPageUI";

export function PatientsPageContainer() {
  const { t } = useTranslation("Patients.list");
  const { state, handlers } = usePatientsLogic();
  const { canStartConsultation } = usePermissions();

  return (
    <PageFeatureGate
      feature={Feature.BASIC_PATIENT_MANAGEMENT}
      title={t("pageTitle")}
      description={t("pageDescription")}
    >
      <PatientsPageUI
        isLoading={state.isLoading}
        error={state.error}
        onRetry={handlers.retry}
        searchQuery={state.searchQuery}
        sortConfig={state.sortConfig}
        filteredPatients={state.filteredPatients}
        onSearchChange={handlers.setSearchQuery}
        onClearSearch={handlers.clearSearch}
        onSort={handlers.handleSort}
        onViewPatient={handlers.goToPatient}
        onSchedulePatient={handlers.schedulePatient}
        onEditPatient={handlers.setEditingPatient}
        onAddPatient={handlers.openAddDialog}
        totalPatients={state.totalPatients}
        pageSize={state.pageSize}
        currentPage={state.currentPage}
        canGoPrev={state.canGoPrev}
        canGoNext={state.canGoNext}
        onPrevPage={handlers.goToPrevPage}
        onNextPage={handlers.goToNextPage}
        onOpenConsultationQueue={
          canStartConsultation ? handlers.openConsultationQueue : undefined
        }
      />

      <AddPatientDialog
        open={state.isAddDialogOpen}
        onOpenChange={handlers.handleDialogChange}
        onPatientAdded={handlers.onPatientAdded}
      />

      <EditPatientDialog
        patient={state.editingPatient}
        open={!!state.editingPatient}
        onOpenChange={(open: boolean) =>
          !open && handlers.setEditingPatient(null)
        }
        onPatientUpdated={handlers.onPatientUpdated}
      />

      <FeatureGate feature={Feature.CALENDAR_SLOTS} fallback={null}>
        <AddAppointmentDialogContainer
          open={state.isScheduleDialogOpen}
          onOpenChange={handlers.handleScheduleDialogChange}
          preselectedPatientId={state.schedulingPatientId}
          selectedDate={new Date()}
          onAppointmentAdded={async () => undefined}
        />
      </FeatureGate>
    </PageFeatureGate>
  );
}
