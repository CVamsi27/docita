import type { SearchEntityType, SearchResult } from '../search.types';

export interface ISearchStrategy {
  readonly entityType: Exclude<SearchEntityType, 'all'>;

  search(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]>;
}
