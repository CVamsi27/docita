"use client";

import React, { FC, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/overlay/collapsible";
import { Clock, ChevronDown, ChevronRight, FileText, Receipt, User, X } from "lucide-react";
import {
  Appointment,
  Patient as BasePatient,
  PatientFamilyHistory,
  PatientSnapshot,
  PatientSocialHistory,
  PatientSurgicalHistory,
  PatientTimelineResponse,
} from "@workspace/types";
import { PatientSnapshotStrip } from "@/components/patient-history/PatientSnapshotStrip";
import { PatientTimeline } from "@/components/patient-history/PatientTimeline";
import { formatGenderLabel } from "@/lib/formatters";
import { FollowUpWidget } from "./FollowUpWidget";
import { usePermissions } from "@/hooks/use-permissions";

interface Patient extends BasePatient {
  age?: string;
  medicalConditions?: Array<{ id: string; conditionName: string }>;
}

interface AppointmentWrapper {
  appointment: Appointment;
  patient: Patient;
}

type AppointmentInput = AppointmentWrapper | Appointment;

interface ConsultationSidebarProps {
  appointmentData?: AppointmentInput;
  appointment?: AppointmentInput;
  surgicalHistory?: PatientSurgicalHistory[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory | null;
  timelineData?: PatientTimelineResponse;
  snapshot?: PatientSnapshot;
  onClose?: () => void;
}

export const ConsultationSidebarUI: FC<ConsultationSidebarProps> = ({
  appointmentData,
  appointment,
  surgicalHistory = [],
  familyHistory = [],
  timelineData,
  snapshot,
  onClose,
}) => {
  const [historyOpen, setHistoryOpen] = useState(false);
  const { canViewInvoices, canViewPrescriptions } = usePermissions();
  const rawData = appointmentData ?? appointment;

  const patient =
    rawData && "patient" in rawData
      ? (rawData as AppointmentWrapper).patient
      : ((rawData as Appointment)?.patient as Patient | undefined);

  if (!patient) {
    return (
      <Card className="ui-card-surface h-full">
        <CardContent className="flex h-full items-center justify-center py-8 text-muted-foreground">
          <User className="h-6 w-6 mr-2 opacity-30" />
          <span>No patient data</span>
        </CardContent>
      </Card>
    );
  }

  const patientName =
    `${patient.firstName ?? ""} ${patient.lastName ?? ""}`.trim();
  const initials = `${patient.firstName?.[0] ?? ""}${patient.lastName?.[0] ?? ""}`;

  const appointmentId =
    rawData && "appointment" in rawData
      ? (rawData as AppointmentWrapper).appointment.id
      : (rawData as Appointment)?.id;

  const patientRecordId = patient.id;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 bg-background">
      <div className="ui-card-surface relative flex items-center gap-4 p-4 group">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background/70 text-lg font-bold text-primary">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold truncate">{patientName}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{patient.age}</span>
            {patient.gender && (
              <span>&middot; {formatGenderLabel(patient.gender)}</span>
            )}
            {patient.mrn && <span>&middot; MRN: {patient.mrn}</span>}
          </div>
        </div>
        {onClose && (
          <SymbolTooltip label="Close sidebar">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
              aria-label="Close sidebar"
            >
              <X className="h-4 w-4" />
            </Button>
          </SymbolTooltip>
        )}
      </div>

      {snapshot && (
        <PatientSnapshotStrip snapshot={snapshot} layout="vertical" />
      )}

      {timelineData && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
            <Clock className="h-3 w-3" />
            History
            {timelineData.total > 0 && (
              <span className="normal-case font-normal">
                ({timelineData.total})
              </span>
            )}
          </h3>
          {timelineData.events.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">No previous visits</p>
          ) : (
            <PatientTimeline
              mode="compact"
              events={timelineData.events}
              summary={timelineData.summary}
              total={timelineData.total}
            />
          )}
        </div>
      )}

      {patientRecordId && (canViewPrescriptions || canViewInvoices) ? (
        <div className="flex flex-wrap gap-2 border-t border-border/60 pt-3">
          {canViewPrescriptions ? (
            <Button variant="outline" size="sm" asChild>
              <Link
                href={`/prescriptions?patientId=${encodeURIComponent(patientRecordId)}`}
              >
                <FileText className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Prescriptions
              </Link>
            </Button>
          ) : null}
          {canViewInvoices ? (
            <Button variant="outline" size="sm" asChild>
              <Link href={`/patients/${patientRecordId}?tab=billing`}>
                <Receipt className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                Billing
              </Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {appointmentId ? (
        <FollowUpWidget appointmentId={appointmentId} />
      ) : null}

      {(surgicalHistory.length > 0 || familyHistory.length > 0) && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-auto w-full justify-start gap-1 px-0 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              {historyOpen ? (
                <ChevronDown className="h-3.5 w-3.5 shrink-0" aria-hidden />
              ) : (
                <ChevronRight className="h-3.5 w-3.5 shrink-0" aria-hidden />
              )}
              Full structured history
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-2 data-[state=open]:border-t data-[state=open]:border-border/60">
            {surgicalHistory.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Surgical History
                </h3>
                <ul className="space-y-1">
                  {surgicalHistory.map((s, i) => (
                    <li
                      key={i}
                      className="text-xs grid grid-cols-[1fr_auto] gap-2"
                    >
                      <span>{s.procedureName}</span>
                      {s.procedureDate && (
                        <span className="text-muted-foreground">
                          {new Date(s.procedureDate).getFullYear()}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {familyHistory.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-muted-foreground">
                  Family History
                </h3>
                <ul className="space-y-1">
                  {familyHistory.map((h, i) => (
                    <li
                      key={i}
                      className="text-xs grid grid-cols-[1fr_auto] gap-2"
                    >
                      <span>{h.condition}</span>
                      <span className="text-muted-foreground italic">
                        {h.relationship}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};
