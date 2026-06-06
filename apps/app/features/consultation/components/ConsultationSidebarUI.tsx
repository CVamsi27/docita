"use client";

import React, { FC, useState } from "react";
import { Card, CardContent } from "@workspace/ui/components/indicators/card";
import { Button } from "@workspace/ui/components/form/button";
import { SymbolTooltip } from "@workspace/ui/components/overlay/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@workspace/ui/components/overlay/collapsible";
import { Clock, ChevronDown, User, X } from "lucide-react";
import { MicroLabel } from "@workspace/ui/components/indicators/micro-label";
import { cn } from "@workspace/ui/lib/utils";
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
import { getInitials } from "@/lib/formatters";
import { getPatientFullName } from "@workspace/utils";
import { FollowUpWidget } from "./FollowUpWidget";

interface Patient extends BasePatient {
  age?: string;
  medicalConditions?: Array<{ id: string; conditionName: string }>;
}

interface AppointmentWrapper {
  appointment: Appointment;
  patient: Patient;
}

type AppointmentInput = AppointmentWrapper | Appointment;

function isAppointmentWrapper(
  data: AppointmentInput,
): data is AppointmentWrapper {
  return "appointment" in data;
}

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
  const rawData = appointmentData ?? appointment;

  const patient: Patient | undefined = rawData
    ? isAppointmentWrapper(rawData)
      ? rawData.patient
      : rawData.patient
    : undefined;

  if (!patient) return (
      <Card className="ui-card-surface h-full">
        <CardContent className="flex h-full items-center justify-center py-8 text-muted-foreground">
          <User className="h-6 w-6 mr-2 opacity-30" />
          <span>No patient data</span>
        </CardContent>
      </Card>
    );

  const patientName = getPatientFullName(patient);
  const initials = getInitials(patient.firstName ?? "", patient.lastName);

  const appointmentId = rawData
    ? isAppointmentWrapper(rawData)
      ? rawData.appointment.id
      : rawData.id
    : undefined;

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 bg-background">
      <div className="ui-card-surface relative flex items-center gap-4 p-4 group">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-lg font-bold text-primary">
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
          <MicroLabel className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden="true" />
            History
            {timelineData.total > 0 ? (
              <span className="font-normal normal-case">
                ({timelineData.total})
              </span>
            ) : null}
          </MicroLabel>
          {timelineData.events.length === 0 ? (
            <p className="text-xs text-muted-foreground py-1">
              No previous visits
            </p>
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


      {appointmentId ? <FollowUpWidget appointmentId={appointmentId} /> : null}

      {(surgicalHistory.length > 0 || familyHistory.length > 0) && (
        <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
          <CollapsibleTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 w-full justify-between text-xs font-semibold"
            >
              Full structured history
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                  historyOpen && "rotate-180",
                )}
                aria-hidden="true"
              />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-4 pt-3">
            {surgicalHistory.length > 0 && (
              <div className="space-y-2">
                <MicroLabel className="text-muted-foreground">
                  Surgical history
                </MicroLabel>
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
                <MicroLabel className="text-muted-foreground">
                  Family history
                </MicroLabel>
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
