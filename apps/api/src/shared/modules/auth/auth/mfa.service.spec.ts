import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import * as bcrypt from 'bcrypt';
import * as QRCode from 'qrcode';
import { generateSecret, generateURI, verify } from 'otplib';
import { PrismaService } from '@/prisma/prisma.service';
import { MfaService } from './mfa.service';
import { AUTH_CONSTANTS } from '@/shared/modules/config/app-constants';
import { clockPortTestProvider } from '@/test-utils';

jest.mock('bcrypt');
jest.mock('qrcode', () => ({
  toDataURL: jest.fn(),
}));
jest.mock('otplib', () => ({
  generateSecret: jest.fn(),
  generateURI: jest.fn(),
  verify: jest.fn(),
}));

/** Bcrypt-shaped hash at or above the persisted backup-code min length. */
const MOCK_BCRYPT_HASH =
  '$2b$10$abcdefghijklmnopqrstuvwx.yz012345678901234567890';

describe('MfaService', () => {
  let service: MfaService;
  let prisma: {
    user: {
      findUnique: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      update: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
    mfaChallenge: {
      deleteMany: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      create: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      findUnique: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
      delete: jest.MockedFunction<(...args: unknown[]) => Promise<unknown>>;
    };
    runUnrestricted: jest.MockedFunction<(callback: () => unknown) => unknown>;
  };
  const qrcodeToDataUrlMock = QRCode.toDataURL as jest.MockedFunction<
    (...args: unknown[]) => Promise<string>
  >;
  const generateSecretMock = generateSecret as jest.MockedFunction<
    (...args: unknown[]) => string
  >;
  const generateUriMock = generateURI as jest.MockedFunction<
    (...args: unknown[]) => string
  >;
  const verifyMock = verify as jest.MockedFunction<
    (...args: unknown[]) => Promise<{ valid: boolean }>
  >;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MfaService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              findUnique: jest.fn(),
              update: jest.fn(),
            },
            mfaChallenge: {
              deleteMany: jest.fn(),
              create: jest.fn(),
              findUnique: jest.fn(),
              delete: jest.fn(),
            },
            runUnrestricted: jest
              .fn()
              .mockImplementation((callback: unknown) =>
                (callback as () => unknown)(),
              ),
          },
        },
        clockPortTestProvider(),
      ],
    }).compile();

    service = module.get<MfaService>(MfaService);
    prisma = module.get<typeof prisma>(PrismaService);
    jest.clearAllMocks();
  });

  describe('generateSetupSecret', () => {
    it('throws when user is not found', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.generateSetupSecret('missing-user')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws when MFA is already enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        mfaEnabled: true,
      });

      await expect(service.generateSetupSecret('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('stores temporary secret and returns QR code data', async () => {
      prisma.user.findUnique.mockResolvedValue({
        email: 'test@example.com',
        mfaEnabled: false,
      });
      generateSecretMock.mockReturnValue('TEMPSECRET');
      generateUriMock.mockReturnValue('otpauth://docita/temp');
      qrcodeToDataUrlMock.mockResolvedValue('data:image/png;base64,abc');

      const result = await service.generateSetupSecret('user-1');

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { mfaTempSecret: 'TEMPSECRET' },
      });
      expect(result).toEqual({
        qrCodeUrl: 'data:image/png;base64,abc',
        manualEntryKey: 'TEMPSECRET',
      });
    });
  });

  describe('enableMfa', () => {
    it('throws when user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.enableMfa('missing-user', '123456')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws when setup is missing', async () => {
      prisma.user.findUnique.mockResolvedValue({
        mfaEnabled: false,
        mfaTempSecret: null,
      });

      await expect(service.enableMfa('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when TOTP code is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        mfaEnabled: false,
        mfaTempSecret: 'secret',
      });
      verifyMock.mockResolvedValue({ valid: false });

      await expect(service.enableMfa('user-1', 'bad-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('enables MFA and persists hashed backup codes', async () => {
      prisma.user.findUnique.mockResolvedValue({
        mfaEnabled: false,
        mfaTempSecret: 'secret',
      });
      verifyMock.mockResolvedValue({ valid: true });
      jest.mocked(bcrypt.hash).mockImplementation(async () => MOCK_BCRYPT_HASH);

      const result = await service.enableMfa('user-1', '123456');

      expect(result.backupCodes).toHaveLength(
        AUTH_CONSTANTS.MFA_BACKUP_CODE_COUNT,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          mfaEnabled: true,
          mfaSecret: 'secret',
          mfaTempSecret: null,
          mfaBackupCodes: expect.any(Array),
        },
      });
      expect(jest.mocked(bcrypt.hash)).toHaveBeenCalled();
    });
  });

  describe('disableMfa', () => {
    it('throws when MFA is not enabled', async () => {
      prisma.user.findUnique.mockResolvedValue({
        mfaEnabled: false,
        mfaSecret: null,
      });

      await expect(service.disableMfa('user-1', '123456')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws when TOTP code is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        mfaEnabled: true,
        mfaSecret: 'secret',
      });
      verifyMock.mockResolvedValue({ valid: false });

      await expect(service.disableMfa('user-1', 'bad-code')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('disables MFA and clears secrets', async () => {
      prisma.user.findUnique.mockResolvedValue({
        mfaEnabled: true,
        mfaSecret: 'secret',
      });
      verifyMock.mockResolvedValue({ valid: true });

      await expect(
        service.disableMfa('user-1', '123456'),
      ).resolves.toBeUndefined();
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: {
          mfaEnabled: false,
          mfaSecret: null,
          mfaTempSecret: null,
          mfaBackupCodes: [],
        },
      });
    });
  });

  describe('regenerateBackupCodes', () => {
    it('throws when MFA is not configured', async () => {
      prisma.user.findUnique.mockResolvedValue({
        mfaEnabled: false,
        mfaSecret: null,
      });

      await expect(
        service.regenerateBackupCodes('user-1', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when TOTP is invalid', async () => {
      prisma.user.findUnique.mockResolvedValue({
        mfaEnabled: true,
        mfaSecret: 'secret',
      });
      verifyMock.mockResolvedValue({ valid: false });

      await expect(
        service.regenerateBackupCodes('user-1', 'bad-code'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('regenerates and stores new backup codes', async () => {
      prisma.user.findUnique.mockResolvedValue({
        mfaEnabled: true,
        mfaSecret: 'secret',
      });
      verifyMock.mockResolvedValue({ valid: true });
      jest.mocked(bcrypt.hash).mockImplementation(async () => MOCK_BCRYPT_HASH);

      const result = await service.regenerateBackupCodes('user-1', '123456');

      expect(result.backupCodes).toHaveLength(
        AUTH_CONSTANTS.MFA_BACKUP_CODE_COUNT,
      );
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: { mfaBackupCodes: expect.any(Array) },
      });
    });
  });

  describe('issueMfaChallenge', () => {
    it('deletes prior challenges and creates a new one', async () => {
      prisma.mfaChallenge.deleteMany.mockResolvedValue({ count: 1 });
      prisma.mfaChallenge.create.mockResolvedValue({ id: 'challenge-1' });

      const token = await service.issueMfaChallenge('user-1');

      expect(token).toHaveLength(64);
      expect(prisma.mfaChallenge.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
      expect(prisma.mfaChallenge.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          token,
          expiresAt: expect.any(Date),
        },
      });
    });
  });

  describe('verifyMfaChallenge', () => {
    it('throws when challenge user cannot be found', async () => {
      prisma.mfaChallenge.findUnique.mockResolvedValue({
        id: 'challenge-1',
        userId: 'missing-user',
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.verifyMfaChallenge('challenge-token', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws when MFA is not configured for challenge user', async () => {
      prisma.mfaChallenge.findUnique.mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: false,
        mfaSecret: null,
        mfaBackupCodes: [],
      });

      await expect(
        service.verifyMfaChallenge('challenge-token', '123456'),
      ).rejects.toThrow(BadRequestException);
    });

    it('verifies TOTP and consumes challenge', async () => {
      prisma.mfaChallenge.findUnique.mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        mfaEnabled: true,
        mfaSecret: 'secret',
        mfaBackupCodes: [],
      });
      verifyMock.mockResolvedValue({ valid: true });

      const userId = await service.verifyMfaChallenge(
        'challenge-token',
        '123456',
      );

      expect(userId).toBe('user-1');
      expect(prisma.runUnrestricted).toHaveBeenCalled();
      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        select: {
          id: true,
          mfaEnabled: true,
          mfaSecret: true,
          mfaBackupCodes: true,
        },
      });
      expect(prisma.mfaChallenge.delete).toHaveBeenCalledWith({
        where: { id: 'challenge-1' },
      });
    });

    it('throws when challenge is missing or expired', async () => {
      prisma.mfaChallenge.findUnique.mockResolvedValue({
        id: 'challenge-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() - 60_000),
      });

      await expect(
        service.verifyMfaChallenge('challenge-token', '123456'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('accepts backup code when TOTP is invalid and consumes it', async () => {
      prisma.mfaChallenge.findUnique.mockResolvedValue({
        id: 'challenge-2',
        userId: 'user-2',
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        mfaEnabled: true,
        mfaSecret: 'secret',
        mfaBackupCodes: ['hash-code'],
      });
      verifyMock.mockResolvedValue({ valid: false });
      jest.mocked(bcrypt.compare).mockImplementation(async () => true);

      const userId = await service.verifyMfaChallenge(
        'challenge-token',
        'BACKUP10',
      );

      expect(userId).toBe('user-2');
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-2' },
        data: { mfaBackupCodes: [] },
      });
      expect(prisma.mfaChallenge.delete).toHaveBeenCalledWith({
        where: { id: 'challenge-2' },
      });
    });

    it('throws when both TOTP and backup codes are invalid', async () => {
      prisma.mfaChallenge.findUnique.mockResolvedValue({
        id: 'challenge-3',
        userId: 'user-3',
        expiresAt: new Date(Date.now() + 60_000),
      });
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-3',
        mfaEnabled: true,
        mfaSecret: 'secret',
        mfaBackupCodes: ['hash-code'],
      });
      verifyMock.mockResolvedValue({ valid: false });
      jest.mocked(bcrypt.compare).mockImplementation(async () => false);

      await expect(
        service.verifyMfaChallenge('challenge-token', 'wrong-code'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
