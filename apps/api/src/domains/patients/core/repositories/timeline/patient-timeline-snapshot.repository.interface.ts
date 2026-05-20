export interface IPatientTimelineSnapshotRepository {
  verifyPatientAccess(patientId: string, clinicId: string): Promise<boolean>;

  fetchPatientConditions(patientId: string): Promise<unknown[]>;

  fetchPatientAllergies(patientId: string): Promise<unknown[]>;

  fetchRecentPrescriptionsWithMedications(
    patientId: string,
    take: number,
  ): Promise<unknown[]>;

  fetchLatestVitals(
    patientId: string,
    clinicId: string,
  ): Promise<unknown | null>;

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
