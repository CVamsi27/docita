import { describe, expect, it, jest } from '@jest/globals';
import { PrismaMedicalCodingRepository } from './prisma-medical-coding.repository';
import type { PrismaService } from '@/prisma/prisma.service';

describe('PrismaMedicalCodingRepository', () => {
  describe('onModuleInit', () => {
    it('prewarms medical-code caches without blocking bootstrap', () => {
      const readClient = {
        icdCode: {
          findMany: jest.fn(async () => []) as jest.Mock,
        },
        cptCode: {
          findMany: jest.fn(async () => []) as jest.Mock,
        },
      };
      const prisma = {
        getReadClient: jest.fn(() => readClient) as jest.Mock,
      } as PrismaService & {
        getReadClient: jest.Mock;
      };

      const repository = new PrismaMedicalCodingRepository(prisma);
      const result = repository.onModuleInit();

      expect(result).toBeUndefined();
      expect(prisma.getReadClient).toHaveBeenCalledTimes(2);
      expect(readClient.icdCode.findMany).toHaveBeenCalledWith({
        where: { isCommon: true },
        take: 50,
      });
      expect(readClient.cptCode.findMany).toHaveBeenCalledWith({
        where: { isCommon: true },
        take: 50,
      });
    });
  });

  describe('searchIcdCodes / searchCptCodes', () => {
    it('passes the limit to the read client', async () => {
      const icdResult = [
        { id: 'icd-1', code: 'E11.9', description: 'Type 2 diabetes' },
      ];
      const cptResult = [
        { id: 'cpt-1', code: '99213', description: 'Office visit' },
      ];
      const readClient = {
        icdCode: {
          findMany: jest.fn(async () => icdResult) as jest.Mock,
        },
        cptCode: {
          findMany: jest.fn(async () => cptResult) as jest.Mock,
        },
      };
      const prisma = {
        getReadClient: jest.fn(() => readClient) as jest.Mock,
      } as PrismaService & { getReadClient: jest.Mock };

      const repository = new PrismaMedicalCodingRepository(prisma);
      const icd = await repository.searchIcdCodes('diabetes', 5);
      const cpt = await repository.searchCptCodes('office', 5);

      expect(icd).toEqual(icdResult);
      expect(cpt).toEqual(cptResult);
      expect(readClient.icdCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
      expect(readClient.cptCode.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 }),
      );
    });
  });

  describe('addFavorite', () => {
    it('upserts the ICD code then creates a doctor favorite row', async () => {
      const icdCode = {
        upsert: jest.fn(async () => ({ id: 'icd-new' })) as jest.Mock,
      };
      const doctorFavoriteCode = {
        create: jest.fn(async () => Object.create(null)) as jest.Mock,
      };
      // The repo calls `prisma.<delegate>` directly, not via read/write clients.
      const prisma = {
        getReadClient: jest.fn(),
        getWriteClient: jest.fn(),
        icdCode,
        doctorFavoriteCode,
      } as PrismaService & {
        getReadClient: jest.Mock;
        getWriteClient: jest.Mock;
        icdCode: { upsert: jest.Mock };
        doctorFavoriteCode: { create: jest.Mock };
      };

      const repository = new PrismaMedicalCodingRepository(prisma);
      await repository.addFavorite(
        'user-1',
        'E11.9',
        'Type 2 diabetes',
        'Endocrine',
      );

      expect(icdCode.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: 'E11.9' },
          create: expect.objectContaining({ code: 'E11.9' }),
        }),
      );
      expect(doctorFavoriteCode.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', icdCodeId: 'icd-new' },
      });
    });
  });

  describe('getUncodedVisits', () => {
    it('queries appointments for the clinic with the COMPLETED + diagnoses.none filter', async () => {
      const visits = [{ id: 'visit-1', patient: { firstName: 'Ada' } }];
      const readClient = {
        appointment: {
          findMany: jest.fn(async () => visits) as jest.Mock,
        },
      };
      const prisma = {
        getReadClient: jest.fn(() => readClient) as jest.Mock,
      } as PrismaService & { getReadClient: jest.Mock };

      const repository = new PrismaMedicalCodingRepository(prisma);
      const result = await repository.getUncodedVisits('clinic-1');

      expect(result).toEqual(visits);
      expect(readClient.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            clinicId: 'clinic-1',
            status: 'COMPLETED',
            diagnoses: { none: {} },
          }),
        }),
      );
    });
  });
});
