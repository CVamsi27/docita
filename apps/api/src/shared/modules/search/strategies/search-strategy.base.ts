import { Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { SearchFullTextSupportService } from '../search-full-text-support.service';
import {
  SEARCH_QUERY_REPOSITORY_TOKEN,
  type SearchQueryRepository,
} from '@/shared/modules/search/ports/search-query.repository.port';
import type {
  SearchResult,
  SearchEntityType,
  FullTextCapableEntity,
} from '../search.types';
import type { ISearchStrategy } from './search-strategy.interface';
import { Inject } from '@nestjs/common';

export abstract class SearchStrategyBase implements ISearchStrategy {
  abstract readonly entityType: Exclude<SearchEntityType, 'all'>;
  protected abstract readonly fullTextKey: FullTextCapableEntity;

  protected abstract searchFullText(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]>;

  protected abstract searchFallback(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]>;

  protected logger!: Logger;

  constructor(
    protected readonly prisma: PrismaService,
    protected readonly fullTextSupport: SearchFullTextSupportService,
    @Inject(SEARCH_QUERY_REPOSITORY_TOKEN)
    protected readonly searchQueries: SearchQueryRepository,
  ) {}

  protected getLogger(): Logger {
    if (!this.logger) {
      this.logger = new Logger(
        this.entityType.charAt(0).toUpperCase() +
          this.entityType.slice(1) +
          'SearchStrategy',
      );
    }
    return this.logger;
  }

  async search(
    clinicId: string,
    query: string,
    limit: number,
  ): Promise<SearchResult[]> {
    const support = await this.fullTextSupport.getSupport();
    if (!support[this.fullTextKey])
      return this.searchFallback(clinicId, query, limit);

    try {
      return await this.searchFullText(clinicId, query, limit);
    } catch (error) {
      this.fullTextSupport.disable(this.fullTextKey);
      this.getLogger().warn(
        `Full-text search failed for ${this.entityType}s, falling back to ILIKE: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return this.searchFallback(clinicId, query, limit);
    }
  }
}
