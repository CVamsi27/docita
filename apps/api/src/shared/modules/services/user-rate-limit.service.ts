import { Injectable } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

interface RateLimitKeyConfig {
  limit: number;
  windowMs?: number;
}

@Injectable()
export class UserRateLimitService {
  private readonly userAttempts = new Map<string, RateLimitEntry>();

  private readonly WINDOW_MS = 60 * 1000;
  private readonly DEFAULT_MAX_ATTEMPTS_PER_USER = 120;
  private nextCleanupAt = 0;

  /**
   * Called with an optional bucket config so individual routes can raise the
   * ceiling or fully skip rate limiting. Typical examples:
   * - Consultation PATCH/POST flows: skip (already debounced + hashed).
   * - Medical coding search: higher limit to support typeahead.
   */
  checkRateLimit(userId: string, config?: RateLimitKeyConfig): boolean {
    if (config && config.limit <= 0) return true;

    const now = Date.now();
    this.cleanupExpiredEntries(now);
    const tracker = this.userAttempts.get(userId);
    const windowMs = config?.windowMs ?? this.WINDOW_MS;
    const limit = config?.limit ?? this.DEFAULT_MAX_ATTEMPTS_PER_USER;

    if (!tracker || now > tracker.resetTime) {
      this.userAttempts.set(userId, {
        count: 1,
        resetTime: now + windowMs,
      });
      return true;
    }

    tracker.count++;

    return tracker.count <= limit;
  }

  getRemainingRequests(userId: string, limitOverride?: number): number {
    const now = Date.now();
    this.cleanupExpiredEntries(now);
    const tracker = this.userAttempts.get(userId);
    const limit = limitOverride ?? this.DEFAULT_MAX_ATTEMPTS_PER_USER;
    if (!tracker || now > tracker.resetTime) return limit;
    return Math.max(0, limit - tracker.count);
  }

  reset(userId: string): void {
    this.userAttempts.delete(userId);
  }

  resetAll(): void {
    // jscpd:ignore-start
    this.userAttempts.clear();
  }

  private cleanupExpiredEntries(now: number): void {
    if (now < this.nextCleanupAt) {
      return;
    }

    this.nextCleanupAt = now + this.WINDOW_MS;
    for (const [userId, tracker] of this.userAttempts.entries()) {
      // jscpd:ignore-end
      if (now > tracker.resetTime) {
        this.userAttempts.delete(userId);
      }
    }
  }
}
