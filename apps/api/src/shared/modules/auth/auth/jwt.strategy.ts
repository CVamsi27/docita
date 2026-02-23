import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Role } from '@workspace/db';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Request } from 'express';

import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
  clinicId: string | null;
}

/**
 * Extract JWT from HttpOnly cookie first, then fall back to Bearer header.
 * This enables secure cookie-based auth while maintaining backward compatibility.
 */
function cookieThenBearerExtractor(req: Request): string | null {
  // 1. Try HttpOnly cookie
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }
  // 2. Fall back to Authorization header
  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error(
        'CRITICAL: JWT_SECRET is not set in environment. Authentication is non-functional.',
      );
    }
    super({
      jwtFromRequest: cookieThenBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    this.logger.debug('Validating payload:', JSON.stringify(payload));
    // Check if user still exists in database
    // Must use runUnrestricted because User is a tenant-scoped model
    // and no tenant context exists yet during JWT validation (chicken-and-egg)
    const user = await this.prisma.runUnrestricted(async () => {
      return this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
    });

    if (!user) {
      this.logger.warn('User not found for sub:', payload.sub);
      throw new UnauthorizedException('User not found');
    }
    this.logger.debug('User validated:', user.id);

    return {
      id: payload.sub,
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
      clinicId: user.clinicId,
    };
  }
}
