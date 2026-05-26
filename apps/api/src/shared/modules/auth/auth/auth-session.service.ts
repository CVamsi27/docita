import {
  Inject,
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { PrismaService } from '@/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@workspace/db';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';
import { nanoid } from 'nanoid';
import type {
  AuthDeviceInfo,
  AuthLoginResult,
  UserWithoutPassword,
} from './auth.types';
import { jwtAudienceForRole } from './jwt-audience';

function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token, 'utf8').digest('hex');
}

@Injectable()
export class AuthSessionService {
  private readonly logger = new Logger(AuthSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async login(
    user: UserWithoutPassword,
    tokenFamily?: string,
    deviceInfo?: AuthDeviceInfo,
  ): Promise<AuthLoginResult> {
    const payload: Record<string, unknown> = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    };

    if (user.role === Role.PATIENT) {
      // RLS-BYPASS: auth resolves users before clinic tenant context is established
      const patient = await this.prisma.runUnrestricted(async () =>
        this.prisma.patient.findFirst({
          where: {
            userId: user.id,
          },
          select: { id: true },
        }),
      );

      if (patient) {
        payload.patientId = patient.id;
      }
    }

    const accessToken = this.jwtService.sign(payload, {
      audience: jwtAudienceForRole(user.role),
    });
    const refreshToken = nanoid(64);

    const newTokenFamily = tokenFamily || nanoid(16);

    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        tokenHash: hashRefreshToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(
          Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
        ),
        tokenFamily: newTokenFamily,
        deviceName: deviceInfo?.deviceName,
        ipAddress: deviceInfo?.ipAddress,
        userAgent: deviceInfo?.userAgent,
        lastUsedAt: this.clock.now(),
      },
    });

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        clinicId: user.clinicId,
        emailVerified: user.emailVerified,
        onboardingStep: user.onboardingStep ?? undefined,
      },
    };
  }

  async refreshTokens(incomingRefreshToken: string): Promise<AuthLoginResult> {
    // RLS-BYPASS: auth resolves users before clinic tenant context is established
    const storedToken = await this.prisma.runUnrestricted(async () => {
      const tokenHash = hashRefreshToken(incomingRefreshToken);
      return (
        (await this.prisma.refreshToken.findUnique({
          where: { tokenHash },
          include: { user: true },
        })) ??
        (await this.prisma.refreshToken.findUnique({
          where: { token: incomingRefreshToken },
          include: { user: true },
        }))
      );
    });

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < this.clock.now()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (storedToken.replacedByToken) {
      await this.prisma.refreshToken.updateMany({
        where: {
          tokenFamily: storedToken.tokenFamily,
          userId: storedToken.userId,
        },
        data: {
          revokedAt: this.clock.now(),
        },
      });

      throw new UnauthorizedException(
        'Token reuse detected. All sessions have been revoked. Please log in again.',
      );
    }

    const { password: _password, ...userWithoutPassword } = storedToken.user;
    const deviceInfo: AuthDeviceInfo = {
      deviceName: storedToken.deviceName ?? undefined,
      ipAddress: storedToken.ipAddress ?? undefined,
      userAgent: storedToken.userAgent ?? undefined,
    };
    const newTokens = await this.login(
      userWithoutPassword,
      storedToken.tokenFamily ?? undefined,
      deviceInfo,
    );

    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: {
        revokedAt: this.clock.now(),
        replacedByToken: newTokens.refresh_token,
      },
    });

    return newTokens;
  }

  async getSessions(userId: string) {
    return this.prisma.refreshToken.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: this.clock.now() },
      },
      select: {
        id: true,
        deviceName: true,
        ipAddress: true,
        userAgent: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.refreshToken.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.userId !== userId) {
      throw new BadRequestException('Session not found');
    }

    await this.prisma.refreshToken.update({
      where: { id: sessionId },
      data: { revokedAt: this.clock.now() },
    });
  }

  async revokeAllSessions(userId: string, exceptToken?: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptToken ? { NOT: { token: exceptToken } } : {}),
      },
      data: { revokedAt: this.clock.now() },
    });
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await this.prisma.refreshToken.update({
        where: { token: refreshToken },
        data: { revokedAt: this.clock.now() },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Unknown refresh-token revoke failure';
      this.logger.warn(`Logout refresh-token revoke failed: ${message}`);
    }
  }
}
