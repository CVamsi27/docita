import {
  assertTypedJsonValue,
  parseSerializedJson,
} from '@/shared/common/json/parse-serialized-json.boundary';
import { Injectable, Logger } from '@nestjs/common';

interface CacheOptions {
  ttl?: number;
  tags?: string[];
}

@Injectable()
export class TaggedCacheService {
  private readonly logger = new Logger(TaggedCacheService.name);
  private readonly store = new Map<
    string,
    { value: string; expiresAt: number | null }
  >();
  private readonly tagToKeys = new Map<string, Set<string>>();
  private readonly keyToTags = new Map<string, Set<string>>();

  private getEntry(key: string) {
    const entry = this.store.get(key);

    if (!entry) return null;

    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      this.removeKey(key);
      return null;
    }

    return entry;
  }

  private removeKey(key: string): void {
    this.store.delete(key);

    const tags = this.keyToTags.get(key);
    if (!tags) {
      return;
    }

    for (const tag of tags) {
      const keys = this.tagToKeys.get(tag);
      if (!keys) {
        continue;
      }

      keys.delete(key);
      if (keys.size === 0) {
        this.tagToKeys.delete(tag);
      }
    }

    this.keyToTags.delete(key);
  }

  private attachTags(key: string, tags: string[]): void {
    this.keyToTags.set(key, new Set(tags));

    for (const tag of tags) {
      const keys = this.tagToKeys.get(tag) ?? new Set<string>();
      keys.add(key);
      this.tagToKeys.set(tag, keys);
    }
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.getEntry(key);
    if (!entry) return null;

    try {
      return assertTypedJsonValue<T>(parseSerializedJson(entry.value));
    } catch (error) {
      this.logger.warn(
        `Cache get error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return null;
    }
  }

  async set<T>(key: string, value: T, options?: CacheOptions): Promise<void> {
    try {
      const ttl = options?.ttl ?? 300;
      const expiresAt = ttl > 0 ? Date.now() + ttl * 1000 : null;

      this.removeKey(key);
      this.store.set(key, {
        value: JSON.stringify(value),
        expiresAt,
      });

      if (options?.tags?.length) {
        this.attachTags(key, options.tags);
      }
    } catch (error) {
      this.logger.warn(
        `Cache set error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async delete(key: string): Promise<void> {
    try {
      this.removeKey(key);
    } catch (error) {
      this.logger.warn(
        `Cache delete error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async invalidateTag(tag: string): Promise<void> {
    try {
      const keys = [...(this.tagToKeys.get(tag) ?? [])];
      if (keys.length > 0) {
        for (const key of keys) {
          this.removeKey(key);
        }
        this.logger.log(`Invalidated ${keys.length} keys with tag ${tag}`);
      }
    } catch (error) {
      this.logger.warn(
        `Cache tag invalidation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async clear(): Promise<void> {
    try {
      this.store.clear();
      this.tagToKeys.clear();
      this.keyToTags.clear();
      this.logger.log('Cache cleared');
    } catch (error) {
      this.logger.warn(
        `Cache clear error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getStats(): Promise<{
    info: string;
    dbSize: number;
    connected: boolean;
  }> {
    try {
      return {
        info: 'In-memory tagged cache',
        dbSize: this.store.size,
        connected: true,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Cache stats error: ${errorMsg}`);
      return { info: errorMsg, dbSize: 0, connected: false };
    }
  }
}
