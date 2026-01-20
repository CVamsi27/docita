"use client";

import React, { FC } from "react";
import { toast } from "sonner";
import { Badge } from "@workspace/ui/components/badge";
import { Card, CardContent } from "@workspace/ui/components/card";
import {
  AlertTriangle,
  ClipboardCopy,
  Clock,
  Heart,
  User,
  X,
} from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import {
  Appointment,
  Patient as BasePatient,
  PatientAllergy,
  PatientFamilyHistory,
  PatientSocialHistory,
  PatientSurgicalHistory,
} from "@workspace/types";

// Extended types
interface Patient extends BasePatient {
  age?: string;
  medicalConditions?: Array<{ id: string; conditionName: string }>;
}

interface AppointmentWrapper {
  appointment: Appointment;
  patient: Patient;
}

// Allow passing either the wrapper or the raw appointment
type AppointmentInput = AppointmentWrapper | Appointment;

// Flexible type for past appointments
interface PastAppointmentItem {
  id?: string;
  startTime?: string | Date;
  date?: string | Date;
  chiefComplaint?: string;
  finalDiagnosis?: string;
  status?: string;
}

interface ConsultationSidebarProps {
  appointmentData?: AppointmentInput;
  appointment?: AppointmentInput; // Alias for backward compatibility
  pastAppointments?: PastAppointmentItem[];
  // Additional history data from shared hook for enhanced display
  patientAllergies?: PatientAllergy[];
  surgicalHistory?: PatientSurgicalHistory[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory | null;
  onClose?: () => void;
}

export const ConsultationSidebarUI: FC<ConsultationSidebarProps> = ({
  appointmentData,
  appointment,
  pastAppointments = [],
  patientAllergies = [],
  surgicalHistory = [],
  familyHistory = [],
  onClose,
}) => {
  const rawData = appointmentData ?? appointment;

  // Normalize data
  // Check if it's a wrapper with 'appointment' property, otherwise treat as Appointment
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

  // Timeline Item Component
  const TimelineItem = ({
    date,
    status,
    title,
    isLast = false,
    onClick,
    onCopy,
  }: {
    date: Date;
    status: string;
    title: string;
    isLast?: boolean;
    onClick?: () => void;
    onCopy?: (e: React.MouseEvent) => void;
  }) => (
    <div className="relative pl-6 pb-6 last:pb-0 group">
      {/* Timeline Line */}
      {!isLast && (
        <div className="absolute left-[5px] top-2 bottom-0 w-px bg-border group-hover:bg-primary/20 transition-colors" />
      )}
      {/* Timeline Dot */}
      <div className="absolute left-0 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-primary bg-background group-hover:bg-primary transition-colors" />

      <div className="flex flex-col gap-1 cursor-pointer" onClick={onClick}>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-medium">
            {date.toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
          <Badge
            variant="outline"
            className="text-[10px] h-4 px-1.5 capitalize font-normal"
          >
            {status}
          </Badge>
        </div>
        <div className="flex items-start justify-between gap-2">
          <p
            className="text-sm font-medium leading-none truncate pr-2 group-hover:text-primary transition-colors"
            title={title}
          >
            {title}
          </p>
          {onCopy && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 -mt-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={onCopy}
            >
              <ClipboardCopy className="h-3 w-3 text-muted-foreground" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6 bg-background">
      {/* Header with Close Button */}
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
                • {patient.gender.toLowerCase()}
              </span>
            )}
            {patient.mrn && <span>• MRN: {patient.mrn}</span>}
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

      {/* Allergy Alert - Clean */}
      {(patientAllergies.length > 0 || patient.allergies) && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
            <AlertTriangle className="h-3 w-3" />
            Allergies
          </h3>
          <div className="flex flex-wrap gap-2">
            {patientAllergies.length > 0 ? (
              patientAllergies.map((allergy, i) => (
                <Badge
                  key={allergy.id || i}
                  variant="outline"
                  className={`text-xs py-0.5 font-normal ${
                    allergy.severity === "SEVERE"
                      ? "border-red-200 bg-red-50 text-red-700"
                      : "border-orange-200 bg-orange-50 text-orange-700"
                  }`}
                >
                  {allergy.allergen}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-red-600 font-medium">
                {patient.allergies}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Medical Conditions - Tag Cloud */}
      {patient.medicalConditions && patient.medicalConditions.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
            <Heart className="h-3 w-3" />
            Conditions
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {patient.medicalConditions.map((condition, i) => (
              <Badge
                key={condition.id ?? i}
                variant="secondary"
                className="text-xs font-normal"
              >
                {condition.conditionName}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {/* Past Visits Timeline */}
      {pastAppointments.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase text-muted-foreground tracking-wider flex items-center gap-2">
            <Clock className="h-3 w-3" />
            Visit History
          </h3>
          <div className="pl-1 pt-1">
            {pastAppointments.slice(0, 5).map((apt, i) => (
              <TimelineItem
                key={apt.id ?? i}
                date={new Date(apt.startTime ?? "")}
                status={apt.status ?? "completed"}
                title={apt.chiefComplaint ?? apt.finalDiagnosis ?? "Visit"}
                isLast={i === Math.min(pastAppointments.length, 5) - 1}
                onCopy={(e) => {
                  e.stopPropagation();
                  const details = `Date: ${new Date(apt.startTime ?? "").toLocaleDateString()}\nStatus: ${apt.status ?? "completed"}\nDetails: ${apt.chiefComplaint ?? apt.finalDiagnosis ?? "Visit"}`;
                  navigator.clipboard
                    .writeText(details)
                    .then(() => toast.success("Copied"))
                    .catch(() => toast.error("Failed copy"));
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Surgical & Family History - Compact List */}
      {(surgicalHistory.length > 0 || familyHistory.length > 0) && (
        <div className="space-y-4 pt-2 border-t">
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
        </div>
      )}
    </div>
  );
};
