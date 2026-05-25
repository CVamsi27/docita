/** Application-layer shapes for timeline source queries (mapped in aggregators). */

export interface AppointmentTimelineRow {
  id: string;
  startTime: Date;
  chiefComplaint: string | null;
  finalDiagnosis: string | null;
  status: string;
  type: string;
  treatmentPlan: string | null;
  observations: string | null;
  doctor?: { name: string } | null;
  vitalSign?: {
    systolicBP: number | null;
    diastolicBP: number | null;
    pulse: number | null;
    temperature: number | null;
    spo2: number | null;
    weight: number | null;
    height: number | null;
  } | null;
  prescription?: {
    medications?: Array<{
      name: string;
      dosage: string;
      frequency: string;
    }>;
  } | null;
  diagnoses?: Array<{
    icdCode?: { code: string; description: string } | null;
    notes: string | null;
    isPrimary: boolean;
  }>;
}

export interface PrescriptionTimelineRow {
  id: string;
  date: Date;
  medications: Array<{ name: string }>;
}

export interface MetricRecordTimelineRow {
  id: string;
  recordedAt: Date;
  values: Array<{ option: { label: string } }>;
}

export interface LabTestTimelineRow {
  id: string;
  createdAt: Date;
  status: string;
  completedAt: Date | null;
  labTest: { name: string; category: string | null };
}

export interface MedicalDocumentTimelineRow {
  id: string;
  title: string;
  type: string;
  status: string;
  createdAt: Date;
}

export interface FollowUpTimelineRow {
  id: string;
  reason: string;
  scheduledDate: Date;
  status: string;
}

export interface ImmunizationTimelineRow {
  id: string;
  vaccineName: string;
  administeredDate: Date;
  lotNumber: string | null;
  notes: string | null;
}

export interface AdmissionTimelineRow {
  id: string;
  admittedAt: Date;
  dischargedAt: Date | null;
  reason: string | null;
  diagnosis: string | null;
  status: string;
}

export interface MedicationDoseTimelineRow {
  id: string;
  takenAt: Date | null;
  scheduledAt: Date;
  status: string;
  notes: string | null;
  doseAmount: string | null;
  source: string;
  medication: { name: string };
}
