import { Logger } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

export interface RateLimitTracker {
  messageCount: number;
  resetTime: number;
}

export interface RateLimitExceededResponse {
  event: 'error';
  data: { message: string };
}

export interface AuthenticatedSocketPayload {
  sub?: string;
  email?: string;
  clinicId?: string;
  role?: string;
  [key: string]: unknown;
}

export interface ConnectionAuthHooks {
  /** Logged (with the client id appended) when the handshake carries no bearer token. */
  noTokenWarning: string;
  /** Logged (with the client id appended) when token verification throws. */
  unauthorizedWarning: string;
  /** Runs once the token verifies — room joins, success logging, etc. */
  onAuthenticated: (
    client: Socket,
    payload: AuthenticatedSocketPayload,
  ) => void;
}

/**
 * Shared plumbing for authenticated Socket.IO gateways (notifications,
 * payments, ...): per-client rate limiting, the rate-limit error envelope,
 * bearer-token extraction from the handshake, and rate-limit-map cleanup on
 * disconnect. Concrete gateways own their own `@WebSocketServer()` server,
 * logger context, message budget, and connection handling — those differ
 * enough (room joins, log copy) to stay per-gateway, but the bookkeeping
 * below is identical and was previously copy-pasted between the two.
 */
export abstract class BaseWebSocketGateway {
  protected abstract readonly logger: Logger;
  protected abstract readonly jwtService: JwtService;
  protected abstract readonly RATE_LIMIT_MESSAGES: number;
  protected readonly RATE_LIMIT_WINDOW_MS = 60000;
  protected readonly rateLimitMap = new Map<string, RateLimitTracker>();

  protected extractAuthToken(client: Socket): string | undefined {
    return (
      client.handshake.auth?.token ||
      client.handshake.headers?.authorization?.split(' ')[1]
    );
  }

  /**
   * Template for the connect handshake shared by every authenticated gateway:
   * pull the bearer token, reject (with logging) when it's missing or invalid,
   * otherwise stash the verified payload, seed the rate-limit tracker, and
   * hand off to the gateway-specific `onAuthenticated` hook (room joins,
   * success logging, ...) which is the only part that legitimately differs.
   */
  protected async authenticateConnection(
    client: Socket,
    hooks: ConnectionAuthHooks,
  ): Promise<void> {
    const authToken = this.extractAuthToken(client);

    if (!authToken) {
      this.logger.warn(`${hooks.noTokenWarning}: ${client.id}`);
      client.disconnect();
      return;
    }

    try {
      const payload = (await this.jwtService.verifyAsync(
        authToken,
      )) as AuthenticatedSocketPayload;
      client.data.user = payload;

      this.seedRateLimitTracker(client.id);
      hooks.onAuthenticated(client, payload);
    } catch {
      this.logger.warn(`${hooks.unauthorizedWarning}: ${client.id}`);
      client.disconnect(true);
    }
  }

  protected seedRateLimitTracker(clientId: string): void {
    this.rateLimitMap.set(clientId, {
      messageCount: 0,
      resetTime: Date.now() + this.RATE_LIMIT_WINDOW_MS,
    });
  }

  protected checkRateLimit(clientId: string): boolean {
    const tracker = this.rateLimitMap.get(clientId);
    if (!tracker) return true;

    const now = Date.now();
    if (now > tracker.resetTime) {
      tracker.messageCount = 0;
      tracker.resetTime = now + this.RATE_LIMIT_WINDOW_MS;
    }

    if (tracker.messageCount >= this.RATE_LIMIT_MESSAGES) return false;

    tracker.messageCount++;
    return true;
  }

  protected emitRateLimitError(client: Socket): void {
    client.emit('error', {
      message: `Rate limit exceeded. Maximum ${this.RATE_LIMIT_MESSAGES} messages per ${this.RATE_LIMIT_WINDOW_MS / 1000}s allowed.`,
      code: 'RATE_LIMIT_EXCEEDED',
    });
  }

  /**
   * The check-then-emit rate-limit guard repeated at the top of every
   * `@SubscribeMessage` handler. Returns the error envelope to return
   * immediately when the client is over budget, or `null` to continue.
   */
  protected rejectIfRateLimited(
    client: Socket,
  ): RateLimitExceededResponse | null {
    if (this.checkRateLimit(client.id)) return null;
    this.emitRateLimitError(client);
    return { event: 'error', data: { message: 'Rate limit exceeded' } };
  }

  handleDisconnect(client: Socket): void {
    this.rateLimitMap.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }
}
