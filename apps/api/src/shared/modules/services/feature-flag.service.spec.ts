import { describe, expect, it, jest } from '@jest/globals';
import { FeatureFlagService } from './feature-flag.service';
import type { PrismaService } from '@/prisma/prisma.service';
import { createFixedClockMock } from '@/test-utils';

describe('FeatureFlagService.onModuleInit', () => {
  it('starts feature-flag seeding without blocking bootstrap', () => {
    const prisma = {
      featureFlag: {
        findMany: jest.fn(async () => []),
        findFirst: jest.fn(async () => null),
        create: jest.fn(async () => ({})),
        update: jest.fn(async () => ({})),
        createMany: jest.fn(async () => ({ count: 0 })),
      },
    } as unknown as PrismaService;

    const service = new FeatureFlagService(prisma, createFixedClockMock());
    const result = service.onModuleInit();

    expect(result).toBeUndefined();
  });
});
