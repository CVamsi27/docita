import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { PrismaWhatsAppRepository } from './prisma-whatsapp.repository';
import { PrismaService } from '@/prisma/prisma.service';

type AnyAsync = (...args: unknown[]) => Promise<unknown>;

describe('PrismaWhatsAppRepository', () => {
  const prismaMock: Record<string, Record<string, jest.Mock<AnyAsync>>> = {

  };

  let repository: PrismaWhatsAppRepository;

  beforeEach(() => {
    jest.clearAllMocks();
    const prismaService = Object.create(
      PrismaService.prototype,
    ) as PrismaService;
    for (const [key, value] of Object.entries(prismaMock)) {
      Object.defineProperty(prismaService, key, { value, writable: true });
    }
    repository = new PrismaWhatsAppRepository(prismaService as never, {} as never);
  });

  it('constructs without throwing', () => {
    expect(repository).toBeDefined();
  });
});
