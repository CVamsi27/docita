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

  it('falls back to the config default when the DB lookup fails, so known features stay enabled', async () => {
    const prisma = {
      featureFlag: {
        findMany: jest.fn(async () => []),
        findFirst: jest
          .fn<(args: unknown) => Promise<unknown>>()
          .mockRejectedValueOnce(new Error('connection refused')),
        create: jest.fn(async () => ({})),
        update: jest.fn(async () => ({})),
        createMany: jest.fn(async () => ({ count: 0 })),
      },
    } as unknown as PrismaService;

    const service = new FeatureFlagService(prisma, createFixedClockMock());

    // enable_whatsapp_reminders has defaultValue: true — a DB outage must not
    // silently flip it to false (which would hide the feature from the UI).
    const enabled = await service.isEnabled('enable_whatsapp_reminders');
    expect(enabled).toBe(true);
  });

  it('falls back to false for an unknown key when the DB lookup fails', async () => {
    const prisma = {
      featureFlag: {
        findMany: jest.fn(async () => []),
        findFirst: jest
          .fn<(args: unknown) => Promise<unknown>>()
          .mockRejectedValueOnce(new Error('connection refused')),
        create: jest.fn(async () => ({})),
        update: jest.fn(async () => ({})),
        createMany: jest.fn(async () => ({ count: 0 })),
      },
    } as unknown as PrismaService;

    const service = new FeatureFlagService(prisma, createFixedClockMock());

    expect(await service.isEnabled('unknown_flag')).toBe(false);
  });
});
