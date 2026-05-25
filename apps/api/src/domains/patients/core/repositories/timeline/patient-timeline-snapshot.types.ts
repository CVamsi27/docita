export interface PatientConditionSnapshotRow {
  id: string;
  conditionName: string;
  status: string;
  severity: string | null;
}

export interface PatientAllergySnapshotRow {
  id: string;
  allergen: string;
  severity: string | null;
  allergyType: string;
}

export interface SnapshotPrescriptionMedicationRow {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  isPRN: boolean;
  endDate: Date | null;
}

export interface SnapshotPrescriptionRow {
  medications: SnapshotPrescriptionMedicationRow[];
}

export interface PatientVitalsSnapshotRow {
  systolicBP: number | null;
  diastolicBP: number | null;
  pulse: number | null;
  temperature: number | null;
  spo2: number | null;
  weight: number | null;
  createdAt: Date;
}
