import { useRef, useState } from "react";
import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import type { AppointmentListItem } from "@workspace/data-access";
import { getPatientFullName } from "@workspace/utils";
import { Button } from "@workspace/ui/components/form/button";
import { Section } from "@workspace/ui/components/layout/section";
import { RecordWorkspace } from "@workspace/ui/components/layout/record-workspace";
import {
  ListRow,
  ListRowGroup,
} from "@workspace/ui/components/data-display/list-row";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@workspace/ui/components/data-display/table";
import { DataState } from "@workspace/ui/components/data-display/data-state";
import { StatusBadge } from "@workspace/ui/components/indicators/status-badge";
import { cn } from "@workspace/ui/lib/utils";
import {
  Avatar,
  AvatarFallback,
} from "@workspace/ui/components/indicators/avatar";
import { formatDate, getInitials } from "@/lib/formatters";
import { TodayAppointmentContext } from "@/features/dashboard/components/today/today-appointment-context";

interface TodayLedgerProps {
  appointments: AppointmentListItem[];
  currentPatient: AppointmentListItem | undefined;
  nextPatient: AppointmentListItem | undefined;
  canStartConsultation: boolean;
  isStarting: boolean;
  onStartNextPatient: () => void;
  timezone?: string;
  waitingCount?: number;
  completedToday?: number;
}

export function TodayLedger({
  appointments,
  currentPatient,
  nextPatient,
  canStartConsultation,
  isStarting,
  onStartNextPatient,
  timezone,
  waitingCount,
  completedToday,
}: TodayLedgerProps) {
  const { t } = useTranslation("Dashboard");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const returnFocusRef = useRef<HTMLButtonElement | null>(null);
  const selected = appointments.find(
    (appointment) => appointment.id === selectedId,
  );
  if (selectedId && !selected) setSelectedId(null);
  const isPreview = !!selected && selected.id !== currentPatient?.id;
  const contextTitle = t(
    isPreview ? "ledger.selectedAppointment" : "ledger.currentVisit",
  );
  const handleClosePreview = (open: boolean) => {
    if (!open) setSelectedId(null);
  };
  const handleReturnToCurrent = () => setSelectedId(null);
  const context = (
    <TodayAppointmentContext
      appointment={selected ?? currentPatient}
      currentPatient={currentPatient}
      canStartConsultation={canStartConsultation}
      timezone={timezone}
      onReturnToCurrent={handleReturnToCurrent}
    />
  );
  const viewButton = (appointment: AppointmentListItem) => (
    <Button
      variant="ghost"
      size="sm"
      aria-label={t("ledger.viewAppointmentAria", {
        name: getPatientFullName(appointment.patient),
      })}
      aria-pressed={selectedId === appointment.id}
      onClick={(event) => {
        returnFocusRef.current = event.currentTarget;
        setSelectedId(appointment.id);
      }}
    >
      {t("ledger.view")}
    </Button>
  );

  return (
    <RecordWorkspace
      context={context}
      contextTitle={contextTitle}
      contextDescription={t("ledger.previewDescription")}
      previewOpen={!!selected}
      onPreviewOpenChange={handleClosePreview}
      returnFocusRef={returnFocusRef}
      summary={
        currentPatient ? (
          <Section
            id="today-current-visit"
            title={t("ledger.currentVisit")}
            className="rounded-none border-x-0 border-t-0 bg-transparent shadow-none"
          >
            <TodayAppointmentContext
              appointment={currentPatient}
              currentPatient={currentPatient}
              canStartConsultation={canStartConsultation}
              timezone={timezone}
              compact
            />
          </Section>
        ) : null
      }
    >
      <Section
        id="dashboard-queue"
        title={t("workspace.queueTitle")}
        className="rounded-none border-x-0 border-t-0 bg-transparent shadow-none"
        contentClassName="p-0"
        description={
          waitingCount !== undefined && completedToday !== undefined
            ? t("ledger.queueSummary", {
                waiting: waitingCount,
                completed: completedToday,
              })
            : undefined
        }
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link to="/appointments">{t("ledger.allAppointments")}</Link>
          </Button>
        }
      >
        <DataState
          status={appointments.length ? "success" : "empty"}
          emptyTitle={t("schedule.emptyTitle")}
          emptyDescription={t("schedule.emptyDescription")}
        >
          <div className="hidden md:block">
            <Table className="min-w-0">
              <caption className="sr-only">
                {t("ledger.queueDescription")}
              </caption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[22%]">
                    {t("ledger.scheduled")}
                  </TableHead>
                  <TableHead className="w-[40%]">
                    {t("ledger.patient")}
                  </TableHead>
                  <TableHead className="w-[24%]">
                    {t("ledger.status")}
                  </TableHead>
                  <TableHead className="w-[14%] text-right">
                    <span className="sr-only">{t("ledger.view")}</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow
                    key={appointment.id}
                    className={cn(
                      appointment.id === currentPatient?.id &&
                        "border-l-2 border-l-primary bg-primary/5",
                      appointment.id === selectedId && "bg-muted/60",
                    )}
                  >
                    <TableCell className="py-5 tabular-nums text-muted-foreground whitespace-nowrap">
                      {formatDate(appointment.startTime, "h:mm a", timezone)}
                    </TableCell>
                    <TableCell className="min-w-0 py-5">
                      <div className="flex items-center gap-3">
                        <Avatar className="size-8 shrink-0">
                          <AvatarFallback className="bg-muted text-xs text-foreground">
                            {getInitials(
                              appointment.patient?.firstName ?? "",
                              appointment.patient?.lastName,
                            )}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <span className="block break-words font-medium text-foreground">
                            {getPatientFullName(appointment.patient)}
                          </span>
                          {appointment.id === selectedId ? (
                            <span className="text-xs text-muted-foreground">
                              {t("ledger.selected")}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        status={appointment.status}
                        label={
                          appointment.id === currentPatient?.id
                            ? t("ledger.inRoom")
                            : undefined
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {viewButton(appointment)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <ListRowGroup className="rounded-none border-0 bg-transparent md:hidden">
            {appointments.map((appointment) => (
              <ListRow
                key={appointment.id}
                title={getPatientFullName(appointment.patient)}
                time={formatDate(appointment.startTime, "h:mm a", timezone)}
                status={appointment.status}
                statusLabel={
                  appointment.id === currentPatient?.id
                    ? t("ledger.inRoom")
                    : undefined
                }
                meta={
                  appointment.id === selectedId
                    ? t("ledger.selected")
                    : t("ledger.scheduled")
                }
                trailing={viewButton(appointment)}
                showChevron={false}
                className={
                  appointment.id === currentPatient?.id
                    ? "border-l-2 border-l-primary bg-primary/5"
                    : undefined
                }
              />
            ))}
          </ListRowGroup>
        </DataState>
        {canStartConsultation && nextPatient ? (
          <div className="hidden items-center justify-between gap-3 border-t border-border/70 px-4 py-4 md:flex">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">
                {t("today.nextUpLabel")}
              </p>
              <p className="break-words text-sm font-medium">
                {getPatientFullName(nextPatient.patient)}
              </p>
            </div>
            <Button
              variant={currentPatient ? "outline" : "primary"}
              disabled={isStarting}
              onClick={onStartNextPatient}
              aria-label={t("today.startNextAria", {
                name: getPatientFullName(nextPatient.patient),
              })}
            >
              {t(isStarting ? "today.startingButton" : "today.startNextButton")}
            </Button>
          </div>
        ) : null}
      </Section>
    </RecordWorkspace>
  );
}
