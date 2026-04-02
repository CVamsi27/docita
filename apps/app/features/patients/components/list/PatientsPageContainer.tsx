"use client";

import { AddPatientDialog, EditPatientDialog } from "@/features/patients/components/forms/PatientDialogs";

import { usePatientsLogic } from "@/features/patients/hooks/use-patients-logic";
import { PatientsPageUI } from "./PatientsPageUI";

export function PatientsPageContainer() {
  const { state, handlers } = usePatientsLogic();

  return (
    <>
      <PatientsPageUI
        isLoading={state.isLoading}
        error={state.error}
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
    </>
  );
}
