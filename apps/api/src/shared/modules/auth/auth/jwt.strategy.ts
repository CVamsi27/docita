import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Role } from '@workspace/db';
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

function cookieThenBearerExtractor(req: Request): string | null {
  if (req?.cookies?.access_token) {
    return req.cookies.access_token;
  }

  return ExtractJwt.fromAuthHeaderAsBearerToken()(req);
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
      jwtFromRequest: cookieThenBearerExtractor,
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.runUnrestricted(async () => {
      return this.prisma.user.findUnique({
        where: { id: payload.sub },
      });
    });

    if (!user) {
      this.logger.warn(`User not found for sub: ${payload.sub}`);
      throw new UnauthorizedException('User not found');
    }
    return {
      id: payload.sub,
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      name: user.name,
      clinicId: user.clinicId,
      patientId: payload.patientId,
    };
  }
}
