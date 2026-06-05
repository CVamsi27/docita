export interface PatientFullTextSearchHit {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string | null;
  mrn: string | null;
  rank: number;
}

export interface AppointmentFullTextSearchHit {
  id: string;
  notes: string | null;
  chiefComplaint: string | null;
  startTime: Date;
  patientFirstName: string;
  patientLastName: string;
  rank: number;
}

export interface SearchQueryRepository {
  searchPatientsFullText(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<PatientFullTextSearchHit[]>;

  searchPatientsFuzzy(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<PatientFullTextSearchHit[]>;

  searchAppointmentsFullText(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<AppointmentFullTextSearchHit[]>;

  searchAppointmentsFuzzy(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<AppointmentFullTextSearchHit[]>;
}

export const SEARCH_QUERY_REPOSITORY_TOKEN = Symbol('SearchQueryRepository');
