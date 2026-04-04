export interface IPatientTimelineRepository {
  verifyPatientAccess(patientId: string, clinicId: string): Promise<boolean>;

  fetchAppointments(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]>;

  fetchPrescriptions(
    patientId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]>;

  fetchMetricRecords(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]>;

  fetchLabTests(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]>;

  fetchMedicalDocuments(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]>;

  fetchFollowUps(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]>;

  fetchImmunizations(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]>;

  fetchAdmissions(
    patientId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]>;

  fetchMedicationDoses(
    patientId: string,
    clinicId: string,
    from?: Date,
    to?: Date,
  ): Promise<unknown[]>;

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

export const PATIENT_TIMELINE_REPOSITORY_TOKEN = Symbol(
  'IPatientTimelineRepository',
);
