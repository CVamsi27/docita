import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClinicDataRepository } from './prisma-clinic-data.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaClinicDataRepository', () => {
  const prismaMock: Record<string, Record<string, jest.Mock<AnyAsync>>> = {

  };

  let repository: PrismaClinicDataRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }
    repository = new PrismaClinicDataRepository(prismaService as never, {} as never);
  });

  it('constructs without throwing', () => {
    expect(repository).toBeDefined();
  });
});
