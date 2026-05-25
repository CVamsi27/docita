import { Injectable, Logger } from '@nestjs/common';
import { TaggedCacheService } from '@/shared/modules/services/tagged-cache.service';
import { SearchStrategyRegistry } from './search-strategy.registry';
import type { SearchOptions, SearchResult } from './search.types';

export type {
  SearchEntityType,
  SearchResult,
  SearchOptions,
} from './search.types';

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);
  private readonly searchCacheTtl = 300;

  constructor(
    private readonly cacheService: TaggedCacheService,
    private readonly strategyRegistry: SearchStrategyRegistry,
  ) {}

  async search(options: SearchOptions): Promise<SearchResult[]> {
    const { clinicId, query, types = ['all'], limit = 20 } = options;

    if (!query || query.length < 2) {
      return [];
    }

    const normalizedQuery = query.trim().replace(/\s+/g, ' ');
    const normalizedQueryLower = normalizedQuery.toLowerCase();

    const cacheKey = `search:${clinicId}:${normalizedQueryLower}:${types.join(',')}:${limit}`;
    const cached = await this.cacheService.get<SearchResult[]>(cacheKey);
    if (cached) {
      this.logger.debug(`Cache hit for search query: ${normalizedQuery}`);
      return cached;
    }

    const searchTypes = this.strategyRegistry.resolveTypes(types);
    const perTypeLimit = Math.ceil(limit / searchTypes.length);

    const strategyResults = await Promise.allSettled(
      searchTypes.map((type) =>
        this.strategyRegistry
          .get(type)
          .search(clinicId, normalizedQuery, perTypeLimit),
      ),
    );

    const allResults = strategyResults.flatMap((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      }
      this.logger.warn(
        `Search strategy failed for type ${searchTypes[index]}: ${
          result.reason instanceof Error
            ? result.reason.message
            : 'Unknown error'
        }`,
      );
      return [];
    });

    const sorted = allResults
      .sort((a, b) => {
        const scoreA = a.relevanceScore ?? 0;
        const scoreB = b.relevanceScore ?? 0;
        if (scoreB !== scoreA) return scoreB - scoreA;

        const aExact = a.title.toLowerCase().includes(normalizedQueryLower);
        const bExact = b.title.toLowerCase().includes(normalizedQueryLower);
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return 0;
      })
      .slice(0, limit);

    await this.cacheService.set(cacheKey, sorted, {
      ttl: this.searchCacheTtl,
      tags: [`search:${clinicId}`],
    });

    return sorted;
  }

  async invalidateSearchCache(clinicId?: string): Promise<void> {
    if (clinicId) {
      await this.cacheService.invalidateTag(`search:${clinicId}`);
    } else {
      await this.cacheService.clear();
    }
    this.logger.debug(
      `Invalidated search cache for clinic: ${clinicId || 'all'}`,
    );
  }
}
