import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { getInitials } from "@/lib/formatters";

export const CONSULTATION_STATUS_STYLES: Record<string, string> = {
  scheduled: "badge-info",
  in_progress: "badge-success",
  completed: "badge-muted",
  cancelled: "badge-danger",
  no_show: "badge-warning",
};

export interface ConsultationHeaderDisplay {
  statusKey: string;
  statusStyle: string;
  statusLabel: string | null;
  typeLabel: string | null;
  initials: string;
}

export function buildConsultationHeaderDisplay(args: {
  patientName: string;
  appointmentStatus?: string;
  appointmentType?: string;
  readOnly: boolean;
}): ConsultationHeaderDisplay {
  const statusKey = (args.appointmentStatus ?? "").toLowerCase().replace(/-/g, "_");
  const statusStyle =
    CONSULTATION_STATUS_STYLES[statusKey] ??
    "bg-muted/50 text-muted-foreground border-muted";
  const rawStatusLabel = args.appointmentStatus
    ? humanizeUiLabel(args.appointmentStatus)
    : null;
  const statusLabel = args.readOnly
    ? rawStatusLabel
      ? `${rawStatusLabel} · View only`
      : "View only"
    : rawStatusLabel;
  const typeLabel = args.appointmentType
    ? humanizeUiLabel(args.appointmentType)
    : null;
  const [firstName, ...rest] = args.patientName.split(" ");
  const lastName = rest.join(" ");
  const initials = getInitials(firstName ?? args.patientName, lastName || undefined);

  return {
    statusKey,
    statusStyle,
    statusLabel,
    typeLabel,
    initials,
  };
}
