import { Test, TestingModule } from '@nestjs/testing';
import { PrescriptionTemplatesService } from './prescription-templates.service';
import { PrismaService } from '@/prisma/prisma.service';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('PrescriptionTemplatesService', () => {
  let service: PrescriptionTemplatesService;
  let prismaService: PrismaService;

  const mockTemplate = {
    id: 'template-123',
    name: 'Standard Fever',
    medications: [
      {
        name: 'Paracetamol',
        dosage: '500mg',
        frequency: 'TID',
        duration: '3 days',
      },
    ],
    instructions: 'Rest and fluids',
    userId: 'user-123',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PrescriptionTemplatesService,
        {
          provide: PrismaService,
          useValue: {
            prescriptionTemplate: {
              findMany: jest.fn(),
              findUnique: jest.fn(),
              create: jest.fn(),
              update: jest.fn(),
              delete: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<PrescriptionTemplatesService>(
      PrescriptionTemplatesService,
    );
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return templates for a user', async () => {
      jest
        .spyOn(prismaService.prescriptionTemplate, 'findMany')
        .mockResolvedValue([mockTemplate] as never);

      const result = await service.findAll('user-123');
      expect(result).toEqual([mockTemplate]);
      expect(prismaService.prescriptionTemplate.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });
    });
  });

  describe('create', () => {
    it('should create a template', async () => {
      jest
        .spyOn(prismaService.prescriptionTemplate, 'create')
        .mockResolvedValue(mockTemplate as never);

      const createData = {
        name: 'Standard Fever',
        medications: mockTemplate.medications,
        instructions: mockTemplate.instructions,
      };

      const result = await service.create('user-123', createData);
      expect(result).toEqual(mockTemplate);
      expect(prismaService.prescriptionTemplate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          name: 'Standard Fever',
        }),
      });
    });
  });
});
