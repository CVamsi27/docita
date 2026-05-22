import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { UploadsService } from './uploads.service';
import { UploadsCommandService } from './uploads-command.service';
import { UploadsQueryService } from './uploads-query.service';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import {
  DOCUMENT_PERSISTENCE_PORT,
  type DocumentPersistencePort,
} from '@/domains/documents/application/ports/document-persistence.port';
import {
  StorageProvider,
  type StorageFile,
} from '@/domains/documents/application/ports/storage-provider.port';
import { UploadSessionPurpose } from '@workspace/db';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

function hashUploadSecret(plaintext: string): string {
  return createHash('sha256').update(plaintext, 'utf8').digest('hex');
}

describe('UploadsService', () => {
  let service: UploadsService;
  let prisma: {
    uploadSession: {
      create: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      findFirst: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
      updateMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
    user: {
      updateMany: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
    };
  };
  let storageUpload: jest.Mock<(...args: unknown[]) => Promise<unknown>>;

  beforeEach(async () => {
    storageUpload = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue('/stored/doc.png');

    prisma = {
      uploadSession: {
        create: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        findFirst: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
        updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
      user: {
        updateMany: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      },
    };

    prisma.uploadSession.create.mockImplementation(async (args: unknown) => {
      const { data } = args as { data: Record<string, unknown> };
      return {
        id: 'sess-new',
        status: 'pending',
        fileUrl: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...data,
      };
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsCommandService,
        UploadsQueryService,
        UploadsService,
        { provide: DOCUMENT_PERSISTENCE_PORT, useValue: prisma },
        {
          provide: StorageProvider,
          useValue: {
            upload: storageUpload,
            delete: jest.fn(),
          },
        },
        {
          provide: CLOCK_PORT,
          useValue: { now: () => new Date('2026-04-01T12:00:00.000Z') },
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
  });

  describe('createSession', () => {
    it('stores uploadSecretHash and returns plaintext uploadSecret', async () => {
      const result = await service.createSession({ expiresInMinutes: 10 });

      expect(typeof result.uploadSecret).toBe('string');
      expect(result.uploadSecret.length).toBeGreaterThan(20);

      const createArg = prisma.uploadSession.create.mock.calls[0][0] as {
        data: { uploadSecretHash: string };
      };
      expect(createArg.data.uploadSecretHash).toBe(
        hashUploadSecret(result.uploadSecret),
      );
    });
  });

  describe('updateSession', () => {
    const plaintext = 'opaque-upload-secret';
    const sessionRow = {
      id: 'sess-1',
      uploadSecretHash: hashUploadSecret(plaintext),
      status: 'pending',
      fileUrl: null,
      expiresAt: new Date(Date.now() + 60_000),
      purpose: UploadSessionPurpose.GENERAL,
      doctorId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const file: StorageFile = {
      fieldname: 'file',
      originalname: 'x.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 10,
      buffer: Buffer.from('x'),
    };

    it('uploads when uploadSecret matches', async () => {
      let findCalls = 0;
      prisma.uploadSession.findFirst.mockImplementation(async () => {
        findCalls++;
        if (findCalls === 1) return { ...sessionRow };
        return {
          id: sessionRow.id,
          status: 'uploaded',
          fileUrl: '/stored/doc.png',
          purpose: sessionRow.purpose,
          doctorId: sessionRow.doctorId,
          createdAt: sessionRow.createdAt,
          expiresAt: sessionRow.expiresAt,
        };
      });
      prisma.uploadSession.updateMany.mockResolvedValue({ count: 1 });

      const out = await service.updateSession(sessionRow.id, file, {
        uploadSecret: plaintext,
      });

      expect(out.status).toBe('uploaded');
      expect(storageUpload).toHaveBeenCalled();
    });

    it('throws Unauthorized when uploadSecret is missing', async () => {
      prisma.uploadSession.findFirst.mockResolvedValue({ ...sessionRow });

      await expect(
        service.updateSession(sessionRow.id, file, {}),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws Unauthorized when uploadSecret is wrong', async () => {
      prisma.uploadSession.findFirst.mockResolvedValue({ ...sessionRow });

      await expect(
        service.updateSession(sessionRow.id, file, {
          uploadSecret: 'wrong',
        }),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('throws BadRequest when session has no secret hash', async () => {
      prisma.uploadSession.findFirst.mockResolvedValue({
        ...sessionRow,
        uploadSecretHash: null,
      });

      await expect(
        service.updateSession(sessionRow.id, file, {
          uploadSecret: plaintext,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws NotFound when session is missing', async () => {
      prisma.uploadSession.findFirst.mockResolvedValue(null);

      await expect(
        service.updateSession('missing', file, { uploadSecret: 'x' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('assertReadyForUpload', () => {
    const plaintext = 'opaque-upload-secret';
    const sessionRow = {
      id: 'sess-1',
      uploadSecretHash: hashUploadSecret(plaintext),
      status: 'pending',
      fileUrl: null,
      expiresAt: new Date(Date.now() + 60_000),
      purpose: UploadSessionPurpose.GENERAL,
      doctorId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('resolves when id and secret are valid', async () => {
      prisma.uploadSession.findFirst.mockResolvedValue({ ...sessionRow });

      await expect(
        service.assertReadyForUpload(sessionRow.id, plaintext),
      ).resolves.toBeUndefined();
    });

    it('throws NotFound when session is missing', async () => {
      prisma.uploadSession.findFirst.mockResolvedValue(null);

      await expect(
        service.assertReadyForUpload('missing', plaintext),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws Unauthorized when secret is wrong', async () => {
      prisma.uploadSession.findFirst.mockResolvedValue({ ...sessionRow });

      await expect(
        service.assertReadyForUpload(sessionRow.id, 'wrong'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });
  });
});
