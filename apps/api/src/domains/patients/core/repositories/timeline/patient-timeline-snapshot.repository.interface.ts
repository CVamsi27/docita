import type {
  PatientAllergySnapshotRow,
  PatientConditionSnapshotRow,
  PatientVitalsSnapshotRow,
  SnapshotPrescriptionRow,
} from './patient-timeline-snapshot.types';

export interface IPatientTimelineSnapshotRepository {
  verifyPatientAccess(patientId: string, clinicId: string): Promise<boolean>;

  fetchPatientConditions(
    patientId: string,
  ): Promise<PatientConditionSnapshotRow[]>;

  fetchPatientAllergies(
    patientId: string,
  ): Promise<PatientAllergySnapshotRow[]>;

  fetchRecentPrescriptionsWithMedications(
    patientId: string,
    take: number,
  ): Promise<SnapshotPrescriptionRow[]>;

  fetchLatestVitals(
    patientId: string,
    clinicId: string,
  ): Promise<PatientVitalsSnapshotRow | null>;

  groupMedicationDosesByStatus(
    patientId: string,
    clinicId: string,
    medicationId: string,
  ): Promise<Array<{ status: string; _count: { status: number } }>>;

  groupMedicationDosesByMedicationIds(
    patientId: string,
    clinicId: string,
    medicationIds: string[],
  ): Promise<
    Array<{ medicationId: string; status: string; _count: { status: number } }>
  >;
}

export const PATIENT_TIMELINE_SNAPSHOT_REPOSITORY_TOKEN = Symbol(
  'IPatientTimelineSnapshotRepository',
);
