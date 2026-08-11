import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaAnalyticsRepository } from './prisma-analytics.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaAnalyticsRepository', () => {
  const prismaMock: Record<string, Record<string, jest.Mock<AnyAsync>>> = {};

  let repository: PrismaAnalyticsRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }
    repository = new PrismaAnalyticsRepository(prismaService as never);
  });

  it('constructs without throwing', () => {
    expect(repository).toBeDefined();
  });
});
