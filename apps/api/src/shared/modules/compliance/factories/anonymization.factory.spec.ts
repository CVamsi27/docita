import { Test, TestingModule } from '@nestjs/testing';
import { AnonymizationFactory } from './anonymization.factory';
import { PrismaService } from '@/prisma/prisma.service';
import { ANONYMIZATION_PERSISTENCE_PORT } from '../ports/anonymization.persistence.port';
import { beforeEach, describe, it, expect, jest } from '@jest/globals';

describe('AnonymizationFactory', () => {
  let factory: AnonymizationFactory;
  let prisma: PrismaService;

  const mockPrismaService = {
    patient: {
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnonymizationFactory,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ANONYMIZATION_PERSISTENCE_PORT, useExisting: PrismaService },
      ],
    }).compile();

    factory = module.get<AnonymizationFactory>(AnonymizationFactory);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(factory).toBeDefined();
  });

  it('should anonymize patient', async () => {
    await factory.anonymizePatient('patient-1');
    expect(prisma.patient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'patient-1' },
        data: expect.objectContaining({
          firstName: 'Anonymous',
          lastName: 'Patient',
        }),
      }),
    );
  });
});
