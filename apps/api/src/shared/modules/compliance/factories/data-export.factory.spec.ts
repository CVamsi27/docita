import { Test, TestingModule } from '@nestjs/testing';
import { DataExportFactory } from './data-export.factory';
import { PrismaService } from '@/prisma/prisma.service';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';
import { clockPortTestProvider } from '@/test-utils';

describe('DataExportFactory', () => {
  let factory: DataExportFactory;
  let prisma: {
    patient: {
      findUnique: ReturnType<typeof jest.fn>;
    };
  };

  const mockPrismaService = {
    patient: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DataExportFactory,
        { provide: PrismaService, useValue: mockPrismaService },
        clockPortTestProvider(),
      ],
    }).compile();

    factory = module.get<DataExportFactory>(DataExportFactory);
    prisma = module.get(PrismaService) as typeof prisma;
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  it('should export patient data', async () => {
    const mockPatient = { id: 'patient-1', firstName: 'John' };
    prisma.patient.findUnique.mockImplementation(async () => mockPatient);

    const result = await factory.exportPatientData('patient-1');

    expect(result.format).toBe('JSON');
    expect(result.patient).toEqual(mockPatient);
    expect(prisma.patient.findUnique).toHaveBeenCalled();
  });
});
