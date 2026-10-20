import type {
  SearchEntityType as SearchEntityTypeContract,
  SearchResult as SearchResultContract,
} from '@workspace/types';

/**
 * `SearchResult` used to be a second hand-written copy of what the strategies
 * produce, and it is now inferred from the wire contract the SPA parses. The
 * narrowing that matters is `type`: the copy allowed `all`, which
 * `SearchStrategyRegistry.resolveTypes` makes unreachable, so the union was
 * wider than any row the server can emit.
 */
export type SearchEntityType = SearchEntityTypeContract;
export type SearchResult = SearchResultContract;

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
