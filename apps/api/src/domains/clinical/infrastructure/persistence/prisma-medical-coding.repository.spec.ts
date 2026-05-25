import { describe, expect, it, jest } from '@jest/globals';
import { PrismaMedicalCodingRepository } from './prisma-medical-coding.repository';
import type { PrismaService } from '@/prisma/prisma.service';

describe('PrismaMedicalCodingRepository.onModuleInit', () => {
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
