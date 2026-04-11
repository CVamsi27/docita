import { Injectable } from '@nestjs/common';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

@Injectable()
export class UserRateLimitService {
  private readonly userAttempts = new Map<string, RateLimitEntry>();

  private readonly WINDOW_MS = 60 * 1000;
  private readonly MAX_ATTEMPTS_PER_USER = 30;
  private nextCleanupAt = 0;

  checkRateLimit(userId: string): boolean {
    const now = Date.now();
    this.cleanupExpiredEntries(now);
    const tracker = this.userAttempts.get(userId);

    if (!tracker || now > tracker.resetTime) {
      this.userAttempts.set(userId, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return true;
    }

    tracker.count++;

    return tracker.count <= this.MAX_ATTEMPTS_PER_USER;
  }

  getRemainingRequests(userId: string): number {
    const now = Date.now();
    this.cleanupExpiredEntries(now);
    const tracker = this.userAttempts.get(userId);
    if (!tracker || now > tracker.resetTime) {
      return this.MAX_ATTEMPTS_PER_USER;
    }
    return Math.max(0, this.MAX_ATTEMPTS_PER_USER - tracker.count);
  }

  reset(userId: string): void {
    this.userAttempts.delete(userId);
  }

  resetAll(): void {
    this.userAttempts.clear();
  }

  private cleanupExpiredEntries(now: number): void {
    if (now < this.nextCleanupAt) {
      return;
    }

    this.nextCleanupAt = now + this.WINDOW_MS;
    for (const [userId, tracker] of this.userAttempts.entries()) {
      if (now > tracker.resetTime) {
        this.userAttempts.delete(userId);
      }
    }
  }
}
