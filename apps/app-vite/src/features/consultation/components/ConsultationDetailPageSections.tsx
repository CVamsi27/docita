import { AppPageScaffold, DataState } from "@workspace/ui/components";
import { ConsultationShell } from "@/features/consultation/workspace/ConsultationShell";
import { ConsultationPageHeaderUI } from "@/features/consultation/components/ConsultationPageHeaderUI";
import { ConsultationSidebarContainer } from "@/features/consultation/components/ConsultationSidebarContainer";
import { ConsultationLeaveDialog } from "@/features/consultation/components/ConsultationLeaveDialog";
import { ConsultationVitalsProvider } from "@/features/consultation/workspace/consultation-vitals-context";
import { ConsultationLeaveNavigationProvider } from "@/features/consultation/workspace/consultation-leave-navigation-context";
import type { ConsultationSaveHandles } from "@/features/consultation/workspace/use-consultation-leave-navigation";
import { formatChiefComplaintSummary, getPatientFullName } from "@workspace/utils";
import { Stethoscope } from "lucide-react";
import type { useConsultationLogic } from "@/features/consultation/hooks/use-consultation-logic";

type ConsultationState = ReturnType<typeof useConsultationLogic>["state"];
export type AppointmentData = NonNullable<ConsultationState["appointmentData"]>;

// ---------------------------------------------------------------------------
// ConsultationLoadingPage
// ---------------------------------------------------------------------------

interface ConsultationLoadingPageProps {
  isRecoveringSession: boolean;
}

export function ConsultationLoadingPage({
  isRecoveringSession,
}: ConsultationLoadingPageProps) {
  return (
    <AppPageScaffold>
      <DataState
        status="loading"
        className="min-h-[50vh]"
        loadingMessage={
          isRecoveringSession
            ? "Restoring your session…"
            : "Loading consultation…"
        }
      />
    </AppPageScaffold>
  );
}

// ---------------------------------------------------------------------------
// ConsultationErrorPage
// ---------------------------------------------------------------------------

interface ConsultationErrorPageProps {
  onRetry: () => void;
}

export function ConsultationErrorPage({ onRetry }: ConsultationErrorPageProps) {
  return (
    <AppPageScaffold>
      <DataState
        status="error"
        className="min-h-[50vh]"
        errorMessage="We could not open this consultation. Please try again."
        onRetry={onRetry}
      />
    </AppPageScaffold>
  );
}

// ---------------------------------------------------------------------------
// ConsultationAccessDeniedPage
// ---------------------------------------------------------------------------

interface ConsultationAccessDeniedPageProps {
  onBack: () => void;
}

export function ConsultationAccessDeniedPage({
  onBack,
}: ConsultationAccessDeniedPageProps) {
  return (
    <AppPageScaffold>
      <DataState
        status="error"
        className="min-h-[50vh]"
        errorMessage="Only the assigned doctor can open this consultation"
        onRetry={onBack}
      />
    </AppPageScaffold>
  );
}

// ---------------------------------------------------------------------------
// ConsultationNotFoundPage
// ---------------------------------------------------------------------------

interface ConsultationNotFoundPageProps {
  onBack: () => void;
}

export function ConsultationNotFoundPage({
  onBack,
}: ConsultationNotFoundPageProps) {
  return (
    <AppPageScaffold>
      <DataState
        status="empty"
        className="min-h-[50vh]"
        emptyIcon={Stethoscope}
        emptyTitle="Appointment not found"
        emptyDescription="This consultation is unavailable or has been removed"
        emptyAction={{
          label: "Back to Appointments",
          onClick: onBack,
        }}
      />
    </AppPageScaffold>
  );
}

// ---------------------------------------------------------------------------
// ConsultationMainContent
// ---------------------------------------------------------------------------

interface ConsultationMainContentProps {
  appointmentData: AppointmentData;
  appointmentId: string;
  clinicType?: string;
  consultationReadOnly: boolean;
  saveHandlesRef: React.RefObject<ConsultationSaveHandles | null>;
  paletteOpen: boolean;
  onPaletteOpenChange: (open: boolean) => void;
  onBack: () => void;
  attemptNavigateToHref: (href: string) => void;
  leaveDialogOpen: boolean;
  onLeaveDialogOpenChange: (open: boolean) => void;
  leaveBusy: boolean;
  onSaveAndLeave: () => Promise<void>;
  onLeaveWithoutSaving: () => void;
  onMarkDone: () => Promise<void>;
  isMarkingDone: boolean;
  canMarkDone: boolean;
  markDoneDisabledReason: string | undefined;
}

export function ConsultationMainContent({
  appointmentData,
  appointmentId,
  clinicType,
  consultationReadOnly,
  saveHandlesRef,
  paletteOpen,
  onPaletteOpenChange,
  onBack,
  attemptNavigateToHref,
  leaveDialogOpen,
  onLeaveDialogOpenChange,
  leaveBusy,
  onSaveAndLeave,
  onLeaveWithoutSaving,
  onMarkDone,
  isMarkingDone,
  canMarkDone,
  markDoneDisabledReason,
}: ConsultationMainContentProps) {
  const patientName = appointmentData.patient
    ? getPatientFullName(appointmentData.patient)
    : "Patient";

  const MobileSidebar = (
    <ConsultationSidebarContainer appointmentData={appointmentData} />
  );

  return (
    <ConsultationVitalsProvider
      appointmentId={appointmentId}
      patientName={patientName}
    >
      <ConsultationLeaveNavigationProvider
        attemptNavigateToHref={attemptNavigateToHref}
      >
        <div className="flex h-full flex-col">
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-background">
            <ConsultationPageHeaderUI
              patientName={patientName}
              appointmentDate={appointmentData.startTime}
              appointmentId={appointmentId}
              patientId={appointmentData.patientId}
              appointmentType={appointmentData.type}
              appointmentStatus={appointmentData.status}
              readOnly={consultationReadOnly}
              chiefComplaint={
                formatChiefComplaintSummary(
                  appointmentData.chiefComplaint ?? undefined,
                ) ?? undefined
              }
              onBack={onBack}
              MobileSidebarContent={MobileSidebar}
              onOpenCommandPalette={() => onPaletteOpenChange(true)}
              onMarkDone={onMarkDone}
              isMarkingDone={isMarkingDone}
              canMarkDone={canMarkDone}
              markDoneDisabledReason={markDoneDisabledReason}
            />

            <ConsultationShell
              appointmentData={appointmentData}
              clinicType={clinicType}
              readOnly={consultationReadOnly}
              saveHandlesRef={saveHandlesRef}
              paletteOpen={paletteOpen}
              onPaletteOpenChange={onPaletteOpenChange}
            />
          </div>
        </div>

        <ConsultationLeaveDialog
          open={leaveDialogOpen}
          onOpenChange={onLeaveDialogOpenChange}
          leaveBusy={leaveBusy}
          onSaveAndLeave={onSaveAndLeave}
          onLeaveWithoutSaving={onLeaveWithoutSaving}
        />
      </ConsultationLeaveNavigationProvider>
    </ConsultationVitalsProvider>
  );
}
