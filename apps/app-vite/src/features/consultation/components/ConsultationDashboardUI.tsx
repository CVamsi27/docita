import { useCallback, useState } from "react";
import { AppPageScaffold } from "@workspace/ui/components/layout/app-page-scaffold";
import { useConsultationDashboard } from "../hooks/use-consultation-dashboard";
import { useConsultationQueueRealtime } from "../hooks/use-consultation-queue-realtime";
import { useCheckInAppointment } from "@workspace/data-access";
import { useAppointmentRowActions } from "@/features/appointments/hooks/use-appointment-row-actions";
import { AppointmentRowActionDialogs } from "@/features/appointments/components/dialogs/AppointmentRowActionDialogs";
import { usePermissions } from "@/hooks/use-permissions";
import {
  ConsultationDashboardStats,
  ConsultationDashboardHeader,
  ConsultationDashboardErrorState,
  ConsultationDashboardSkeleton,
  DoctorNextSection,
} from "./consultation-dashboard-sections";
import { NursePrepSection } from "./consultation-dashboard-nurse-prep";
import { ConsultationHistoryList } from "./ConsultationHistoryList";
import { ConsultationWalkInDialog } from "./ConsultationWalkInDialog";
import { deriveConsultationDashboardRoles } from "./consultation-dashboard-ui-helpers";
import { VitalsModal } from "./modals/VitalsModal";
import { BillingModal } from "./modals/BillingModal";
import { useAppointmentOpenInvoice } from "../hooks/use-appointment-open-invoice";

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

export function ConsultationDashboardUI() {
  useConsultationQueueRealtime();
  const dashboard = useConsultationDashboard();
  const checkInAppointment = useCheckInAppointment();
  const { canCreateAppointment } = usePermissions();
  const [walkInOpen, setWalkInOpen] = useState(false);
  const rowActions = useAppointmentRowActions({ onMutated: dashboard.refetch });

  const [vitalsModal, setVitalsModal] = useState<VitalsModalState>({
    open: false,
  });
  const [billingModal, setBillingModal] = useState<BillingModalState>({
    open: false,
  });

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

  const { isDoctor, isNurse, canCreateWalkIn } =
    deriveConsultationDashboardRoles(
      dashboard.currentUserRole,
      canCreateAppointment,
    );

  if (dashboard.isLoading) {
    return (
      <AppPageScaffold
        header={
          <ConsultationDashboardHeader
            canCreateWalkIn={false}
            onAddWalkIn={() => {}}
          />
        }
      >
        <ConsultationDashboardSkeleton />
      </AppPageScaffold>
    );
  }

  if (dashboard.isError) {
    return <ConsultationDashboardErrorState onRetry={dashboard.refetch} />;
  }

  return (
    <AppPageScaffold
      header={
        <ConsultationDashboardHeader
          canCreateWalkIn={canCreateWalkIn}
          onAddWalkIn={() => setWalkInOpen(true)}
        />
      }
    >
      <ConsultationDashboardStats stats={dashboard.stats} />

      {isDoctor && (
        <DoctorNextSection
          doctorNowNext={dashboard.doctorNowNext}
          isStartingConsultation={dashboard.isStartingConsultation}
          rowActions={rowActions}
          handleScheduleFollowUp={dashboard.handleScheduleFollowUp}
          handleStartConsultation={dashboard.handleStartConsultation}
          goToConsultationWorkspace={dashboard.goToConsultationWorkspace}
          onVitalsClick={handleVitalsClick}
          onInvoiceClick={handleInvoiceClick}
        />
      )}

      {canCreateWalkIn && (
        <ConsultationWalkInDialog
          open={walkInOpen}
          onOpenChange={setWalkInOpen}
          checkInAppointment={checkInAppointment}
        />
      )}

      <AppointmentRowActionDialogs {...rowActions.dialogProps} />

      {isNurse && (
        <NursePrepSection
          opdQueueRows={dashboard.opdQueueRows}
          rowActions={rowActions}
          clinicType={dashboard.clinicType}
          handleScheduleFollowUp={dashboard.handleScheduleFollowUp}
          onVitalsClick={handleVitalsClick}
          onInvoiceClick={handleInvoiceClick}
        />
      )}

      <ConsultationHistoryList
        scopedDoctorId={dashboard.scopedDoctorId ?? undefined}
        canViewAllDoctors={dashboard.canViewAllDoctors}
        selectedDoctorId={dashboard.selectedDoctorId ?? undefined}
        onDoctorSelect={(doctorId) =>
          dashboard.setSelectedDoctorId(doctorId ?? null)
        }
        doctorsList={dashboard.doctorsList}
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
}
