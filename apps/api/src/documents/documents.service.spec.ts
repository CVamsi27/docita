import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../prisma/prisma.service';

jest.mock('fs/promises', () => ({
  unlink: jest.fn().mockResolvedValue(undefined),
}));

describe('DocumentsService', () => {
  let service: DocumentsService;
  let prismaService: PrismaService;

  const mockDocument = {
    id: 'doc-123',
    patientId: 'patient-123',
    name: 'test-document.pdf',
    type: 'LAB_REPORT',
    url: '/uploads/test-document.pdf',
    fileSize: 1024,
    mimeType: 'application/pdf',
    description: 'Lab test results',
    createdAt: new Date(),
    updatedAt: new Date(),
    patient: {
      id: 'patient-123',
      firstName: 'John',
      lastName: 'Doe',
      phoneNumber: '1234567890',
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DocumentsService,
        {
          provide: PrismaService,
          useValue: {
            document: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<DocumentsService>(DocumentsService);
    prismaService = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return documents for a clinic', async () => {
      jest
        .spyOn(prismaService.document, 'findMany')
        .mockResolvedValue([mockDocument]);

      const result = await service.findAll('clinic-123');

      expect(result).toEqual([mockDocument]);
      expect(prismaService.document.findMany).toHaveBeenCalledWith({
        where: { patient: { clinicId: 'clinic-123' } },
        select: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array if no clinicId provided', async () => {
      const result = await service.findAll('');

      expect(result).toEqual([]);
      expect(prismaService.document.findMany).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return a document by id', async () => {
      jest
        .spyOn(prismaService.document, 'findUnique')
        .mockResolvedValue(mockDocument);

      const result = await service.findOne('doc-123');

      expect(result).toEqual(mockDocument);
      expect(prismaService.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        select: expect.any(Object),
      });
    });

    it('should throw NotFoundException if document not found', async () => {
      jest.spyOn(prismaService.document, 'findUnique').mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create a document', async () => {
      const createData = {
        patientId: 'patient-123',
        type: 'LAB_REPORT',
        fileName: 'test-document.pdf',
        filePath: '/uploads/test-document.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        description: 'Lab test results',
      };

      jest
        .spyOn(prismaService.document, 'create')
        .mockResolvedValue(mockDocument);

      const result = await service.create(createData);

      expect(result).toEqual(mockDocument);
      expect(prismaService.document.create).toHaveBeenCalledWith({
        data: {
          patientId: createData.patientId,
          type: createData.type,
          name: createData.fileName,
          url: createData.filePath,
          fileSize: createData.fileSize,
          mimeType: createData.mimeType,
          description: createData.description,
        },
        select: expect.any(Object),
      });
    });
  });

  describe('remove', () => {
    it('should delete a document and its file', async () => {
      jest
        .spyOn(prismaService.document, 'findUnique')
        .mockResolvedValue(mockDocument);
      jest
        .spyOn(prismaService.document, 'delete')
        .mockResolvedValue(mockDocument);

      const result = await service.remove('doc-123');

      expect(result).toEqual({ message: 'Document deleted successfully' });
      expect(prismaService.document.delete).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
      });
    });

    it('should throw NotFoundException if document not found', async () => {
      jest.spyOn(prismaService.document, 'findUnique').mockResolvedValue(null);

      await expect(service.remove('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
