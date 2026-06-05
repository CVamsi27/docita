import type { TimelineEvent } from "@workspace/types";
import { formatDate } from "@workspace/utils";
import {
  EVENT_TYPE_CONFIG,
  capitalizeFirstLetter,
  parseVisitCardMetadata,
  type VisitCardProps,
} from "./visit-card-config";
import type { VisitCardAction } from "./VisitCardSections";

function formatVisitDate(date: Date, mode: VisitCardProps["mode"]): string {
  if (mode === "compact") return formatDate(date, "d MMM");
  if (mode === "portal") return formatDate(date, "EEEE, d MMMM yyyy");
  return formatDate(date, "EEE, d MMM yyyy");
}

function appointmentActionFor(
  event: TimelineEvent,
  statusKey: string,
  isFutureAppointment: boolean,
): VisitCardAction {
  if (isFutureAppointment) {
    return {
      label: "View appointment",
      href: `/appointments?id=${event.id}`,
      variant: "default",
      disabled: false,
    };
  }
  if (statusKey.includes("in-progress") || statusKey.includes("in progress")) {
    return {
      label: "Edit consultation",
      href: `/consultation/${event.id}?from=patient`,
      variant: "default",
      disabled: false,
    };
  }
  if (statusKey.includes("completed")) {
    return {
      label: "View consultation",
      href: `/consultation/${event.id}?from=patient`,
      variant: "outline",
      disabled: false,
    };
  }
  return {
    label: "Start consultation",
    href: `/consultation/${event.id}?from=patient`,
    variant: "default",
    disabled: false,
  };
}

function resolveAppointmentAction(
  event: TimelineEvent,
  mode: VisitCardProps["mode"],
  statusKey: string,
  isFutureAppointment: boolean,
): VisitCardAction | null {
  return event.type === "APPOINTMENT" && mode === "full"
    ? appointmentActionFor(event, statusKey, isFutureAppointment)
    : null;
}

function resolveConsultationAction({
  event,
  mode,
  appointmentAction,
  consultationHref,
  hasConsultation,
}: {
  event: TimelineEvent;
  mode: VisitCardProps["mode"];
  appointmentAction: VisitCardAction | null;
  consultationHref: string;
  hasConsultation: boolean;
}): VisitCardAction | null {
  if (
    event.type !== "APPOINTMENT" ||
    mode !== "full" ||
    appointmentAction?.label === "View consultation"
  ) {
    return null;
  }
  return {
    label: "View consultation",
    href: hasConsultation ? consultationHref : undefined,
    variant: "default",
    disabled: !hasConsultation,
  };
}

export function buildVisitCardViewModel(
  event: TimelineEvent,
  mode: VisitCardProps["mode"],
) {
  const config = EVENT_TYPE_CONFIG[event.type];
  const eventDate = new Date(event.date);
  const metadata = parseVisitCardMetadata(event.metadata);
  const primaryDiagnosis =
    metadata.diagnoses.find((diagnosis) => diagnosis.isPrimary) ??
    metadata.diagnoses[0];
  const statusKey = (metadata.status ?? "").toLowerCase().replace(/_/g, "-");
  const isFutureAppointment =
    event.type === "APPOINTMENT" && eventDate.getTime() > Date.now();
  const consultationHref = metadata.consultationId
    ? `/consultation/${metadata.consultationId}?from=patient`
    : `/consultation/${event.id}?from=patient`;
  const hasConsultation =
    Boolean(metadata.consultationId) ||
    statusKey.includes("in-progress") ||
    statusKey.includes("completed");
  const appointmentAction = resolveAppointmentAction(
    event,
    mode,
    statusKey,
    isFutureAppointment,
  );

  return {
    config,
    Icon: config.icon,
    dateStr: formatVisitDate(eventDate, mode),
    metadata,
    displayTitle: capitalizeFirstLetter(event.title),
    displayPrimaryDiagnosis: capitalizeFirstLetter(
      primaryDiagnosis?.description ?? null,
    ),
    displayEventDescription: capitalizeFirstLetter(event.description),
    appointmentAction,
    consultationAction: resolveConsultationAction({
      event,
      mode,
      appointmentAction,
      consultationHref,
      hasConsultation,
    }),
    typeLabel:
      mode === "portal" ? config.friendlyName : config.label.slice(0, -1),
  };
}
