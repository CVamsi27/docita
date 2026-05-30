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
import { Prisma, Role } from '@workspace/db';
import {
  AUTH_CONSTANTS,
  DATABASE_CONSTANTS,
} from '@/shared/modules/config/app-constants';
import { isPrismaTransactionAcquireTimeout } from '@/shared/common/utils/prisma-transaction-acquire-timeout';
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
    tx?: Prisma.TransactionClient,
  ): Promise<AuthLoginResult> {
    const patientId = await this.resolvePatientId(user, tx);
    return this.issueTokens(user, patientId, tokenFamily, deviceInfo, tx);
  }

  async refreshTokens(incomingRefreshToken: string): Promise<AuthLoginResult> {
    // RLS-BYPASS: auth resolves users before clinic tenant context is established
    return this.prisma.runUnrestricted(() =>
      this.runRefreshTokenTransaction(incomingRefreshToken),
    );
  }

  private async runRefreshTokenTransaction(
    incomingRefreshToken: string,
  ): Promise<AuthLoginResult> {
    const transactionOptions = {
      maxWait: DATABASE_CONSTANTS.AUTH_REFRESH_TRANSACTION_MAX_WAIT_MS,
      timeout: DATABASE_CONSTANTS.AUTH_REFRESH_TRANSACTION_TIMEOUT_MS,
    };
    const maxAttempts = DATABASE_CONSTANTS.AUTH_REFRESH_TRANSACTION_MAX_ATTEMPTS;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.prisma.$transaction(
          (tx) =>
            this.rotateRefreshTokenInTransaction(tx, incomingRefreshToken),
          transactionOptions,
        );
      } catch (error) {
        const canRetry =
          attempt < maxAttempts &&
          isPrismaTransactionAcquireTimeout(error);
        if (!canRetry) {
          throw error;
        }
        this.logger.warn(
          `Refresh token transaction waiting for pool connection (attempt ${attempt}/${maxAttempts}); retrying`,
        );
        await this.delay(
          DATABASE_CONSTANTS.AUTH_REFRESH_TRANSACTION_RETRY_DELAY_MS * attempt,
        );
      }
    }

    throw new Error('Refresh token transaction failed after retries');
  }

  private async rotateRefreshTokenInTransaction(
    tx: Prisma.TransactionClient,
    incomingRefreshToken: string,
  ): Promise<AuthLoginResult> {
    const tokenHash = hashRefreshToken(incomingRefreshToken);
    const storedToken =
      (await tx.refreshToken.findUnique({
        where: { tokenHash },
        include: { user: true },
      })) ??
      (await tx.refreshToken.findUnique({
        where: { token: incomingRefreshToken },
        include: { user: true },
      }));

    if (
      !storedToken ||
      storedToken.revokedAt ||
      storedToken.expiresAt < this.clock.now()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (storedToken.replacedByToken) {
      await this.revokeTokenFamily(
        tx,
        storedToken.userId,
        storedToken.tokenFamily,
      );
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
    const patientId = await this.resolvePatientId(userWithoutPassword, tx);
    const newTokens = await this.issueTokens(
      userWithoutPassword,
      patientId,
      storedToken.tokenFamily ?? undefined,
      deviceInfo,
      tx,
    );

    const updated = await tx.refreshToken.updateMany({
      where: {
        id: storedToken.id,
        revokedAt: null,
        replacedByToken: null,
      },
      data: {
        revokedAt: this.clock.now(),
        replacedByToken: newTokens.refresh_token,
      },
    });

    if (updated.count !== 1) {
      await this.revokeTokenFamily(
        tx,
        storedToken.userId,
        storedToken.tokenFamily,
      );
      throw new UnauthorizedException(
        'Token reuse detected. All sessions have been revoked. Please log in again.',
      );
    }

    return newTokens;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
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
    const exceptTokenHash = exceptToken ? hashRefreshToken(exceptToken) : null;
    await this.prisma.refreshToken.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(exceptToken
          ? {
              NOT: {
                OR: [{ token: exceptToken }, { tokenHash: exceptTokenHash }],
              },
            }
          : {}),
      },
      data: { revokedAt: this.clock.now() },
    });
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await this.prisma.refreshToken.updateMany({
        where: {
          OR: [
            { token: refreshToken },
            { tokenHash: hashRefreshToken(refreshToken) },
          ],
        },
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

  private async resolvePatientId(
    user: UserWithoutPassword,
    tx?: Prisma.TransactionClient,
  ): Promise<string | undefined> {
    if (user.role !== Role.PATIENT) return undefined;
    if (!tx) {
      // RLS-BYPASS: auth resolves patient identity before clinic tenant context is established.
      return this.prisma.runUnrestricted(async () => {
        const patient = await this.prisma.patient.findFirst({
          where: { userId: user.id },
          select: { id: true },
        });
        return patient?.id;
      });
    }
    const patient = await tx.patient.findFirst({
      where: { userId: user.id },
      select: { id: true },
    });
    return patient?.id;
  }

  private async issueTokens(
    user: UserWithoutPassword,
    patientId: string | undefined,
    tokenFamily?: string,
    deviceInfo?: AuthDeviceInfo,
    tx?: Prisma.TransactionClient,
  ): Promise<AuthLoginResult> {
    const payload: Record<string, unknown> = {
      email: user.email,
      sub: user.id,
      role: user.role,
      name: user.name,
      clinicId: user.clinicId,
    };

    if (patientId) {
      payload.patientId = patientId;
    }

    const accessToken = this.jwtService.sign(payload, {
      audience: jwtAudienceForRole(user.role),
    });
    const refreshToken = nanoid(64);
    const client = tx ?? this.prisma;

    await client.refreshToken.create({
      data: {
        token: refreshToken,
        tokenHash: hashRefreshToken(refreshToken),
        userId: user.id,
        expiresAt: new Date(
          this.clock.now().getTime() + AUTH_CONSTANTS.REFRESH_TOKEN_MAX_AGE_MS,
        ),
        tokenFamily: tokenFamily || nanoid(16),
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

  private async revokeTokenFamily(
    tx: Prisma.TransactionClient,
    userId: string,
    tokenFamily: string | null,
  ): Promise<void> {
    await tx.refreshToken.updateMany({
      where: {
        userId,
        ...(tokenFamily ? { tokenFamily } : {}),
      },
      data: { revokedAt: this.clock.now() },
    });
  }
}
