import { Test, TestingModule } from '@nestjs/testing';
import { UploadsService } from './uploads.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageProvider } from './storage.provider';
import { NotFoundException } from '@nestjs/common';

describe('UploadsService', () => {
  let service: UploadsService;
  let prismaService: PrismaService;
  let storageProvider: StorageProvider;

  const mockPrismaService = {
    uploadSession: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockStorageProvider = {
    upload: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: StorageProvider, useValue: mockStorageProvider },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
    prismaService = module.get<PrismaService>(PrismaService);
    storageProvider = module.get<StorageProvider>(StorageProvider);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createSession', () => {
    it('should create an upload session with expiry', async () => {
      const mockSession = { id: 'session_123', expiresAt: new Date() };
      mockPrismaService.uploadSession.create.mockResolvedValue(mockSession);

      const result = await service.createSession();

      expect(result).toEqual(mockSession);
      expect(mockPrismaService.uploadSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          expiresAt: expect.any(Date),
        }),
      });
    });
  });

  describe('getSession', () => {
    it('should return session if found', async () => {
      const mockSession = { id: 'session_123' };
      mockPrismaService.uploadSession.findUnique.mockResolvedValue(mockSession);

      const result = await service.getSession('session_123');
      expect(result).toEqual(mockSession);
    });

    it('should throw NotFoundException if session not found', async () => {
      mockPrismaService.uploadSession.findUnique.mockResolvedValue(null);

      await expect(service.getSession('invalid_id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateSession', () => {
    it('should upload file and update session', async () => {
      const mockFile = {
        buffer: Buffer.from('test'),
        originalname: 'test.pdf',
      };
      const mockUrl = 'https://storage.com/test.pdf';
      const mockUpdatedSession = {
        id: 'session_123',
        status: 'uploaded',
        fileUrl: mockUrl,
      };

      mockStorageProvider.upload.mockResolvedValue(mockUrl);
      mockPrismaService.uploadSession.update.mockResolvedValue(
        mockUpdatedSession,
      );

      const result = await service.updateSession(
        'session_123',
        mockFile as any,
      );

      expect(storageProvider.upload).toHaveBeenCalledWith(
        mockFile,
        'documents',
      );
      expect(mockPrismaService.uploadSession.update).toHaveBeenCalledWith({
        where: { id: 'session_123' },
        data: {
          status: 'uploaded',
          fileUrl: mockUrl,
        },
      });
      expect(result).toEqual(mockUpdatedSession);
    });
  });
});
