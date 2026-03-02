import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class IdempotencyService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  async getResponse(key: string): Promise<unknown> {
    return this.cacheManager.get(`idempotency:${key}`);
  }

  async saveResponse(
    key: string,
    response: unknown,
    ttlInSeconds: number = 24 * 60 * 60,
  ): Promise<void> {
    await this.cacheManager.set(
      `idempotency:${key}`,
      response,
      ttlInSeconds * 1000,
    );
  }

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
