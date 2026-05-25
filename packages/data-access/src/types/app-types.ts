export interface AppConstants {
  followUpTypes: Array<{ value: string; label: string }>;
  reminderDays: Array<{ value: number; label: string }>;
  inventoryCategories: Array<{ value: string; label: string }>;
  queueStatuses: Array<{ value: string; label: string }>;
  wardTypes: Array<{ value: string; label: string }>;
  availableBeds: Array<{ value: string; label: string }>;
  teethQuadrants: Record<string, number[]>;
  toothConditions: Array<{ value: string; label: string; color: string }>;
}

export interface MedicalHistoryTimelineItem {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  type: string;
  chiefComplaint: string | null;
  encounterSummary: string | null;
  provisionalDiagnosis: string | null;
  finalDiagnosis: string | null;
  clinicalImpression: string | null;
  treatmentPlan: string | null;
  observations: string | null;
  notes: string | null;
  doctor: {
    id: string;
    name: string;
    specialization: string | null;
  } | null;
  diagnoses: Array<{
    id: string;
    isPrimary: boolean;
    notes: string | null;
    icdCode: {
      id: string;
      code: string;
      description: string;
    } | null;
  }>;
  vitalSign: {
    id: string;
    systolicBP: number | null;
    diastolicBP: number | null;
    bloodPressure: string | null;
    pulse: number | null;
    temperature: number | null;
    spo2: number | null;
    weight: number | null;
    height: number | null;
  } | null;
  prescription: {
    id: string;
    medications: Array<{
      id: string;
      name: string;
      dosage: string;
      frequency: string;
      duration: string;
    }>;
  } | null;
  issueSummary: string;
  primaryDiagnosis: {
    id: string;
    isPrimary: boolean;
    notes: string | null;
    icdCode: {
      id: string;
      code: string;
      description: string;
    } | null;
  } | null;
  yearMonth: string;
}
