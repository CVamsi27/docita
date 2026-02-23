import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class IdempotencyService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  /**
   * Get a cached response for an idempotency key
   */
  async getResponse(key: string): Promise<any> {
    return this.cacheManager.get(`idempotency:${key}`);
  }

  /**
   * Save a response for an idempotency key.
   * Default TTL is 24 hours.
   */
  async saveResponse(
    key: string,
    response: Record<string, unknown>,
    ttlInSeconds: number = 24 * 60 * 60,
  ): Promise<void> {
    await this.cacheManager.set(
      `idempotency:${key}`,
      response,
      ttlInSeconds * 1000,
    );
  }

  /**
   * Check if an operation is currently being processed
   * (can be used for distributed locking if needed, but simple for now)
   */
  async isProcessing(key: string): Promise<boolean> {
    const value = await this.cacheManager.get(`idempotency:processing:${key}`);
    return !!value;
  }

  async setProcessing(key: string, ttlInSeconds: number = 60): Promise<void> {
    await this.cacheManager.set(
      `idempotency:processing:${key}`,
      true,
      ttlInSeconds * 1000,
    );
  }

  async clearProcessing(key: string): Promise<void> {
    await this.cacheManager.del(`idempotency:processing:${key}`);
  }
}
