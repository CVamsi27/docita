import {
  Activity, Calendar, FileText, FlaskConical, Heart, Pill, Stethoscope, TrendingUp, User,
} from "lucide-react";
import type { TimelineEventType, TimelineEvent } from "@workspace/types";

export const EVENT_TYPE_CONFIG: Record<
  TimelineEventType,
  { label: string; icon: React.ElementType; color: string; friendlyName: string }
> = {
  APPOINTMENT: { label: "Appointments", icon: Calendar, color: "text-primary", friendlyName: "Doctor Visit" },
  PRESCRIPTION: { label: "Prescriptions", icon: Pill, color: "text-success", friendlyName: "Medication Prescribed" },
  METRIC_RECORD: { label: "Metrics", icon: TrendingUp, color: "text-info", friendlyName: "Health Measurement" },
  LAB_TEST: { label: "Lab Tests", icon: FlaskConical, color: "text-warning", friendlyName: "Lab Test" },
  MEDICAL_DOCUMENT: { label: "Documents", icon: FileText, color: "text-muted-foreground", friendlyName: "Document Issued" },
  FOLLOW_UP: { label: "Follow-Ups", icon: Stethoscope, color: "text-primary", friendlyName: "Follow-Up" },
  IMMUNIZATION: { label: "Immunizations", icon: Activity, color: "text-destructive", friendlyName: "Vaccine Administered" },
  ADMISSION: { label: "Admissions", icon: User, color: "text-destructive", friendlyName: "Hospital Admission" },
  MEDICATION_DOSE: { label: "Doses", icon: Heart, color: "text-success", friendlyName: "Medication Dose" },
};

export interface VisitCardProps {
  event: TimelineEvent;
  mode: "full" | "compact" | "portal";
  defaultExpanded?: boolean;
}

export type VitalsMetadata = {
  bp?: string | null;
  pulse?: number | null;
  temp?: number | null;
  spo2?: number | null;
  weight?: number | null;
  height?: number | null;
};

export type MedicationMetadata = {
  name: string;
  dosage?: string | null;
  frequency?: string | null;
};

export type DiagnosisMetadata = {
  code?: string | null;
  description?: string | null;
  isPrimary?: boolean;
};

export function capitalizeFirstLetter(value?: string | null): string {
  if (!value) return "";
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function medicationSummaryLine(meds: MedicationMetadata[]): string {
  if (!meds.length) return "";
  const names = meds.map((m) => m.name).filter(Boolean);
  if (!names.length) return "";
  const head = names.slice(0, 2).join(", ");
  const extra = names.length > 2 ? ` +${names.length - 2}` : "";
  return `Meds: ${head}${extra}`;
}
