"use client";

import { HeartPulse, Users, CreditCard } from "lucide-react";
import { getPatientFullName } from "@workspace/utils";
import { Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Section } from "@workspace/ui/components";
import { AppointmentRowActionsMenu, useAppointmentRowActions } from "@/features/appointments";
import type { useConsultationDashboard } from "@/features/consultation/hooks/use-consultation-dashboard";
import { buildConsultationRoute } from "@/features/consultation/rules/consultationTabRouting";

type ConsultationDashboardState = ReturnType<typeof useConsultationDashboard>;
type AppointmentRowActions = ReturnType<typeof useAppointmentRowActions>;

export interface NursePrepSectionProps {
  opdQueueRows: ConsultationDashboardState["opdQueueRows"];
  rowActions: AppointmentRowActions;
  clinicType: ConsultationDashboardState["clinicType"];
  router: ConsultationDashboardState["router"];
  handleScheduleFollowUp: (patientId?: string | null) => void;
  // jscpd:ignore-start
  onVitalsClick: (appointmentId: string, patientName: string) => void;
  onInvoiceClick: (appointmentId: string, patientId: string) => void;
  // jscpd:ignore-end
}

/**
 * Nurse prep queue — for a triage nurse preparing walk-ins before the doctor
 * starts. Split out of `ConsultationDashboardSections` so the dashboard file
 * stays under the 400-line feature budget while keeping the doctor / error /
 * stats / header blocks co-located.
 */
export function NursePrepSection({
  opdQueueRows,
  rowActions,
  clinicType,
  router,
  handleScheduleFollowUp,
  onVitalsClick,
  onInvoiceClick,
}: NursePrepSectionProps) {
  return (
    <Section
      id="consultation-nurse-prep"
      title="Prep"
      description="Capture vitals and invoice patients before the doctor starts."
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-[var(--fs-md)] font-semibold">
            Queue
          </CardTitle>
          <CardDescription>
            Record vitals or create an invoice for any waiting patient.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {opdQueueRows.length === 0 ? (
            <div className="ui-card-surface flex flex-col items-center justify-center border-2 border-dashed border-border/60 p-6 text-center">
              <Users
                className="mb-2 h-8 w-8 opacity-50 text-muted-foreground"
                aria-hidden
              />
              <p className="ui-helper-text max-w-md">
                No patients are in the queue right now.
              </p>
            </div>
          ) : (
            opdQueueRows
              .filter((q) => Boolean(q.appointmentId))
              .slice(0, 10)
              .map((q) => {
                const queuePatientId = q.patient?.id ?? q.patientId ?? null;
                const queueAppointmentId = q.appointmentId ?? null;
                const patientName = getPatientFullName(q.patient);
                return (
                  <div
                    key={q.id}
                    className="flex items-center justify-between gap-3 rounded-[var(--radius-lg)] border border-border/60 bg-card p-3 sm:p-4"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{patientName}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        Token {q.tokenNumber > 0 ? q.tokenNumber : "—"} •{" "}
                        {String(q.status).toLowerCase()}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {queueAppointmentId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2.5 text-xs"
                          onClick={() =>
                            onVitalsClick(queueAppointmentId, patientName)
                          }
                        >
                          <HeartPulse className="h-3 w-3 text-destructive" />
                          Vitals
                        </Button>
                      ) : null}
                      {queueAppointmentId && queuePatientId ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 px-2.5 text-xs"
                          onClick={() =>
                            onInvoiceClick(queueAppointmentId, queuePatientId)
                          }
                        >
                          <CreditCard className="h-3 w-3 text-success" />
                          Invoice
                        </Button>
                      ) : null}
                      {queueAppointmentId ? (
                        <Button
                          size="sm"
                          onClick={() =>
                            router.push(
                              buildConsultationRoute(queueAppointmentId, {
                                tab: "vitals",
                                clinicType,
                              }),
                            )
                          }
                        >
                          Open
                        </Button>
                      ) : null}
                      <AppointmentRowActionsMenu
                        appointmentId={queueAppointmentId}
                        patientId={queuePatientId}
                        status={q.status}
                        onCancelClick={rowActions.onCancelClick}
                        onNoShowClick={rowActions.onNoShowClick}
                        onScheduleFollowUp={() =>
                          handleScheduleFollowUp(queuePatientId)
                        }
                      />
                    </div>
                  </div>
                );
              })
          )}
        </CardContent>
      </Card>
    </Section>
  );
}
