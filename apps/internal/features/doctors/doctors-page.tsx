"use client";

import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { PageHeader } from "@workspace/ui/components/layout/page-header";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { useDoctorsPage } from "./use-doctors-page";
import { DoctorsTableSection } from "./DoctorsTableSection";
import { DoctorsViewDialog } from "./DoctorsViewDialog";

export default function DoctorsPage() {
  const {
    clinics,
    filteredDoctors,
    selectedDoctor,
    doctorSearch,
    selectedClinic,
    isViewOpen,
    adminActionBusy,
    rejectionReasonDraft,
    showRejectForm,
    pageStatus,
    errorMessage,
    setDoctorSearch,
    setSelectedClinic,
    setIsViewOpen,
    setShowRejectForm,
    setRejectionReasonDraft,
    handleViewDoctor,
    handleAdminVerify,
    handleAdminReject,
    refetchAll } = useDoctorsPage();
  return (
    <AppPageScaffold
      header={
        <PageHeader title="Doctors"
          description="Monitor doctor profiles, specializations, and credentials" size="compact"
        />
      }
    >
      <DataState status={pageStatus} loadingMessage="Loading doctors…"
        errorMessage={errorMessage} onRetry={refetchAll}
      >
        <DoctorsTableSection
          doctors={filteredDoctors}
          clinics={clinics}
          doctorSearch={doctorSearch}
          selectedClinic={selectedClinic}
          onDoctorSearchChange={setDoctorSearch}
          onSelectedClinicChange={setSelectedClinic}
          onViewDoctor={handleViewDoctor}
        />
      </DataState>
      <DoctorsViewDialog
        open={isViewOpen}
        onOpenChange={setIsViewOpen}
        doctor={selectedDoctor}
        adminActionBusy={adminActionBusy}
        rejectionReasonDraft={rejectionReasonDraft}
        showRejectForm={showRejectForm}
        onRejectionReasonChange={setRejectionReasonDraft}
        onShowRejectFormChange={setShowRejectForm}
        onAdminVerify={handleAdminVerify}
        onAdminReject={handleAdminReject}
      />
    </AppPageScaffold>
  );
}
