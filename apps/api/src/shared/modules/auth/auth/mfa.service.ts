import {
  Inject,
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { PrismaService } from '@/prisma/prisma.service';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';
import {
  mfaHashedBackupCodesSchema,
  mfaPlainBackupCodesSchema,
} from '@workspace/types';

@Injectable()
export class MfaService {
  private readonly logger = new Logger(MfaService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async generateSetupSecret(
    userId: string,
  ): Promise<{ qrCodeUrl: string; manualEntryKey: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, mfaEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException(
        'MFA is already enabled. Disable it first to re-setup.',
      );
    }

    const secret = generateSecret();

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaTempSecret: secret },
    });

    const otpauthUrl = generateURI({
      issuer: 'Docita',
      label: user.email,
      secret,
    });
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    return { qrCodeUrl, manualEntryKey: secret };
  }

  async enableMfa(
    userId: string,
    totpCode: string,
  ): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaTempSecret: true, mfaEnabled: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.mfaEnabled) {
      throw new BadRequestException('MFA is already enabled');
    }

    if (!user.mfaTempSecret) {
      throw new BadRequestException(
        'No MFA setup in progress. Call /auth/mfa/setup first.',
      );
    }

    const result = await verify({
      token: totpCode,
      secret: user.mfaTempSecret,
      epochTolerance: 1,
    });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    const plainBackupCodes = mfaPlainBackupCodesSchema.parse(
      this.generatePlainBackupCodes(),
    );
    const hashedBackupCodes = mfaHashedBackupCodesSchema.parse(
      await Promise.all(plainBackupCodes.map((code) => bcrypt.hash(code, 10))),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: true,
        mfaSecret: user.mfaTempSecret,
        mfaTempSecret: null,
        mfaBackupCodes: hashedBackupCodes,
      },
    });

    this.logger.log('MFA enabled', { userId });

    return { backupCodes: plainBackupCodes };
  }

  async disableMfa(userId: string, totpCode: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true, mfaSecret: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    const result = await verify({
      token: totpCode,
      secret: user.mfaSecret,
      epochTolerance: 1,
    });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        mfaEnabled: false,
        mfaSecret: null,
        mfaTempSecret: null,
        mfaBackupCodes: [],
      },
    });

    this.logger.log('MFA disabled', { userId });
  }

  async regenerateBackupCodes(
    userId: string,
    totpCode: string,
  ): Promise<{ backupCodes: string[] }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { mfaEnabled: true, mfaSecret: true },
    });

    if (!user || !user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not enabled');
    }

    const result = await verify({
      token: totpCode,
      secret: user.mfaSecret,
      epochTolerance: 1,
    });

    if (!result.valid) {
      throw new UnauthorizedException('Invalid TOTP code');
    }

    const plainBackupCodes = mfaPlainBackupCodesSchema.parse(
      this.generatePlainBackupCodes(),
    );
    const hashedBackupCodes = mfaHashedBackupCodesSchema.parse(
      await Promise.all(plainBackupCodes.map((code) => bcrypt.hash(code, 10))),
    );

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaBackupCodes: hashedBackupCodes },
    });

    return { backupCodes: plainBackupCodes };
  }

  async issueMfaChallenge(userId: string): Promise<string> {
    await this.prisma.mfaChallenge.deleteMany({ where: { userId } });

    const token = nanoid(64);
    await this.prisma.mfaChallenge.create({
      data: {
        userId,
        token,
        expiresAt: new Date(Date.now() + AUTH_CONSTANTS.MFA_CHALLENGE_TTL_MS),
      },
    });

    return token;
  }

  async verifyMfaChallenge(
    challengeToken: string,
    totpCode: string,
  ): Promise<string> {
    const challenge = await this.prisma.mfaChallenge.findUnique({
      where: { token: challengeToken },
      select: {
        id: true,
        userId: true,
        expiresAt: true,
      },
    });

    if (!challenge || challenge.expiresAt < this.clock.now()) {
      throw new UnauthorizedException(
        'MFA challenge expired or invalid. Please log in again.',
      );
    }

    // RLS-BYPASS: auth resolves users before clinic tenant context is established
    const user = await this.prisma.runUnrestricted(async () =>
      this.prisma.user.findUnique({
        where: { id: challenge.userId },
        select: {
          id: true,
          mfaEnabled: true,
          mfaSecret: true,
          mfaBackupCodes: true,
        },
      }),
    );

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (!user.mfaEnabled || !user.mfaSecret) {
      throw new BadRequestException('MFA is not configured for this user');
    }

    const verifyResult = await verify({
      token: totpCode,
      secret: user.mfaSecret,
      epochTolerance: 1,
    });
    const isTotpValid = verifyResult.valid;

    if (!isTotpValid) {
      const isBackupCode = await this.verifyAndConsumeBackupCode(
        user.id,
        totpCode,
        user.mfaBackupCodes,
      );
      if (!isBackupCode) {
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    await this.prisma.mfaChallenge.delete({ where: { id: challenge.id } });

    return user.id;
  }

  private async verifyAndConsumeBackupCode(
    userId: string,
    code: string,
    hashedCodes: string[],
  ): Promise<boolean> {
    for (let i = 0; i < hashedCodes.length; i++) {
      const matches = await bcrypt.compare(code, hashedCodes[i]);
      if (matches) {
        const remaining = [...hashedCodes];
        remaining.splice(i, 1);
        // RLS-BYPASS: auth resolves users before clinic tenant context is established
        await this.prisma.runUnrestricted(async () =>
          this.prisma.user.update({
            where: { id: userId },
            data: { mfaBackupCodes: remaining },
          }),
        );
        this.logger.warn('Backup code used', {
          userId,
          remainingCodes: remaining.length,
        });
        return true;
      }
    }
    return false;
  }

  private generatePlainBackupCodes(): string[] {
    return Array.from({ length: AUTH_CONSTANTS.MFA_BACKUP_CODE_COUNT }, () =>
      nanoid(10).toUpperCase(),
    );
  }
}
