"use client";

import React, { FC } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card";
import { Badge } from "@workspace/ui/components/badge";
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar";
import {
  Activity,
  AlertTriangle,
  Calendar,
  Clock,
  FileText,
  Heart,
  type LucideIcon,
  Pill,
  Receipt,
} from "lucide-react";
import { Appointment, Patient as BasePatient } from "@workspace/types";

// Extended types for UI components
interface Patient extends BasePatient {
  age?: string;
  medicalConditions?: Array<{ id: string; conditionName: string }>;
}

interface PatientStatistics {
  totalVisits: number;
  prescriptions: number;
  documents: number;
  invoices: number;
}

// ============================================
// PATIENT COMPONENTS - Functional UI
// ============================================

interface PatientFaceSheetHeaderProps {
  patient?: Patient;
  initials?: string;
  age?: string;
}

export const PatientFaceSheetHeader: FC<PatientFaceSheetHeaderProps> = ({
  patient,
  initials,
  age,
}) => {
  if (!patient) return null;
  const displayInitials =
    initials ?? `${patient.firstName?.[0] ?? ""}${patient.lastName?.[0] ?? ""}`;
  return (
    <Card className="border-none shadow-lg bg-linear-to-r from-primary/5 to-transparent">
      <CardContent className="flex items-center gap-6 p-6">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
            {displayInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {patient.firstName} {patient.lastName}
          </h1>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <span>{age ?? patient.age ?? "Age N/A"}</span>
            <span>•</span>
            <span className="capitalize">
              {patient.gender?.toLowerCase() ?? "Unknown"}
            </span>
            {patient.mrn && (
              <>
                <span>•</span>
                <span>MRN: {patient.mrn}</span>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

interface PatientStatsCardsProps {
  statistics?: PatientStatistics;
  loading?: boolean;
}

export const PatientStatsCards: FC<PatientStatsCardsProps> = ({
  statistics,
  loading,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="border-none shadow-lg animate-pulse">
            <CardContent className="p-4">
              <div className="h-8 bg-muted rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats: Array<{ label: string; value: number; icon: LucideIcon }> = [
    {
      label: "Total Visits",
      value: statistics?.totalVisits ?? 0,
      icon: Calendar,
    },
    {
      label: "Prescriptions",
      value: statistics?.prescriptions ?? 0,
      icon: Pill,
    },
    { label: "Documents", value: statistics?.documents ?? 0, icon: FileText },
    { label: "Invoices", value: statistics?.invoices ?? 0, icon: Receipt },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="border-none shadow-lg">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

interface PatientMedicalHistoryProps {
  patient?: Patient;
  readOnly?: boolean;
}

export const PatientMedicalHistory: FC<PatientMedicalHistoryProps> = ({
  patient,
}) => {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Heart className="h-5 w-5 text-red-500" />
          <CardTitle>Medical History</CardTitle>
        </div>
        <CardDescription>
          Patient&apos;s medical conditions and history
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Allergies</h4>
          <div className="flex flex-wrap gap-2">
            {patient?.allergies ? (
              patient.allergies.split(",").map((allergy, i) => (
                <Badge key={i} variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {allergy.trim()}
                </Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">
                No known allergies
              </span>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <h4 className="font-medium text-sm">Medical Conditions</h4>
          <p className="text-sm text-muted-foreground">
            {patient?.medicalConditions && patient.medicalConditions.length > 0
              ? patient.medicalConditions.map((c) => c.conditionName).join(", ")
              : "No conditions recorded"}
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

interface PatientVitalsBannerProps {
  appointments?: Appointment[];
}

export const PatientVitalsBanner: FC<PatientVitalsBannerProps> = ({
  appointments,
}) => {
  const latestVitals = appointments?.find((a) => a.vitalSign)?.vitalSign;
  if (!latestVitals) return null;

  return (
    <Card className="border-none shadow-sm bg-blue-50 dark:bg-blue-950/20">
      <CardContent className="flex items-center gap-6 p-4">
        <Activity className="h-5 w-5 text-blue-600" />
        <div className="flex gap-6 text-sm">
          {latestVitals.bloodPressure && (
            <span>
              BP: <strong>{latestVitals.bloodPressure}</strong>
            </span>
          )}
          {latestVitals.pulse && (
            <span>
              HR: <strong>{latestVitals.pulse}</strong> bpm
            </span>
          )}
          {latestVitals.temperature && (
            <span>
              Temp: <strong>{latestVitals.temperature}</strong>°F
            </span>
          )}
          {latestVitals.weight && (
            <span>
              Weight: <strong>{latestVitals.weight}</strong> kg
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface PatientAllergyAlertProps {
  patient?: Patient;
  patientId?: string;
}

export const PatientAllergyAlert: FC<PatientAllergyAlertProps> = ({
  patient,
}) => {
  const allergies = patient?.allergies;
  if (!allergies) return null;

  return (
    <Card className="border-l-4 border-l-red-500 bg-red-50 dark:bg-red-950/20 border-none shadow-sm">
      <CardContent className="flex items-center gap-3 p-4">
        <AlertTriangle className="h-5 w-5 text-red-500" />
        <div>
          <p className="font-medium text-red-700 dark:text-red-400">
            Allergy Alert
          </p>
          <p className="text-sm text-red-600 dark:text-red-300">{allergies}</p>
        </div>
      </CardContent>
    </Card>
  );
};

interface AppointmentHistoryTimelineProps {
  appointments?: Appointment[];
  patientId?: string;
  showFilters?: boolean;
}

export const AppointmentHistoryTimeline: FC<
  AppointmentHistoryTimelineProps
> = ({ appointments = [] }) => {
  return (
    <Card className="border-none shadow-lg">
      <CardHeader>
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-primary" />
          <CardTitle>Appointment History</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {appointments.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No appointments yet
          </p>
        ) : (
          <div className="space-y-4">
            {appointments.slice(0, 5).map((apt, i) => (
              <div
                key={apt.id || i}
                className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted/50"
              >
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{apt.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {apt.startTime
                      ? new Date(apt.startTime).toLocaleDateString()
                      : "Date unknown"}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {apt.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export type {
  PatientFaceSheetHeaderProps,
  PatientStatsCardsProps,
  PatientMedicalHistoryProps,
  PatientVitalsBannerProps,
  PatientAllergyAlertProps,
  AppointmentHistoryTimelineProps,
};
