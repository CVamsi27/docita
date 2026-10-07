import { Test, TestingModule } from '@nestjs/testing';
import { Logger } from '@nestjs/common';
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
  let storageDelete: jest.Mock<(...args: unknown[]) => Promise<unknown>>;

  beforeEach(async () => {
    storageUpload = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue('/stored/doc.png');
    storageDelete = jest
      .fn<(...args: unknown[]) => Promise<unknown>>()
      .mockResolvedValue(undefined);

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
            delete: storageDelete,
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

    it('rejects a lost single-use claim and removes its uploaded object', async () => {
      prisma.uploadSession.findFirst
        .mockResolvedValueOnce({ ...sessionRow })
        .mockResolvedValueOnce({ id: sessionRow.id });
      // The conditional claim matched no row: a concurrent request already
      // published this session's file.
      prisma.uploadSession.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateSession(sessionRow.id, file, {
          uploadSecret: plaintext,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(storageUpload).toHaveBeenCalled();
      expect(storageDelete).toHaveBeenCalledWith('/stored/doc.png');
    });

    // D01: the object is unreferenced between the upload and the commit of
    // the claim. A claim write that *throws* (lost connection, timeout) used
    // to leave the uploaded document in storage with nothing pointing at it.
    it('removes the uploaded object when the claim write itself fails', async () => {
      prisma.uploadSession.findFirst.mockResolvedValue({ ...sessionRow });
      prisma.uploadSession.updateMany.mockRejectedValue(
        new Error('connection terminated unexpectedly'),
      );

      await expect(
        service.updateSession(sessionRow.id, file, {
          uploadSecret: plaintext,
        }),
      ).rejects.toThrow('connection terminated unexpectedly');

      expect(storageUpload).toHaveBeenCalled();
      expect(storageDelete).toHaveBeenCalledWith('/stored/doc.png');
    });

    it('deletes the object exactly once when the claim is lost', async () => {
      prisma.uploadSession.findFirst
        .mockResolvedValueOnce({ ...sessionRow })
        .mockResolvedValueOnce({ id: sessionRow.id });
      prisma.uploadSession.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.updateSession(sessionRow.id, file, {
          uploadSecret: plaintext,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(storageDelete).toHaveBeenCalledTimes(1);
    });

    it('surfaces a failed delete instead of swallowing it', async () => {
      prisma.uploadSession.findFirst.mockResolvedValue({ ...sessionRow });
      prisma.uploadSession.updateMany.mockRejectedValue(new Error('db down'));
      storageDelete.mockRejectedValue(new Error('storage unreachable'));
      const warn = jest
        .spyOn(Logger.prototype, 'warn')
        .mockImplementation(() => undefined);

      try {
        // The original persistence failure is what the caller sees; the failed
        // delete is logged and left to orphan reconciliation.
        await expect(
          service.updateSession(sessionRow.id, file, {
            uploadSecret: plaintext,
          }),
        ).rejects.toThrow('db down');

        expect(storageDelete).toHaveBeenCalledWith('/stored/doc.png');
        // A cleanup that cannot complete must never be swallowed silently —
        // it is the only signal that an object is now orphaned.
        expect(warn).toHaveBeenCalledWith(
          expect.stringContaining('storage unreachable'),
        );
      } finally {
        warn.mockRestore();
      }
    });

    it('does not delete a published object when a later step fails', async () => {
      // A doctor-signature session is what runs the post-claim user write.
      const signatureSession = {
        ...sessionRow,
        purpose: UploadSessionPurpose.DOCTOR_SIGNATURE,
        doctorId: 'doctor-1',
      };
      prisma.uploadSession.findFirst
        .mockResolvedValueOnce(signatureSession)
        .mockResolvedValueOnce({ ...signatureSession, status: 'uploaded' });
      prisma.uploadSession.updateMany.mockResolvedValue({ count: 1 });
      // The session row now references the file, so a later failure must not
      // delete it — that would leave a dangling fileUrl pointing at nothing.
      prisma.user.updateMany.mockRejectedValue(new Error('user write failed'));

      await expect(
        service.updateSession(sessionRow.id, file, {
          uploadSecret: plaintext,
        }),
      ).rejects.toThrow('user write failed');

      expect(storageDelete).not.toHaveBeenCalled();
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
