import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaUsageRepository } from './prisma-usage.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaUsageRepository', () => {
  const prismaMock: Record<string, Record<string, jest.Mock<AnyAsync>>> = {
    clinic: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
    subscription: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
    clinicAddOn: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
    usageEvent: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
    usageRecord: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
    appointment: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
    user: {
      findFirst: jest.fn<AnyAsync>(),
      findMany: jest.fn<AnyAsync>(),
      findUnique: jest.fn<AnyAsync>(),
      create: jest.fn<AnyAsync>(),
      createMany: jest.fn<AnyAsync>(),
      update: jest.fn<AnyAsync>(),
      updateMany: jest.fn<AnyAsync>(),
      upsert: jest.fn<AnyAsync>(),
      delete: jest.fn<AnyAsync>(),
      deleteMany: jest.fn<AnyAsync>(),
      count: jest.fn<AnyAsync>(),
      aggregate: jest.fn<AnyAsync>(),
    },
  };

  let repository: PrismaUsageRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }
    repository = new PrismaUsageRepository(prismaService as never);
  });

  it('constructs without throwing', () => {
    expect(repository).toBeDefined();
  });
});
