import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { OnboardingStep, Role } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { Request } from 'express';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
  clinicId: string | null;
  patientId?: string;
}

/**
 * Prefer Authorization Bearer when present so API clients (and E2E using
 * Bearer) are not overridden by a stale host-only `access_token` cookie from
 * an earlier browser or supertest session. Cookie-only sessions still work
 * when no Bearer token is sent.
 */
export function extractJwtFromRequest(req: Request): string | null {
  const bearer = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
  if (bearer) {
    return bearer;
  }

  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }

  return null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    private prisma: PrismaService,
    private configService: AppConfigService,
  ) {
    const jwtSecret = configService.getJwtSecret();
    if (!jwtSecret) {
      throw new Error(
        'CRITICAL: JWT_SECRET is not set in environment. Authentication is non-functional.',
      );
    }
    super({
      jwtFromRequest: extractJwtFromRequest,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    try {
      const users = await this.prisma.$queryRaw<
        Array<{
          id: string;
          name: string;
          clinicId: string | null;
          emailVerified: boolean;
          onboardingStep: OnboardingStep;
        }>
      >`
        SELECT "id", "name", "clinicId", "emailVerified", "onboardingStep"
        FROM "User"
        WHERE "id" = ${payload.sub}
        LIMIT 1
      `;
      const user = users[0] ?? null;

      if (!user) {
        this.logger.warn('User not found for token subject');
        throw new UnauthorizedException('User not found');
      }
      return {
        id: payload.sub,
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
        name: user.name,
        clinicId: user.clinicId,
        emailVerified: user.emailVerified,
        onboardingStep: user.onboardingStep,
        patientId: payload.patientId,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      const errorMessage =
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : String(error);
      this.logger.warn(
        `Failed to validate token subject ${payload.sub}: ${errorMessage}`,
      );
      throw new UnauthorizedException(
        'Unable to validate authentication right now. Please try again shortly.',
      );
    }
  }
}
