import { Inject, Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

export interface CacheInvalidationEvent {
  key: string;
  pattern?: string;
  tags?: string[];
  timestamp: string;
}

const INVALIDATION_CHANNEL = 'cache.invalidate';

@Injectable()
export class CacheInvalidationBus {
  private readonly logger = new Logger(CacheInvalidationBus.name);

  constructor(
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
    private readonly events: EventEmitter2,
  ) {
    this.events.on(INVALIDATION_CHANNEL, (event: CacheInvalidationEvent) => {
      this.handleInvalidation(event).catch((err) => {
        this.logger.warn(
          `Cache invalidation handler failed: ${err instanceof Error ? err.message : String(err)}`,
        );
      });
    });
  }

  invalidateKey(key: string): void {
    this.events.emit(INVALIDATION_CHANNEL, {
      key,
      timestamp: new Date().toISOString(),
    });
  }

  invalidatePattern(pattern: string): void {
    this.events.emit(INVALIDATION_CHANNEL, {
      key: pattern,
      pattern,
      timestamp: new Date().toISOString(),
    });
  }

  invalidateByTags(tags: string[]): void {
    this.events.emit(INVALIDATION_CHANNEL, {
      key: `tags:${tags.join(',')}`,
      tags,
      timestamp: new Date().toISOString(),
    });
  }

  private async handleInvalidation(
    event: CacheInvalidationEvent,
  ): Promise<void> {
    try {
      const targets: string[] = [];
      if (event.key) targets.push(event.key);
      if (event.tags) targets.push(...event.tags);
      if (targets.length === 0) return;
      // Each cache key delete is independent; parallelize so a slow key
      // does not block the others.
      await Promise.all(
        targets.map((target) =>
          this.cache.del(target).then(() => {
            this.logger.debug(`Cache invalidated: ${target}`);
          }),
        ),
      );
    } catch (error) {
      this.logger.error(
        `Cache invalidation error for ${event.key ?? 'event'}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
