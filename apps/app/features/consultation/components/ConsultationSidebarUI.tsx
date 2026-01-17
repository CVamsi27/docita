"use client";

import React, { FC } from "react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { Badge } from "@workspace/ui/components/badge";
import {
  AlertTriangle,
  ClipboardCopy,
  Clock,
  Heart,
  Stethoscope,
  User,
} from "lucide-react";
import { Appointment, Patient as BasePatient } from "@workspace/types";
import { Button } from "@workspace/ui/components/button";

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
}

export const ConsultationSidebarUI: FC<ConsultationSidebarProps> = ({
  appointmentData,
  appointment,
  pastAppointments = [],
}) => {
  const rawData = appointmentData ?? appointment;

  // Normalize data
  // Check if it's a wrapper with 'appointment' property, otherwise treat as Appointment
  const data =
    rawData && "appointment" in rawData
      ? (rawData as AppointmentWrapper).appointment
      : (rawData as Appointment);
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

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Patient Header */}
      <Card className="border-none shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-14 w-14">
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-lg font-bold">{patientName}</h2>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                {patient.age && <span>{patient.age}</span>}
                {patient.gender && (
                  <span className="capitalize">
                    • {patient.gender.toLowerCase()}
                  </span>
                )}
              </div>
              {patient.mrn && (
                <p className="text-xs text-muted-foreground mt-1">
                  MRN: {patient.mrn}
                </p>
              )}
              {patient.phoneNumber && (
                <p className="text-xs text-muted-foreground">
                  📞 {patient.phoneNumber}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Allergy Alert */}
      {patient.allergies && (
        <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20 border-none shadow-sm">
          <CardContent className="flex items-center gap-3 p-3">
            <AlertTriangle className="h-5 w-5 text-red-500 shrink-0" />
            <div>
              <p className="font-medium text-red-700 dark:text-red-400 text-sm">
                Allergies
              </p>
              <p className="text-xs text-red-600 dark:text-red-300">
                {patient.allergies}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medical Conditions */}
      {patient.medicalConditions && patient.medicalConditions.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-red-500" />
              <CardTitle className="text-sm">Medical Conditions</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="flex flex-wrap gap-1.5">
              {patient.medicalConditions.map((condition, i) => (
                <Badge
                  key={condition.id ?? i}
                  variant="secondary"
                  className="text-xs"
                >
                  {condition.conditionName}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current Appointment */}
      {data && (
        <Card className="border-none shadow-lg">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Current Visit</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3 space-y-2">
            <div className="text-sm">
              <span className="text-muted-foreground">Type: </span>
              <span className="capitalize">{data.type ?? "Consultation"}</span>
            </div>
            {data.chiefComplaint && (
              <div className="text-sm">
                <span className="text-muted-foreground">Chief Complaint: </span>
                <span>{data.chiefComplaint}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Past Appointments */}
      {pastAppointments.length > 0 && (
        <Card className="border-none shadow-lg">
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm">Past Visits</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-2">
              {pastAppointments.slice(0, 5).map((apt, i) => (
                <div
                  key={apt.id ?? i}
                  className="group flex items-start justify-between py-2 border-b last:border-0 hover:bg-muted/50 p-2 rounded-md transition-colors"
                >
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-muted-foreground font-medium">
                        {new Date(apt.startTime ?? "").toLocaleDateString()}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] h-4 px-1 capitalize"
                      >
                        {apt.status ?? "completed"}
                      </Badge>
                    </div>
                    <p
                      className="text-sm font-medium truncate"
                      title={
                        apt.chiefComplaint ?? apt.finalDiagnosis ?? "Visit"
                      }
                    >
                      {apt.chiefComplaint ?? apt.finalDiagnosis ?? "Visit"}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy details (Stub)"
                    onClick={(e) => {
                      e.stopPropagation();
                      const details = `Date: ${new Date(apt.startTime ?? "").toLocaleDateString()}\nStatus: ${apt.status ?? "completed"}\nDetails: ${apt.chiefComplaint ?? apt.finalDiagnosis ?? "Visit"}`;
                      navigator.clipboard
                        .writeText(details)
                        .then(() => toast.success("Copied to clipboard"))
                        .catch(() => toast.error("Failed to copy"));
                    }}
                  >
                    <ClipboardCopy className="h-3 w-3" />
                    {/* Used Receipt as placeholder for 'Copy' if Clipboard not imported, 
                         but effectively it represents copying the record. 
                         Ideally import ClipboardCopy from lucide-react */}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
