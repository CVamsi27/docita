import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaClinicMembershipRepository } from './prisma-clinic-membership.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaClinicMembershipRepository', () => {
  const prismaMock: Record<string, Record<string, jest.Mock<AnyAsync>>> = {

  };

  let repository: PrismaClinicMembershipRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }
    repository = new PrismaClinicMembershipRepository(prismaService as never);
  });

  it('constructs without throwing', () => {
    expect(repository).toBeDefined();
  });
});
