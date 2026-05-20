export type SearchEntityType =
  | 'patient'
  | 'appointment'
  | 'prescription'
  | 'all';

export interface SearchResult {
  id: string;
  type: SearchEntityType;
  title: string;
  subtitle?: string;
  meta?: Record<string, unknown>;
  relevanceScore?: number;
}

export interface SearchOptions {
  clinicId: string;
  query: string;
  types?: SearchEntityType[];
  limit?: number;
}

export type FullTextCapableEntity = 'patient' | 'appointment';

export interface FullTextSupportState {
  patient: boolean;
  appointment: boolean;
}
