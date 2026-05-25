import { Injectable } from '@nestjs/common';
import { Request } from 'express';
import { getClientIp } from '@/shared/common/http/client-ip';

@Injectable()
export class IpRateLimitService {
  private readonly ipAttempts = new Map<
    string,
    { count: number; resetTime: number }
  >();

  private readonly WINDOW_MS = 60 * 1000;
  private readonly MAX_ATTEMPTS_PER_IP = 10;
  private readonly BAN_THRESHOLD = 50;
  private readonly BAN_WINDOW_MS = 10 * 60 * 1000;

  private readonly bannedIps = new Map<string, number>();
  private nextCleanupAt = 0;

  getClientIp(req: Request): string {
    return getClientIp(req);
  }

  isIpBanned(ip: string): boolean {
    this.cleanupExpiredEntries(Date.now());
    const banTime = this.bannedIps.get(ip);
    if (!banTime) return false;

    const now = Date.now();
    if (now > banTime) {
      this.bannedIps.delete(ip);
      return false;
    }

    return true;
  }

  getRemainingBanTime(ip: string): number {
    const banTime = this.bannedIps.get(ip);
    if (!banTime) return 0;

    const remaining = banTime - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  checkRateLimit(ip: string): boolean {
    const now = Date.now();
    this.cleanupExpiredEntries(now);

    if (this.isIpBanned(ip)) {
      return false;
    }

    const tracker = this.ipAttempts.get(ip);

    if (!tracker || now > tracker.resetTime) {
      this.ipAttempts.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return true;
    }

    tracker.count++;

    if (tracker.count > this.BAN_THRESHOLD) {
      this.bannedIps.set(ip, now + this.BAN_WINDOW_MS);
      this.ipAttempts.delete(ip);
      return false;
    }

    if (tracker.count > this.MAX_ATTEMPTS_PER_IP) {
      return false;
    }

    return true;
  }

  getAttemptCount(ip: string): number {
    const now = Date.now();
    this.cleanupExpiredEntries(now);
    const tracker = this.ipAttempts.get(ip);
    if (!tracker) return 0;

    if (now > tracker.resetTime) {
      this.ipAttempts.delete(ip);
      return 0;
    }

    return tracker.count;
  }

  whitelistIp(ip: string): void {
    this.ipAttempts.delete(ip);
    this.bannedIps.delete(ip);
  }

  reset(): void {
    this.ipAttempts.clear();
    this.bannedIps.clear();
  }

  private cleanupExpiredEntries(now: number): void {
    if (now < this.nextCleanupAt) {
      return;
    }

    this.nextCleanupAt = now + this.WINDOW_MS;

    for (const [ip, tracker] of this.ipAttempts.entries()) {
      if (now > tracker.resetTime) {
        this.ipAttempts.delete(ip);
      }
    }

    for (const [ip, banTime] of this.bannedIps.entries()) {
      if (now > banTime) {
        this.bannedIps.delete(ip);
      }
    }
  }
}
