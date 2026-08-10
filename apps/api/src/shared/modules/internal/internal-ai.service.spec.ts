import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { InternalAiService } from './internal-ai.service';
import type { PrismaService } from '@/prisma/prisma.service';

describe('InternalAiService', () => {
  let service: InternalAiService;
  let prisma: { clinic: { findUnique: jest.Mock<(args: unknown) => Promise<unknown>>; update: jest.Mock<(args: unknown) => Promise<unknown>> } };

  beforeEach(() => {
    prisma = { clinic: { findUnique: jest.fn(), update: jest.fn() } };
    service = new InternalAiService(prisma as unknown as PrismaService);
  });

  it('getClinicAIFeatures returns AI state for the clinic', async () => {
    prisma.clinic.findUnique.mockResolvedValueOnce({
      id: 'clinic-1',
      name: 'Acme',
      tier: 'PROFESSIONAL',
      intelligenceAddon: 'ACTIVE',
      features: { predictiveAnalytics: true },
    });

    const result = await service.getClinicAIFeatures('clinic-1');

    expect(result.aiEnabled).toBe(true);
    expect(result.clinicId).toBe('clinic-1');
    expect((result.features as { predictiveAnalytics: boolean }).predictiveAnalytics).toBe(true);
  });

  it('getClinicAIFeatures throws when the clinic is missing', async () => {
    prisma.clinic.findUnique.mockResolvedValueOnce(null);

    await expect(service.getClinicAIFeatures('missing')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('updateClinicAIFeatures sets intelligenceAddon to ACTIVE when enabled=true', async () => {
    prisma.clinic.findUnique.mockResolvedValueOnce({ id: 'clinic-1', features: {} });
    prisma.clinic.update.mockResolvedValueOnce({
      id: 'clinic-1',
      intelligenceAddon: 'ACTIVE',
    });

    await service.updateClinicAIFeatures('clinic-1', {
      enabled: true,
      features: { predictiveAnalytics: true },
    });

    expect(prisma.clinic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'clinic-1' },
        data: expect.objectContaining({
          intelligenceAddon: 'ACTIVE',
          features: { predictiveAnalytics: true },
        }),
      }),
    );
  });

  it('updateClinicAIFeatures disables the addon when enabled=false', async () => {
    prisma.clinic.findUnique.mockResolvedValueOnce({
      id: 'clinic-1',
      features: { predictiveAnalytics: true },
    });
    prisma.clinic.update.mockResolvedValueOnce({
      id: 'clinic-1',
      intelligenceAddon: 'NONE',
    });

    await service.updateClinicAIFeatures('clinic-1', { enabled: false });

    expect(prisma.clinic.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ intelligenceAddon: 'NONE' }),
      }),
    );
  });
});
