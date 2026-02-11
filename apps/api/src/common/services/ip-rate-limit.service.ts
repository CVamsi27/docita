import { Injectable, BadRequestException } from '@nestjs/common';
import { Request } from 'express';

/**
 * Service for IP-based rate limiting
 * Tracks login attempts by IP address and applies progressive throttling
 */
@Injectable()
export class IpRateLimitService {
  // Map of IP -> { attempts: number, resetTime: timestamp }
  private readonly ipAttempts = new Map<string, { count: number; resetTime: number }>();

  private readonly WINDOW_MS = 60 * 1000; // 1 minute window
  private readonly MAX_ATTEMPTS_PER_IP = 10; // 10 requests per minute per IP
  private readonly BAN_THRESHOLD = 50; // Ban IP after 50 attempts in 10 minutes
  private readonly BAN_WINDOW_MS = 10 * 60 * 1000; // 10 minute ban window

  private readonly bannedIps = new Map<string, number>(); // IP -> unban timestamp

  /**
   * Extract client IP from request
   * Respects X-Forwarded-For header for proxied requests
   */
  getClientIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Check if IP is currently banned
   */
  isIpBanned(ip: string): boolean {
    const banTime = this.bannedIps.get(ip);
    if (!banTime) return false;

    const now = Date.now();
    if (now > banTime) {
      // Ban expired, remove it
      this.bannedIps.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Get remaining ban time in seconds
   */
  getRemainingBanTime(ip: string): number {
    const banTime = this.bannedIps.get(ip);
    if (!banTime) return 0;

    const remaining = banTime - Date.now();
    return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
  }

  /**
   * Check rate limit for IP
   * Returns true if request is allowed, false if rate limited
   */
  checkRateLimit(ip: string): boolean {
    // Check if IP is banned
    if (this.isIpBanned(ip)) {
      return false;
    }

    const now = Date.now();
    const tracker = this.ipAttempts.get(ip);

    if (!tracker || now > tracker.resetTime) {
      // First request or window expired
      this.ipAttempts.set(ip, {
        count: 1,
        resetTime: now + this.WINDOW_MS,
      });
      return true;
    }

    // Increment attempt count
    tracker.count++;

    // Check if exceeded threshold for banning
    if (tracker.count > this.BAN_THRESHOLD) {
      this.bannedIps.set(ip, now + this.BAN_WINDOW_MS);
      this.ipAttempts.delete(ip);
      return false;
    }

    // Check if exceeded rate limit
    if (tracker.count > this.MAX_ATTEMPTS_PER_IP) {
      return false;
    }

    return true;
  }

  /**
   * Get current attempt count for IP
   */
  getAttemptCount(ip: string): number {
    const tracker = this.ipAttempts.get(ip);
    if (!tracker) return 0;

    const now = Date.now();
    if (now > tracker.resetTime) {
      return 0;
    }

    return tracker.count;
  }

  /**
   * Manually whitelist an IP (for testing or trusted services)
   */
  whitelistIp(ip: string): void {
    this.ipAttempts.delete(ip);
    this.bannedIps.delete(ip);
  }

  /**
   * Clear all tracking data (use with caution)
   */
  reset(): void {
    this.ipAttempts.clear();
    this.bannedIps.clear();
  }
}
