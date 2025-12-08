"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Separator } from "@workspace/ui/components/separator";
import {
  Calendar,
  Clock,
  User,
  Phone,
  Mail,
  MapPin,
  Activity,
  Droplet,
  Stethoscope,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  History,
} from "lucide-react";
import { format, differenceInYears } from "date-fns";
import { cn } from "@workspace/ui/lib/utils";
import {
  CompactAllergyAlert,
  type PatientMedicalCondition,
  type PatientAllergy,
  type PatientFamilyHistory,
  type PatientSocialHistory,
  type PatientSurgicalHistory,
} from "./medical-history-summary";

// ============================================================================
// Types
// ============================================================================

interface PatientInfo {
  id?: string;
  firstName?: string;
  lastName?: string;
  gender?: string;
  dateOfBirth?: string | Date;
  phoneNumber?: string;
  email?: string;
  address?: string;
  bloodGroup?: string;
  // Legacy fields
  medicalHistory?: string | string[];
  allergies?: string | string[];
  // Structured medical history (new format)
  medicalConditions?: PatientMedicalCondition[];
  patientAllergies?: PatientAllergy[];
  familyHistory?: PatientFamilyHistory[];
  socialHistory?: PatientSocialHistory | null;
  surgicalHistory?: PatientSurgicalHistory[];
}

interface VitalSignData {
  bloodPressure?: string;
  systolicBP?: number;
  diastolicBP?: number;
  pulse?: number;
  temperature?: number;
  spo2?: number;
  weight?: number;
  height?: number;
  bmi?: number;
  respiratoryRate?: number;
}

interface PastAppointment {
  id: string;
  date: string | Date;
  chiefComplaint?: string;
  finalDiagnosis?: string;
  diagnoses?: Array<{
    icdCode?: {
      code: string;
      description: string;
    };
  }>;
}

interface CurrentMedication {
  name: string;
  dosage: string;
  frequency: string;
}

interface DoctorInfo {
  name: string;
}

interface AppointmentData {
  id?: string;
  patient?: PatientInfo;
  doctor?: DoctorInfo;
  startTime: string | Date;
  endTime: string | Date;
  type: string;
  vitalSign?: VitalSignData;
}

interface ConsultationSidebarProps {
  appointment: AppointmentData;
  pastAppointments?: PastAppointment[];
  currentMedications?: CurrentMedication[];
  onViewPatientDetails?: () => void;
  className?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const calculateAge = (dateOfBirth: string | Date): number => {
  return differenceInYears(new Date(), new Date(dateOfBirth));
};

const getVitalStatus = (
  type: string,
  value: number | string | undefined,
): "normal" | "elevated" | "low" | "critical" => {
  if (value === undefined) return "normal";

  const numValue =
    typeof value === "string"
      ? parseFloat(value.split("/")[0] || value)
      : value;

  switch (type) {
    case "bp":
      if (numValue >= 180) return "critical";
      if (numValue >= 140) return "elevated";
      if (numValue < 90) return "low";
      return "normal";
    case "pulse":
      if (numValue > 120 || numValue < 50) return "critical";
      if (numValue > 100) return "elevated";
      if (numValue < 60) return "low";
      return "normal";
    case "temp":
      if (numValue >= 103) return "critical";
      if (numValue >= 100.4) return "elevated";
      if (numValue < 97) return "low";
      return "normal";
    case "spo2":
      if (numValue < 90) return "critical";
      if (numValue < 95) return "low";
      return "normal";
    default:
      return "normal";
  }
};

const VITAL_STATUS_COLORS = {
  normal: "text-green-600",
  elevated: "text-orange-500",
  low: "text-blue-500",
  critical: "text-red-600 font-bold animate-pulse",
};

// ============================================================================
// Sub-components
// ============================================================================

function PatientHeader({ patient }: { patient: PatientInfo }) {
  const initials =
    `${patient.firstName?.[0] || ""}${patient.lastName?.[0] || ""}`.toUpperCase();
  const age = patient.dateOfBirth ? calculateAge(patient.dateOfBirth) : null;
  const patientName =
    `${patient.firstName || ""} ${patient.lastName || ""}`.trim();

  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-14 w-14 border-2 border-primary/20">
        <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-base truncate">{patientName}</h3>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 text-xs text-muted-foreground mt-0.5">
          {patient.gender && (
            <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
              {patient.gender}
            </Badge>
          )}
          {age && <span>{age}y</span>}
          {patient.bloodGroup && (
            <span className="flex items-center gap-0.5">
              <Droplet className="h-3 w-3 text-red-500" />
              {patient.bloodGroup}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickVitals({ vitals }: { vitals?: VitalSignData }) {
  if (!vitals) return null;

  const bpValue =
    vitals.bloodPressure ||
    (vitals.systolicBP && vitals.diastolicBP
      ? `${vitals.systolicBP}/${vitals.diastolicBP}`
      : undefined);

  const vitalItems = [
    { label: "BP", value: bpValue, unit: "", type: "bp" },
    { label: "HR", value: vitals.pulse, unit: "bpm", type: "pulse" },
    { label: "Temp", value: vitals.temperature, unit: "°F", type: "temp" },
    { label: "SpO₂", value: vitals.spo2, unit: "%", type: "spo2" },
  ].filter((v) => v.value !== undefined);

  if (vitalItems.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2">
      {vitalItems.map((vital) => {
        const status = getVitalStatus(vital.type, vital.value);
        return (
          <div
            key={vital.label}
            className={cn(
              "px-2.5 py-2 rounded-lg bg-muted/50 border",
              status === "critical" &&
                "border-red-300 bg-red-50 dark:bg-red-950/30",
              status === "elevated" &&
                "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20",
              status === "low" &&
                "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20",
            )}
          >
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {vital.label}
            </p>
            <p
              className={cn(
                "text-sm font-semibold",
                VITAL_STATUS_COLORS[status],
              )}
            >
              {vital.value}
              {vital.unit && (
                <span className="text-xs font-normal ml-0.5">{vital.unit}</span>
              )}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ContactInfo({ patient }: { patient: PatientInfo }) {
  if (!patient.phoneNumber && !patient.email && !patient.address) return null;

  return (
    <div className="space-y-1.5 text-sm">
      {patient.phoneNumber && (
        <a
          href={`tel:${patient.phoneNumber}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Phone className="h-3.5 w-3.5" />
          <span>{patient.phoneNumber}</span>
        </a>
      )}
      {patient.email && (
        <a
          href={`mailto:${patient.email}`}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <Mail className="h-3.5 w-3.5" />
          <span className="truncate">{patient.email}</span>
        </a>
      )}
      {patient.address && (
        <div className="flex items-start gap-2 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span className="text-xs leading-relaxed">{patient.address}</span>
        </div>
      )}
    </div>
  );
}

function AppointmentInfo({ appointment }: { appointment: AppointmentData }) {
  const doctor = appointment.doctor;

  return (
    <div className="space-y-2 text-sm">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        <span>
          {format(new Date(appointment.startTime), "EEEE, MMM d, yyyy")}
        </span>
      </div>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-3.5 w-3.5" />
        <span>
          {format(new Date(appointment.startTime), "h:mm a")} -{" "}
          {format(new Date(appointment.endTime), "h:mm a")}
        </span>
      </div>
      {doctor && (
        <div className="flex items-center gap-2 text-muted-foreground">
          <User className="h-3.5 w-3.5" />
          <span>{doctor.name}</span>
        </div>
      )}
      <div className="flex items-center gap-2">
        <Activity className="h-3.5 w-3.5 text-muted-foreground" />
        <Badge variant="outline" className="capitalize text-xs">
          {appointment.type}
        </Badge>
      </div>
    </div>
  );
}

function PastVisitsSection({
  appointments,
}: {
  appointments: PastAppointment[];
}) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  if (appointments.length === 0) return null;

  // Get unique diagnoses with counts
  const diagnosisCounts = new Map<
    string,
    { code: string; description: string; count: number }
  >();
  appointments.forEach((apt) => {
    apt.diagnoses?.forEach((d) => {
      if (d.icdCode) {
        const key = d.icdCode.code;
        const existing = diagnosisCounts.get(key);
        if (existing) {
          existing.count++;
        } else {
          diagnosisCounts.set(key, {
            code: d.icdCode.code,
            description: d.icdCode.description,
            count: 1,
          });
        }
      }
    });
  });

  const topDiagnoses = Array.from(diagnosisCounts.values())
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-xs font-semibold text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <History className="h-3.5 w-3.5" />
          Past Visits ({appointments.length})
        </span>
        {isExpanded ? (
          <ChevronDown className="h-3.5 w-3.5" />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" />
        )}
      </button>

      {isExpanded && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Recurring Diagnoses */}
          {topDiagnoses.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-[10px] text-muted-foreground uppercase">
                Frequent Diagnoses
              </p>
              <div className="space-y-1">
                {topDiagnoses.map((diag) => (
                  <div
                    key={diag.code}
                    className="flex items-center justify-between px-2 py-1 bg-muted/30 rounded text-xs"
                  >
                    <span className="truncate">{diag.description}</span>
                    {diag.count > 1 && (
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 ml-2"
                      >
                        ×{diag.count}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Visits */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground uppercase">
              Recent Visits
            </p>
            <div className="space-y-1">
              {appointments.slice(0, 3).map((apt) => (
                <div
                  key={apt.id}
                  className="px-2 py-1.5 bg-muted/30 rounded text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">
                      {format(new Date(apt.date), "MMM d, yyyy")}
                    </span>
                  </div>
                  {apt.chiefComplaint && (
                    <p className="text-foreground mt-0.5 line-clamp-1">
                      {apt.chiefComplaint}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ConsultationSidebar({
  appointment,
  pastAppointments = [],
  onViewPatientDetails,
  className,
}: ConsultationSidebarProps) {
  const patient = appointment?.patient;

  if (!patient) {
    return (
      <div className="h-full flex items-center justify-center p-4 text-muted-foreground">
        <p>No patient data available</p>
      </div>
    );
  }

  // Normalize legacy data (structured vs legacy fields)

  const legacyAllergies =
    patient.allergies && typeof patient.allergies === "string"
      ? patient.allergies
      : Array.isArray(patient.allergies)
        ? patient.allergies.join(", ")
        : undefined;

  // Extract past diagnoses from appointments for the summary
  const pastDiagnoses = pastAppointments
    .flatMap((apt) =>
      (apt.diagnoses || []).map((d) => ({
        id: `${apt.id}-${d.icdCode?.code}`,
        code: d.icdCode?.code || "",
        description: d.icdCode?.description || "",
        date: apt.date,
      })),
    )
    .filter((d) => d.code);

  // Count diagnoses
  const diagnosisCounts = new Map<string, number>();
  pastDiagnoses.forEach((d) => {
    diagnosisCounts.set(d.code, (diagnosisCounts.get(d.code) || 0) + 1);
  });

  // `uniqueDiagnoses` intentionally omitted — use `diagnosisCounts` or
  // `pastDiagnoses`/`topDiagnoses` where needed. Keeping this code removed
  // avoids unused-variable lint warnings.

  return (
    <ScrollArea className={cn("h-full", className)}>
      <div className="p-4 space-y-4">
        {/* Critical Allergy Alert - Always on top */}
        {(patient.patientAllergies?.length || legacyAllergies) && (
          <CompactAllergyAlert
            allergies={patient.patientAllergies}
            legacyAllergies={legacyAllergies}
          />
        )}

        {/* Patient Header Card */}
        <Card>
          <CardContent className="p-4 space-y-4">
            <PatientHeader patient={patient} />

            {/* Quick Vitals */}
            <QuickVitals vitals={appointment.vitalSign} />

            {/* Contact Info */}
            <Separator />
            <ContactInfo patient={patient} />

            {patient.dateOfBirth && (
              <>
                <Separator />
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  <span>
                    DOB: {format(new Date(patient.dateOfBirth), "MMM d, yyyy")}
                  </span>
                </div>
              </>
            )}

            {onViewPatientDetails && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewPatientDetails}
                className="w-full text-xs gap-1"
              >
                View Full Profile
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Past Visits - Separate section for detailed history */}
        {pastAppointments.length > 0 && (
          <Card>
            <CardContent className="p-4">
              <PastVisitsSection appointments={pastAppointments} />
            </CardContent>
          </Card>
        )}

        {/* Appointment Details */}
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Stethoscope className="h-4 w-4 text-primary" />
              Current Appointment
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <AppointmentInfo appointment={appointment} />
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
