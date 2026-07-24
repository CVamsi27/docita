"use client";

import { useAskAi } from "@/components/ask-ai/ask-ai-context";
import { BillingModal } from "./modals/BillingModal";
import { useConsultationVitals } from "@/features/consultation/workspace/consultation-vitals-context";
import { useConsultationBillingFlow } from "@/features/consultation/hooks/use-consultation-billing-flow";
import { usePermissions } from "@/hooks/use-permissions";
import { buildConsultationHeaderDisplay } from "./consultation-page-header-helpers";
import { ConsultationPageHeaderToolbar } from "./consultation-page-header-toolbar";
import { ConsultationHeaderNavControls, ConsultationHeaderPatientSummary } from "./ConsultationPageHeaderUISections";

export interface ConsultationPageHeaderUIProps {
  patientName: string;
  appointmentDate: string | Date;
  appointmentId: string;
  patientId?: string;
  appointmentType?: string;
  appointmentStatus?: string;
  readOnly?: boolean;
  chiefComplaint?: string;
  onBack: () => void;
  MobileSidebarContent?: React.ReactNode;
  onOpenCommandPalette?: () => void;
  onMarkDone?: () => void;
  isMarkingDone?: boolean;
  canMarkDone?: boolean;
  markDoneDisabledReason?: string;
}

export function ConsultationPageHeaderUI({
  patientName,
  appointmentDate,
  appointmentId,
  patientId,
  appointmentType,
  appointmentStatus,
  readOnly = false,
  chiefComplaint,
  onBack,
  MobileSidebarContent,
  onOpenCommandPalette,
  onMarkDone,
  isMarkingDone = false,
  canMarkDone = true,
  markDoneDisabledReason,
}: ConsultationPageHeaderUIProps) {
  const { openVitals } = useConsultationVitals();
  const { openOverlay } = useAskAi();
  const { canCreateInvoice } = usePermissions();
  const {
    billingOpen,
    setBillingOpen,
    handleBillingSaved,
    existingInvoice,
  } = useConsultationBillingFlow({
    appointmentId,
    canCreateInvoice,
    patientId,
  });

  const headerDisplay = buildConsultationHeaderDisplay({
    patientName,
    appointmentStatus,
    appointmentType,
    readOnly,
  });

  const openAskAi = () =>
    openOverlay({
      id: `consultation:${appointmentId}`,
      label: `on ${patientName}'s consultation`,
      payload: { appointmentId, patientId },
    });

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-background px-4 py-3">
        <div className="flex items-center gap-3 min-w-0">
          <ConsultationHeaderNavControls
            onBack={onBack}
            MobileSidebarContent={MobileSidebarContent}
          />
          <ConsultationHeaderPatientSummary
            display={headerDisplay}
            patientName={patientName}
            readOnly={readOnly}
            appointmentDate={appointmentDate}
            chiefComplaint={chiefComplaint}
          />
        </div>

        <ConsultationPageHeaderToolbar
          readOnly={readOnly}
          appointmentId={appointmentId}
          canCreateInvoice={canCreateInvoice}
          existingInvoiceStatus={existingInvoice?.status ?? null}
          onOpenCommandPalette={onOpenCommandPalette}
          onMarkDone={onMarkDone}
          isMarkingDone={isMarkingDone}
          canMarkDone={canMarkDone}
          markDoneDisabledReason={markDoneDisabledReason}
          onOpenVitals={() => openVitals()}
          onOpenBilling={() => setBillingOpen(true)}
          onOpenAskAi={openAskAi}
        />
      </header>

      {canCreateInvoice ? (
        <BillingModal
          open={billingOpen}
          onOpenChange={setBillingOpen}
          appointmentId={appointmentId}
          patientId={patientId ?? ""}
          existingInvoice={existingInvoice}
          onSaved={handleBillingSaved}
        />
      ) : null}
    </>
  );
}
