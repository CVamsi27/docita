import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Role } from '@workspace/db';
import { PrismaService } from '../prisma/prisma.service';

import { ConfigService } from '@nestjs/config';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  name: string;
  clinicId: string | null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_SECRET') ||
        'dev-only-secret-do-not-use-in-prod',
    });
  }

  async validate(payload: JwtPayload) {
    // Check if user still exists in database
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

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
