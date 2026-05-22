export interface SearchTableTsvectorSupport {
  tableName: string;
  hasSearchTsvector: boolean;
}

export interface SearchSchemaRepository {
  getPatientAndAppointmentTsvectorSupport(): Promise<
    SearchTableTsvectorSupport[]
  >;
}

export const SEARCH_SCHEMA_REPOSITORY_TOKEN = Symbol('SearchSchemaRepository');
