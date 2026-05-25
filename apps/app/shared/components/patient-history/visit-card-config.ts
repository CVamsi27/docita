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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | null | undefined {
  if (value === null) return null;
  return typeof value === "string" ? value : undefined;
}

function parseVitalsMetadata(value: unknown): VitalsMetadata | null | undefined {
  if (value === null) return null;
  if (!isRecord(value)) return undefined;

  return {
    bp: readOptionalString(value.bp),
    pulse: typeof value.pulse === "number" ? value.pulse : null,
    temp: typeof value.temp === "number" ? value.temp : null,
    spo2: typeof value.spo2 === "number" ? value.spo2 : null,
    weight: typeof value.weight === "number" ? value.weight : null,
    height: typeof value.height === "number" ? value.height : null,
  };
}

function parseMedicationMetadataArray(value: unknown): MedicationMetadata[] {
  if (!Array.isArray(value)) return [];

  const medications: MedicationMetadata[] = [];
  for (const entry of value) {
    if (!isRecord(entry) || typeof entry.name !== "string") {
      continue;
    }
    medications.push({
      name: entry.name,
      dosage: readOptionalString(entry.dosage),
      frequency: readOptionalString(entry.frequency),
    });
  }
  return medications;
}

function parseDiagnosisMetadataArray(value: unknown): DiagnosisMetadata[] {
  if (!Array.isArray(value)) return [];

  const diagnoses: DiagnosisMetadata[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) {
      continue;
    }
    diagnoses.push({
      code: readOptionalString(entry.code),
      description: readOptionalString(entry.description),
      isPrimary: entry.isPrimary === true,
    });
  }
  return diagnoses;
}

export interface VisitCardMetadataFields {
  doctorName: string | null | undefined;
  consultationId: string | null | undefined;
  vitals: VitalsMetadata | null | undefined;
  medications: MedicationMetadata[];
  diagnoses: DiagnosisMetadata[];
  treatmentPlan: string | null | undefined;
  observations: string | null | undefined;
  status: string | null | undefined;
}

export function parseVisitCardMetadata(
  metadata: Record<string, unknown>,
): VisitCardMetadataFields {
  return {
    doctorName: readOptionalString(metadata.doctorName),
    consultationId: readOptionalString(metadata.consultationId),
    vitals: parseVitalsMetadata(metadata.vitals),
    medications: parseMedicationMetadataArray(metadata.medications),
    diagnoses: parseDiagnosisMetadataArray(metadata.diagnoses),
    treatmentPlan: readOptionalString(metadata.treatmentPlan),
    observations: readOptionalString(metadata.observations),
    status: readOptionalString(metadata.status),
  };
}
