"use client";

import Link from "next/link";
import { CalendarPlus, ExternalLink, MoreVertical, Printer } from "lucide-react";
import { Button } from "@workspace/ui/components/form/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/overlay/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/overlay/tooltip";

export interface AppointmentRowActionsMenuProps {
  /** Underlying appointment id (when present, enables Cancel and Mark no-show). */
  appointmentId?: string | null;
  /** Patient id (when present, enables View Patient and Schedule follow-up). */
  patientId?: string | null;
  /**
   * Appointment status used to gate destructive actions. Pass the raw
   * appointment status when known (e.g. "scheduled", "in-progress") and a
   * sensible synthetic value (e.g. "scheduled") for queue-only rows.
   */
  status?: string | null;
  onCancelClick: (appointmentId: string) => void;
  onNoShowClick: (appointmentId: string) => void;
  /** Optional follow-up scheduling. When omitted, the menu item is hidden. */
  onScheduleFollowUp?: () => void;
  /**
   * Optional OPD prescription slip printing. When omitted, the menu item is
   * hidden. Requires an appointment id to resolve the patient.
   */
  onPrintOpdSlip?: () => void;
  /** True while the OPD slip for this row is being generated. */
  printingOpdSlip?: boolean;
  /** Optional override for the trigger button's aria-label. */
  triggerLabel?: string;
}

export interface AppointmentRowActionVisibilityInput {
  appointmentId?: string | null;
  patientId?: string | null;
  status?: string | null;
  hasScheduleFollowUp?: boolean;
  hasPrintOpdSlip?: boolean;
}

export interface AppointmentRowActionVisibility {
  showViewPatient: boolean;
  showFollowUp: boolean;
  showPrintOpdSlip: boolean;
  showCancel: boolean;
  showNoShow: boolean;
  /** True when at least one menu item should render. */
  hasAnyAction: boolean;
}

const TERMINAL_STATUSES = new Set([
  "completed",
  "no-show",
  "cancelled",
]);

const NO_SHOW_BLOCKED_STATUSES = new Set([
  "in-progress",
  "completed",
  "no-show",
  "cancelled",
]);

/** OPD slips are only printable before/at the visit, not after it concludes. */
const OPD_SLIP_ALLOWED_STATUSES = new Set(["scheduled", "checked-in"]);

/**
 * Pure visibility rules for the kebab menu. Exposed so tests (and callers
 * that want to hide an empty trigger early) can reason about the gating
 * without spinning up Radix in jsdom.
 */
export function getAppointmentRowActionVisibility({
  appointmentId,
  patientId,
  status,
  hasScheduleFollowUp = false,
  hasPrintOpdSlip = false,
}: AppointmentRowActionVisibilityInput): AppointmentRowActionVisibility {
  const normalizedStatus = (status ?? "").toLowerCase();
  const showViewPatient = Boolean(patientId);
  const showFollowUp = Boolean(patientId) && hasScheduleFollowUp;
  const showPrintOpdSlip =
    Boolean(appointmentId) &&
    hasPrintOpdSlip &&
    OPD_SLIP_ALLOWED_STATUSES.has(normalizedStatus);
  const showCancel =
    Boolean(appointmentId) && !TERMINAL_STATUSES.has(normalizedStatus);
  const showNoShow =
    Boolean(appointmentId) && !NO_SHOW_BLOCKED_STATUSES.has(normalizedStatus);

  return {
    showViewPatient,
    showFollowUp,
    showPrintOpdSlip,
    showCancel,
    showNoShow,
    hasAnyAction:
      showViewPatient ||
      showFollowUp ||
      showPrintOpdSlip ||
      showCancel ||
      showNoShow,
  };
}

/**
 * Shared kebab menu rendered on appointment-like rows in /appointments and
 * /consultation. Items hide themselves when they don't apply to the row, so
 * callers can pass the raw row data without pre-filtering.
 */
export function AppointmentRowActionsMenu({
  appointmentId,
  patientId,
  status,
  onCancelClick,
  onNoShowClick,
  onScheduleFollowUp,
  onPrintOpdSlip,
  printingOpdSlip = false,
  triggerLabel = "More appointment actions",
}: AppointmentRowActionsMenuProps) {
  const {
    showViewPatient,
    showFollowUp,
    showPrintOpdSlip,
    showCancel,
    showNoShow,
    hasAnyAction,
  } = getAppointmentRowActionVisibility({
    appointmentId,
    patientId,
    status,
    hasScheduleFollowUp: Boolean(onScheduleFollowUp),
    hasPrintOpdSlip: Boolean(onPrintOpdSlip),
  });

  if (!hasAnyAction) {
    return null;
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 shrink-0 rounded-full p-0"
              aria-label={triggerLabel}
            >
              <MoreVertical className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent side="bottom">More actions</TooltipContent>
      </Tooltip>
      <DropdownMenuContent
        align="end"
        className="min-w-[min(100vw-2rem,12.5rem)]"
      >
        {showViewPatient && patientId ? (
          <DropdownMenuItem asChild>
            <Link
              href={`/patients/${patientId}`}
              className="flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" />
              View Patient
            </Link>
          </DropdownMenuItem>
        ) : null}
        {showFollowUp && onScheduleFollowUp ? (
          <DropdownMenuItem
            onClick={onScheduleFollowUp}
            data-testid="schedule-follow-up"
          >
            <CalendarPlus className="mr-2 h-4 w-4" />
            Schedule follow-up
          </DropdownMenuItem>
        ) : null}
        {showPrintOpdSlip && onPrintOpdSlip ? (
          <DropdownMenuItem
            onClick={onPrintOpdSlip}
            disabled={printingOpdSlip}
            data-testid="print-opd-slip"
          >
            <Printer className="mr-2 h-4 w-4" />
            {printingOpdSlip ? "Preparing slip…" : "Print OPD prescription"}
          </DropdownMenuItem>
        ) : null}
        {showCancel && appointmentId ? (
          <DropdownMenuItem
            onClick={() => onCancelClick(appointmentId)}
            className="text-destructive focus:text-destructive"
          >
            Cancel Appointment
          </DropdownMenuItem>
        ) : null}
        {showNoShow && appointmentId ? (
          <DropdownMenuItem onClick={() => onNoShowClick(appointmentId)}>
            Mark no-show
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
