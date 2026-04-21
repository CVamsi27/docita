"use client";

import React, { FC } from "react";
import { Card, CardContent } from "@workspace/ui/components/card";
import { Button } from "@workspace/ui/components/button";
import { Clock, User, X } from "lucide-react";
import {
  Appointment,
  Patient as BasePatient,
  PatientFamilyHistory,
  PatientSnapshot,
  PatientSocialHistory,
  PatientSurgicalHistory,
  PatientTimelineResponse,
} from "@workspace/types";
import { PatientSnapshotStrip } from "@/features/_shared/components/patient-history/PatientSnapshotStrip";
import { PatientTimeline } from "@/features/_shared/components/patient-history/PatientTimeline";
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
  const rawData = appointmentData ?? appointment;

  const patient =
    rawData && "patient" in rawData
      ? (rawData as AppointmentWrapper).patient
      : ((rawData as Appointment)?.patient as Patient | undefined);

  if (!patient) {
    return (
      <Card className="border-none shadow-lg h-full">
        <CardContent className="flex items-center justify-center h-full py-8 text-muted-foreground">
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

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 bg-background">
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-card/50 relative group">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-lg font-bold text-primary shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold truncate">{patientName}</h2>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{patient.age}</span>
            {patient.gender && (
              <span className="capitalize">
                &middot; {patient.gender.toLowerCase()}
              </span>
            )}
            {patient.mrn && <span>&middot; MRN: {patient.mrn}</span>}
          </div>
        </div>
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground"
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
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

      {appointmentId ? (
        <FollowUpWidget appointmentId={appointmentId} />
      ) : null}

      {(surgicalHistory.length > 0 || familyHistory.length > 0) && (
        <div className="space-y-4 pt-2 border-t">
          {surgicalHistory.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground">
                Surgical History
              </h3>
              <ul className="space-y-1">
                {surgicalHistory.map((s, i) => (
                  <li key={i} className="text-xs grid grid-cols-[1fr_auto] gap-2">
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
                  <li key={i} className="text-xs grid grid-cols-[1fr_auto] gap-2">
                    <span>{h.condition}</span>
                    <span className="text-muted-foreground italic">
                      {h.relationship}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
