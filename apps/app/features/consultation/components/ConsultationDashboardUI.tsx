"use client";

import { FC, useCallback, useState } from "react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { useConsultationDashboard } from "@/features/consultation/hooks/use-consultation-dashboard";
import { useCheckInAppointment } from "@workspace/data-access";
import { AppointmentRowActionDialogs, useAppointmentRowActions } from "@/features/appointments";
import { usePermissions } from "@/hooks/use-permissions";
import { ConsultationDashboardSkeleton } from "./ConsultationDashboardSkeleton";
import { ConsultationDashboardErrorState, ConsultationDashboardHeader, ConsultationDashboardStats, DoctorNextSection, NursePrepSection } from "./ConsultationDashboardSections";
import { ConsultationHistoryList } from "./ConsultationHistoryList";
import { ConsultationWalkInDialog } from "./ConsultationWalkInDialog";
import { buildFollowUpAppointmentHref, deriveConsultationDashboardRoles } from "./consultation-dashboard-ui-helpers";
import { VitalsModal } from "./modals/VitalsModal";
import { BillingModal } from "./modals/BillingModal";
import { useAppointmentOpenInvoice } from "@/features/consultation/hooks/use-appointment-open-invoice";

interface VitalsModalState {
  open: boolean;
  appointmentId?: string;
  patientName?: string;
}

interface BillingModalState {
  open: boolean;
  appointmentId?: string;
  patientId?: string;
  patientName?: string;
}

export const ConsultationDashboardUI: FC = () => {
  const {
    opdQueueRows,
    stats,
    isLoading,
    isError,
    refetch,
    handleStartConsultation,
    goToConsultationWorkspace,
    isStartingConsultation,
    router,
    currentUserRole,
    doctorNowNext,
    clinicType,
    canViewAllDoctors,
    selectedDoctorId,
    setSelectedDoctorId,
    scopedDoctorId,
    doctorsList,
  } = useConsultationDashboard();

  const checkInAppointment = useCheckInAppointment();
  const { canCreateAppointment } = usePermissions();
  const [walkInOpen, setWalkInOpen] = useState(false);
  const rowActions = useAppointmentRowActions();

  const [vitalsModal, setVitalsModal] = useState<VitalsModalState>({ open: false });
  const [billingModal, setBillingModal] = useState<BillingModalState>({ open: false });

  const { invoice: existingInvoice } = useAppointmentOpenInvoice(
    billingModal.open ? billingModal.appointmentId : undefined,
    billingModal.open ? billingModal.patientId : undefined,
  );

  const handleVitalsClick = useCallback(
    (appointmentId: string, patientName: string) =>
      setVitalsModal({ open: true, appointmentId, patientName }),
    [],
  );

  const handleInvoiceClick = useCallback(
    (appointmentId: string, patientId: string) =>
      setBillingModal({ open: true, appointmentId, patientId }),
    [],
  );

  const handleScheduleFollowUp = useCallback(
    (patientId?: string | null) =>
      router.push(buildFollowUpAppointmentHref(patientId)),
    [router],
  );

  const { isDoctor, isNurse, canCreateWalkIn } =
    deriveConsultationDashboardRoles(currentUserRole, canCreateAppointment);

  if (isLoading) return <ConsultationDashboardSkeleton />;
  if (isError) return <ConsultationDashboardErrorState onRetry={refetch} />;

  return (
    <AppPageScaffold
      header={
        <ConsultationDashboardHeader
          router={router}
          canCreateWalkIn={canCreateWalkIn}
          onAddWalkIn={() => setWalkInOpen(true)}
        />
      }
    >
      <ConsultationDashboardStats stats={stats} />

      {isDoctor ? (
        <DoctorNextSection
          doctorNowNext={doctorNowNext}
          isStartingConsultation={isStartingConsultation}
          rowActions={rowActions}
          handleScheduleFollowUp={handleScheduleFollowUp}
          handleStartConsultation={handleStartConsultation}
          goToConsultationWorkspace={goToConsultationWorkspace}
          onVitalsClick={handleVitalsClick}
          onInvoiceClick={handleInvoiceClick}
        />
      ) : null}

      {canCreateWalkIn ? (
        <ConsultationWalkInDialog
          open={walkInOpen}
          onOpenChange={setWalkInOpen}
          checkInAppointment={checkInAppointment}
        />
      ) : null}

      <AppointmentRowActionDialogs {...rowActions.dialogProps} />

      {isNurse ? (
        <NursePrepSection
          opdQueueRows={opdQueueRows}
          rowActions={rowActions}
          clinicType={clinicType}
          router={router}
          handleScheduleFollowUp={handleScheduleFollowUp}
          onVitalsClick={handleVitalsClick}
          onInvoiceClick={handleInvoiceClick}
        />
      ) : null}

      <ConsultationHistoryList
        scopedDoctorId={scopedDoctorId}
        canViewAllDoctors={canViewAllDoctors}
        selectedDoctorId={selectedDoctorId}
        onDoctorSelect={setSelectedDoctorId}
        doctorsList={doctorsList}
      />

      <VitalsModal
        open={vitalsModal.open}
        onOpenChange={(open) =>
          setVitalsModal((prev) => ({ ...prev, open }))
        }
        appointmentId={vitalsModal.appointmentId}
        patientName={vitalsModal.patientName}
        onSaved={() => setVitalsModal({ open: false })}
      />

      <BillingModal
        open={billingModal.open}
        onOpenChange={(open) =>
          setBillingModal((prev) => ({ ...prev, open }))
        }
        appointmentId={billingModal.appointmentId}
        patientId={billingModal.patientId}
        patientName={billingModal.patientName}
        existingInvoice={existingInvoice}
        onSaved={() => setBillingModal({ open: false })}
      />
    </AppPageScaffold>
  );
};
