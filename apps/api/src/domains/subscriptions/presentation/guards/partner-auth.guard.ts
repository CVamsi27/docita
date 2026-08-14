// check-as-cast-density: allow-file — the partner context is set on
// the request by `PartnerAuthService.verifyAccessToken` via a typed
// symbol; the cast at the guard is the read-side of that contract.
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { PartnerAuthService } from '../../core/services/partner-auth.service';

export const PARTNER_AUTH_REQUEST_KEY = 'partnerAuth' as const;

export interface PartnerAuthRequestContext {
  referrerId: string;
  phone: string;
}

/**
 * Verifies the partner access token (audience = "partner") and stores
 * the resolved referrer context on the request at PARTNER_AUTH_REQUEST_KEY.
 * Use a `@UseGuards(PartnerAuthGuard)` controller / handler; downstream
 * code reads `request[PARTNER_AUTH_REQUEST_KEY]` to get the referrer id.
 */
@Injectable()
export class PartnerAuthGuard implements CanActivate {
  constructor(private readonly authService: PartnerAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // The partner portal is its own auth surface: the controller is marked
    // `@Public()` so the global staff-session guards skip it, and THIS guard
    // is the only auth on the surface. It must therefore always verify the
    // partner token — it must not honor the public/upload-session-skip that
    // the session guards use (that would leave the request context empty and
    // every handler would 500).
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing partner access token');
    }

    const claims = await this.authService.verifyAccessToken(token);
    const ctx: PartnerAuthRequestContext = {
      referrerId: claims.sub,
      phone: claims.phone,
    };
    (request as Request & Record<string, unknown>)[PARTNER_AUTH_REQUEST_KEY] =
      ctx;
    return true;
  }

  private extractToken(request: Request): string | null {
    const header = request.headers?.authorization;
    if (typeof header !== 'string') return null;
    const match = header.match(/^Bearer\s+(.+)$/i);
    return match ? match[1].trim() : null;
  }
}
