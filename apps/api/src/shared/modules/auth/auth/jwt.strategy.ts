import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import {
  Inject,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Role } from '@workspace/db';
import { Request } from 'express';
import { forbiddenProblem } from '@/shared/common/errors/forbidden-problem';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import {
  IUserRepository,
  USER_REPOSITORY_TOKEN,
} from '@/domains/users/core/repositories/user.repository.interface';

import { JWT_AUDIENCES, type JwtAudience } from './jwt-audience';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
  clinicId: string | null;
  patientId?: string;
  aud?: JwtAudience | JwtAudience[];
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
    @Inject(USER_REPOSITORY_TOKEN)
    private readonly userRepository: IUserRepository,
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
      audience: [...JWT_AUDIENCES],
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    try {
      const user = await this.userRepository.findByIdForJwtValidation(
        payload.sub,
      );

      if (!user) {
        this.logger.warn('User not found for token subject');
        throw new UnauthorizedException('User not found');
      }
      if (user.appLoginDisabled) {
        throw forbiddenProblem(
          'APP_LOGIN_DISABLED',
          'This profile cannot sign in to the app.',
        );
      }
      const jwtAudience = Array.isArray(payload.aud)
        ? payload.aud[0]
        : payload.aud;

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
        jwtAudience,
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (error instanceof ForbiddenException) {
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
