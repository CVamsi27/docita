import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SignatureUploadService } from './signature-upload.service';
import { SIGNATURE_UPLOAD_REPOSITORY_TOKEN } from '@/domains/doctors/core/repositories/signature-upload.repository.interface';
import { StorageProvider } from '@/domains/documents/infrastructure/storage.provider';
import { StoredFileUrlResolverService } from '@/domains/documents/application/services/stored-file-url-resolver.service';
import { SignaturePurpose } from '@workspace/db';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('SignatureUploadService', () => {
  let service: SignatureUploadService;
  let repository: Record<
    string,
    jest.Mock<(...args: unknown[]) => Promise<unknown>>
  >;

  const mockDoctor = {
    id: 'doctor-1',
    role: 'DOCTOR',
    name: 'Dr. Smith',
    email: 'dr.smith@test.com',
  };

  const mockToken = {
    id: 'token-id-1',
    doctorId: 'doctor-1',
    clinicId: null,
    token: 'abc123',
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    used: false,
    usedAt: null,
    purpose: SignaturePurpose.DOCTOR_PRESCRIPTION,
    createdAt: new Date(),
    updatedAt: new Date(),
    doctor: mockDoctor,
    clinic: null,
  };

  beforeEach(async () => {
    repository = {
      findUserById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findClinicById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      createUploadToken: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findTokenByValue: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findTokenById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findClinicTokenById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findActiveTokensByDoctor:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      findActiveTokensByClinic:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      markTokenUsed: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      markTokenUsedById: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateDoctorSignature:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
      updateClinicSignature:
        jest.fn<(...args: unknown[]) => Promise<unknown>>(),
    };

    const storedFileUrlResolver: Pick<
      StoredFileUrlResolverService,
      'resolveWithStoredUrl'
    > = {
      resolveWithStoredUrl: jest
        .fn<StoredFileUrlResolverService['resolveWithStoredUrl']>()
        .mockImplementation(async (url) => ({
          url: url ?? null,
          storedUrl: url ?? null,
        })),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SignatureUploadService,
        {
          provide: SIGNATURE_UPLOAD_REPOSITORY_TOKEN,
          useValue: repository,
        },
        {
          provide: StorageProvider,
          useValue: {
            upload: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
            delete: jest.fn<(...args: unknown[]) => Promise<unknown>>(),
          },
        },
        {
          provide: StoredFileUrlResolverService,
          useValue: storedFileUrlResolver,
        },
      ],
    }).compile();

    service = module.get<SignatureUploadService>(SignatureUploadService);
  });

  describe('generateUploadToken', () => {
    it('generates a token for a doctor', async () => {
      repository.findUserById.mockResolvedValue(mockDoctor);
      repository.createUploadToken.mockResolvedValue(mockToken);

      const result = await service.generateUploadToken('doctor-1');

      expect(repository.createUploadToken).toHaveBeenCalled();
      expect(result.token).toBe('abc123');
    });

    it('throws NotFoundException when doctor not found', async () => {
      repository.findUserById.mockResolvedValue(null);

      await expect(service.generateUploadToken('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when non-doctor tries to upload prescription signature', async () => {
      repository.findUserById.mockResolvedValue({
        ...mockDoctor,
        role: 'RECEPTIONIST',
      });

      await expect(service.generateUploadToken('user-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateToken', () => {
    it('validates a valid token', async () => {
      repository.findTokenByValue.mockResolvedValue(mockToken);

      const result = await service.validateToken('abc123');
      expect(result.tokenId).toBe('token-id-1');
    });

    it('throws NotFoundException for unknown token', async () => {
      repository.findTokenByValue.mockResolvedValue(null);

      await expect(service.validateToken('invalid')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException for already used token', async () => {
      repository.findTokenByValue.mockResolvedValue({
        ...mockToken,
        used: true,
      });

      await expect(service.validateToken('abc123')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException for expired token', async () => {
      repository.findTokenByValue.mockResolvedValue({
        ...mockToken,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.validateToken('abc123')).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
