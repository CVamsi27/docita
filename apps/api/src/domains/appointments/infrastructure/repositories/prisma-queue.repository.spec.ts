import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaQueueRepository } from './prisma-queue.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaQueueRepository', () => {
  const prismaMock: Record<string, Record<string, jest.Mock<AnyAsync>>> = {
    queueToken: {
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

  let repository: PrismaQueueRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }
    repository = new PrismaQueueRepository(prismaService as never);
  });

  it('constructs without throwing', () => {
    expect(repository).toBeDefined();
  });
});
