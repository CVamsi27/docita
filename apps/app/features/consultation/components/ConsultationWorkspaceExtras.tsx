"use client";

import { useRouter } from "next/navigation";
import { Button } from "@workspace/ui/components/form/button";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { formatChiefComplaintSummary } from "@workspace/utils";
import { formatDate, DATE_FORMAT_OPTIONS_US_LONG } from "@/lib/formatters";
import {
  APP_ACCESS_TARGETS,
  Feature,
  type Appointment,
} from "@workspace/types";
import { usePermissions } from "@/hooks/use-permissions";
import { usePermissionStore } from "@/lib/stores/permission-store";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessTarget } from "@/lib/access-control/access-policy";
import { isConsultationReadOnlyStatus } from "@/features/appointments";
import {
  PrimaryActionButtons,
  ViewActionsInline,
  ViewActionsOverflow,
} from "./ConsultationWorkspaceExtrasSections";

interface ConsultationVisitOverviewStripProps {
  appointment: Appointment;
  readOnly?: boolean;
}

export function ConsultationVisitOverviewStrip({
  appointment,
  readOnly,
}: ConsultationVisitOverviewStripProps) {
  const router = useRouter();
  const typeLabel = appointment.type
    ? humanizeUiLabel(appointment.type)
    : "Consultation";
  const when = appointment.startTime
    ? formatDate(appointment.startTime, DATE_FORMAT_OPTIONS_US_LONG)
    : null;
  const complaint = formatChiefComplaintSummary(
    appointment.chiefComplaint ?? undefined,
  );

  return (
    <div className="rounded-[var(--radius-lg)] border border-border/60 bg-muted/20 px-4 py-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 space-y-1">
          <MicroLabel>This visit</MicroLabel>
          <p className="text-sm font-medium text-foreground">
            {[typeLabel, when].filter(Boolean).join(" · ")}
          </p>
          {complaint ? (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {complaint}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              Chief complaint can be captured in Subjective.
            </p>
          )}
          {readOnly ? (
            <p className="text-xs text-muted-foreground">View-only visit.</p>
          ) : null}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 self-start"
          onClick={() => router.push("/consultation")}
        >
          OPD queue
        </Button>
      </div>
    </div>
  );
}

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
    },
    "read",
  );

  const completed = isConsultationReadOnlyStatus(appointment.status);

  if (!patientId) return null;

  return (
    <div
      className="rounded-[var(--radius-md)] border border-border/60 bg-card px-3 py-3 shadow-[0_1px_2px_0_rgb(0_0_0/0.04)] sm:px-4"
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
