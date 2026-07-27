import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { PartnerAuthService } from '../../application/services/partner-auth.service';
import { bypassesSessionGuards } from '@/shared/modules/auth/auth/auth-route-metadata.util';

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
  constructor(
    private readonly authService: PartnerAuthService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (bypassesSessionGuards(this.reflector, context)) {
      return true;
    }

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
