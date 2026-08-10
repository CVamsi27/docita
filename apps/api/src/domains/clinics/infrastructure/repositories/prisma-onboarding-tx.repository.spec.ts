import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaOnboardingTxRepository } from './prisma-onboarding-tx.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaOnboardingTxRepository', () => {
  const prismaMock: Record<string, Record<string, jest.Mock<AnyAsync>>> = {

  };

  let repository: PrismaOnboardingTxRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }
    repository = new PrismaOnboardingTxRepository();
  });

  it('constructs without throwing', () => {
    expect(repository).toBeDefined();
  });
});
