import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { PrismaService } from '../../prisma/prisma.service';
import { Patient, Document } from '@workspace/db';

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
      clinicId: 'clinic-123',
      createdAt: new Date(),
      updatedAt: new Date(),
      gender: 'MALE',
      dateOfBirth: new Date(),
      preferredName: null,
      pronouns: null,
      address: null,
      email: null,
      medicalHistory: [],
      allergies: null,
      bloodGroup: null,
      customData: {},
      race: null,
      ethnicity: null,
      preferredLanguage: 'en',
      maritalStatus: null,
      emergencyContactName: null,
      emergencyContactPhone: null,
      emergencyContactRelation: null,
      codeStatus: 'FULL_CODE',
      codeStatusUpdatedAt: null,
      codeStatusUpdatedBy: null,
      advanceDirectiveUrl: null,
      whatsappConsent: false,
      whatsappConsentAt: null,
    },
  };

  const fullMockPatient = {
    ...mockDocument.patient,
    email: 'john@example.com',
    address: '123 Test St',
    mrn: 'MRN-123',
    status: 'ACTIVE',
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
            patient: {
              findUnique: jest.fn(),
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
        select: {
          id: true,
          patientId: true,
          name: true,
          type: true,
          url: true,
          fileSize: true,
          mimeType: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
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

      const result = await service.findOne('doc-123', 'clinic-123');

      expect(result).toEqual(mockDocument);
      expect(prismaService.document.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
        select: {
          id: true,
          patientId: true,
          name: true,
          type: true,
          url: true,
          fileSize: true,
          mimeType: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              phoneNumber: true,
              clinicId: true,
            },
          },
        },
      });
    });

    it('should throw NotFoundException if document not found', async () => {
      jest.spyOn(prismaService.document, 'findUnique').mockResolvedValue(null);

      await expect(
        service.findOne('non-existent', 'clinic-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if clinic does not match', async () => {
      jest
        .spyOn(prismaService.document, 'findUnique')
        .mockResolvedValue(mockDocument);

      await expect(service.findOne('doc-123', 'wrong-clinic')).rejects.toThrow(
        ForbiddenException,
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
        .spyOn(prismaService.patient, 'findUnique')
        .mockResolvedValue(fullMockPatient as Patient);

      jest
        .spyOn(prismaService.document, 'create')
        .mockResolvedValue(mockDocument);

      const result = await service.create(createData, 'clinic-123');

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
        select: {
          id: true,
          patientId: true,
          name: true,
          type: true,
          url: true,
          fileSize: true,
          mimeType: true,
          description: true,
          createdAt: true,
          updatedAt: true,
          patient: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });
    });

    it('should throw ForbiddenException if patient is from another clinic', async () => {
      const createData = {
        patientId: 'patient-123',
        type: 'LAB_REPORT',
        fileName: 'test-document.pdf',
        filePath: '/uploads/test-document.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
      };

      jest.spyOn(prismaService.patient, 'findUnique').mockResolvedValue({
        ...fullMockPatient,
        clinicId: 'different-clinic',
      } as Patient);

      await expect(service.create(createData, 'clinic-123')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('remove', () => {
    it('should delete a document and its file', async () => {
      jest
        .spyOn(prismaService.document, 'findUnique')
        .mockResolvedValue(mockDocument as Document);
      jest
        .spyOn(prismaService.document, 'delete')
        .mockResolvedValue(mockDocument as Document);

      const result = await service.remove('doc-123', 'clinic-123');

      expect(result).toEqual({ message: 'Document deleted successfully' });
      expect(prismaService.document.delete).toHaveBeenCalledWith({
        where: { id: 'doc-123' },
      });
    });

    it('should throw NotFoundException if document not found', async () => {
      jest.spyOn(prismaService.document, 'findUnique').mockResolvedValue(null);

      await expect(
        service.remove('non-existent', 'clinic-123'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
