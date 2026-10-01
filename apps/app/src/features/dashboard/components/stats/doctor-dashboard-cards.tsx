import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { formatTime } from "@/lib/formatters";
import { Avatar, AvatarFallback, Badge, Button, Card, CardContent, CardHeader, CardTitle, ListRow, ListRowGroup, LiveDot, MicroLabel } from "@workspace/ui/components";
import { humanizeUiLabel } from "@workspace/ui/lib/label-formatters";
import { Play, Stethoscope, Users } from "lucide-react";

import type { AppointmentListItem } from "@workspace/data-access";
import { useStartConsultationWithToast } from "@/hooks/use-start-consultation-with-toast";
import { getInitials } from "@/lib/formatters";
import { getPatientFullName } from "@workspace/utils";

interface DoctorDashboardCardsProps {
  currentPatient?: AppointmentListItem | null;
  nextPatients: AppointmentListItem[];
}

export function DoctorDashboardCards({
  currentPatient,
  nextPatients,
}: DoctorDashboardCardsProps) {
  const { t } = useTranslation("Dashboard");
  const navigate = useNavigate();
  const { start, isPending } = useStartConsultationWithToast();

  const handleStartAppointment = async (appointmentId: string) => {
    await start(appointmentId);
  };

  return (
    <div className="min-w-0">
      <Card className="border border-border bg-card shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/70 bg-primary/10 text-primary">
                {currentPatient ? (
                  <Stethoscope className="h-5 w-5" />
                ) : (
                  <Users className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0">
                <MicroLabel className="flex items-center gap-1.5">
                  {currentPatient ? (
                    <>
                      <LiveDot size="sm" tone="primary" />
                      <span>{t("doctorCards.inConsultation")}</span>
                    </>
                  ) : (
                    <span>{t("doctorCards.queueMicroLabel")}</span>
                  )}
                </MicroLabel>
                <CardTitle className="text-lg font-semibold tracking-tight">
                  {currentPatient ? t("doctorCards.currentPatient") : t("doctorCards.noActiveSession")}
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  {currentPatient
                    ? t("doctorCards.inConsultation")
                    : t("doctorCards.startNextPatient")}
                </p>
              </div>
            </div>
            {currentPatient && (
              <Badge className="badge-info w-fit border px-2.5 py-0.5 font-medium">
                {t("doctorCards.inProgress")}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {currentPatient ? (
            <div className="flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/[0.03] p-3 sm:flex-row sm:items-center sm:gap-4">
              <Avatar className="h-10 w-10 sm:h-14 sm:w-14 shrink-0">
                <AvatarFallback className="border border-primary/30 bg-primary/10 text-primary text-base sm:text-lg font-semibold">
                  {getInitials(
                    currentPatient.patient?.firstName ?? "",
                    currentPatient.patient?.lastName,
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-base sm:text-xl font-semibold truncate">
                  {getPatientFullName(currentPatient.patient)}
                </p>
                <p className="text-xs sm:text-sm text-muted-foreground capitalize truncate">
                  {humanizeUiLabel(currentPatient.type)} •{" "}
                  {formatTime(currentPatient.startTime, "h:mm a")}
                </p>
              </div>
              <Button
                size="default"
                className="w-full gap-2 sm:w-auto sm:shrink-0"
                aria-label={t("doctorCards.continueAriaLabel", { name: getPatientFullName(currentPatient.patient) })}
                onClick={() =>
                  navigate(`/consultation/${currentPatient.id}`)
                }
              >
                <Play className="h-4 w-4" />
                {t("doctorCards.continue")}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:py-4">
              <p className="text-sm sm:text-base text-muted-foreground">
                {nextPatients.length > 0
                  ? t("doctorCards.patientsWaiting", { count: nextPatients.length })
                  : t("doctorCards.noPatientsInQueue")}
              </p>
              {nextPatients.length > 0 && nextPatients[0] && (
                <Button
                  size="default"
                  className="w-full gap-2 sm:w-auto sm:shrink-0"
                  disabled={isPending}
                  aria-label={t("doctorCards.startNextAriaLabel", { name: getPatientFullName(nextPatients[0].patient) })}
                  onClick={() =>
                    void handleStartAppointment(nextPatients[0].id)
                  }
                >
                  <Play className="h-4 w-4" />
                  {isPending ? t("doctorCards.starting") : t("doctorCards.startNextPatient")}
                </Button>
              )}
            </div>
          )}

          {nextPatients.length > 0 ? (
            <ListRowGroup className="mt-4">
              {nextPatients.slice(0, 5).map((appt, index) => {
                const name = appt.patient
                  ? getPatientFullName(appt.patient).trim()
                  : t("doctorCards.patientFallback");
                return (
                  <ListRow
                    key={appt.id}
                    token={String(index + 1).padStart(2, "0")}
                    title={name}
                    meta={humanizeUiLabel(appt.type)}
                    time={formatTime(appt.startTime, "h:mm a")}
                    status="waiting"
                    statusLabel={t("doctorCards.waiting")}
                    onClick={() => void handleStartAppointment(appt.id)}
                  />
                );
              })}
            </ListRowGroup>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

