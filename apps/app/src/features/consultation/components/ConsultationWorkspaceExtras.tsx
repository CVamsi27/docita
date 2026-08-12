import { MicroLabel } from "@workspace/ui/components";
import { APP_ACCESS_TARGETS, Feature, type Appointment } from "@workspace/types";
import { usePermissions } from "@/hooks/use-permissions";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { useEffectivePermissions } from "@workspace/data-access";
import { isConsultationReadOnlyStatus } from "@/features/appointments";
import { PrimaryActionButtons, ViewActionsInline, ViewActionsOverflow } from "./ConsultationWorkspaceExtrasSections";

interface ConsultationAfterVisitStripProps {
  appointment: Appointment;
  onGoToPlan: () => void;
}

export function ConsultationAfterVisitStrip({
  appointment,
  onGoToPlan,
}: ConsultationAfterVisitStripProps) {
  const { user } = useAuth();
  const { canAccess, currentTier, hasIntelligence } = usePermissionStore();
  const snapshot = useEffectivePermissions()?.targets;
  const { canViewInvoices, canViewPrescriptions, canCreatePrescription } =
    usePermissions();

  const patientId = appointment.patientId ?? "";
  const canWhatsapp = canAccess(Feature.WHATSAPP_MESSAGING);
  const canLab = canAccess(Feature.LAB_TESTS);

  const canCodingQueue = canAccessTarget(
    APP_ACCESS_TARGETS.PAGE_CODING_QUEUE,
    {
      role: user?.role,
      canAccessFeature: canAccess,
      currentTier,
      hasIntelligence,
      snapshot,
    },
    "read",
  );

  const completed = isConsultationReadOnlyStatus(appointment.status);

  if (!patientId) return null;

  return (
    <div
      className="rounded-[var(--radius-md)] border border-border/60 bg-card px-3 py-3 shadow-xs sm:px-4"
      aria-label="After this visit"
    >
      <MicroLabel className="mb-2 block">After this visit</MicroLabel>
      <div className="flex flex-wrap items-center gap-2">
        <PrimaryActionButtons
          canCreatePrescription={canCreatePrescription}
          canViewPrescriptions={canViewPrescriptions}
          canViewInvoices={canViewInvoices}
          onGoToPlan={onGoToPlan}
        />

        <ViewActionsInline
          patientId={patientId}
          canViewPrescriptions={canViewPrescriptions}
          canViewInvoices={canViewInvoices}
          canLab={canLab}
          canWhatsapp={canWhatsapp}
          completed={completed}
          canCodingQueue={canCodingQueue}
        />

        <ViewActionsOverflow
          patientId={patientId}
          canViewPrescriptions={canViewPrescriptions}
          canViewInvoices={canViewInvoices}
          canLab={canLab}
          canWhatsapp={canWhatsapp}
          completed={completed}
          canCodingQueue={canCodingQueue}
        />
      </div>
    </div>
  );
}
