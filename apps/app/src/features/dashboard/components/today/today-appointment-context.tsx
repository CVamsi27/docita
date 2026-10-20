import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { AppointmentListItem } from "@workspace/data-access";
import { getPatientFullName } from "@workspace/utils";
import { Button } from "@workspace/ui/components/form/button";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/indicators/avatar";
import { formatDate, getInitials } from "@/lib/formatters";

interface TodayAppointmentContextProps {
  appointment: AppointmentListItem | undefined;
  currentPatient: AppointmentListItem | undefined;
  canStartConsultation: boolean;
  timezone?: string;
  onReturnToCurrent?: () => void;
  compact?: boolean;
}

export function TodayAppointmentContext({
  appointment,
  currentPatient,
  canStartConsultation,
  timezone,
  onReturnToCurrent,
  compact = false,
}: TodayAppointmentContextProps) {
  const { t } = useTranslation("Dashboard");
  if (!appointment)
    return (
      <p className="py-4 text-sm text-muted-foreground">
        {t("doctorCards.noActiveSession")}
      </p>
    );
  const isCurrent = appointment.id === currentPatient?.id;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <Avatar className="size-12 shrink-0">
          <AvatarFallback className="bg-muted text-foreground">
            {getInitials(
              appointment.patient?.firstName ?? "",
              appointment.patient?.lastName,
            )}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-2">
          <h3 className="break-words font-sans text-xl font-semibold leading-snug text-foreground">
            {getPatientFullName(appointment.patient)}
          </h3>
          <StatusBadge
            status={appointment.status}
            label={isCurrent ? t("ledger.inRoom") : undefined}
          />
        </div>
      </div>
      <dl className="space-y-4 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">{t("ledger.scheduled")}</dt>
          <dd className="font-medium tabular-nums">
            {formatDate(appointment.startTime, "h:mm a", timezone)}
          </dd>
        </div>
        {appointment.reason ? (
          <div className="space-y-1">
            <dt className="text-muted-foreground">{t("ledger.reason")}</dt>
            <dd className="break-words">{appointment.reason}</dd>
          </div>
        ) : null}
      </dl>
      {isCurrent && canStartConsultation ? (
        <Button
          variant="primary"
          asChild
          className={compact ? "hidden w-full md:inline-flex" : "w-full"}
        >
          <Link to={`/consultation/${appointment.id}`}>
            {t("schedule.continueConsultation")}
          </Link>
        </Button>
      ) : null}
      {!isCurrent && currentPatient && onReturnToCurrent ? (
        <Button
          variant="outline"
          className="w-full justify-between"
          onClick={onReturnToCurrent}
        >
          <span>{t("ledger.returnToCurrent")}</span>
          <span className="max-w-32 truncate font-normal">
            {getPatientFullName(currentPatient.patient)}
          </span>
        </Button>
      ) : null}
      {appointment.patient ? (
        <Button
          asChild
          variant="ghost"
          className="w-full justify-start px-0 text-foreground underline underline-offset-4"
        >
          <Link to={`/patients/${appointment.patientId}`}>
            {t("ledger.viewPatient")}
          </Link>
        </Button>
      ) : null}
    </div>
  );
}
