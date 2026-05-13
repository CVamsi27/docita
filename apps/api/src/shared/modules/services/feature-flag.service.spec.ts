import { describe, expect, it, jest } from '@jest/globals';
import { FeatureFlagService } from './feature-flag.service';
import type { PrismaService } from '@/prisma/prisma.service';

describe('FeatureFlagService.onModuleInit', () => {
  it('starts feature-flag seeding without blocking bootstrap', () => {
    const prisma = {
      featureFlag: {
        findFirst: jest.fn(async () => null) as jest.Mock,
        create: jest.fn(async () => ({})) as jest.Mock,
        update: jest.fn(async () => ({})) as jest.Mock,
      },
    } as PrismaService & {
      featureFlag: {
        findFirst: jest.Mock;
        create: jest.Mock;
        update: jest.Mock;
      };
    };

    const service = new FeatureFlagService(prisma);
    const result = service.onModuleInit();

    expect(result).toBeUndefined();
    expect(prisma.featureFlag.findFirst).toHaveBeenCalledWith({
      where: { key: 'enable_whatsapp_reminders', clinicId: null },
    });
  });
});
