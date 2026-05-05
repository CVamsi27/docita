import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ClinicTier, IntelligenceAddon } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import { SettingsFactory } from '@/domains/clinics/core/factories/settings.factory';
import { AuditService } from '@/shared/modules/audit/audit/audit.service';
import { ClinicSettingsService } from './clinic-settings.service';
import { ClinicDataService } from './clinic-data.service';

describe('ClinicSettingsService', () => {
  let service: ClinicSettingsService;
  let clinicSnapshot: {
    tier: ClinicTier;
    intelligenceAddon: IntelligenceAddon;
    features: Record<string, never>;
  };

  const findUniqueMock = jest.fn(
    (args: {
      select?: {
        tier?: boolean;
        settings?: boolean;
        intelligenceAddon?: boolean;
        features?: boolean;
      };
    }) => {
      const s = args.select;
      if (s?.settings === true && s.tier !== true) {
        return Promise.resolve({ settings: {} });
      }
      if (s?.tier === true) {
        return Promise.resolve(clinicSnapshot);
      }
      return Promise.resolve(null);
    },
  );
  const updateMock = jest.fn(() => Promise.resolve({ id: 'clinic-1' }));

  const prisma = {
    clinic: {
      findUnique: findUniqueMock,
      update: updateMock,
    },
  } as unknown as PrismaService;

  const settingsFactory = {
    partialValidate: jest.fn((v: unknown) => v),
  };
  const auditService = {};

  const clinicDataService = {
    findOne: jest.fn(async () => ({
      id: 'clinic-1',
      workspaceProfile: 'FULL_CLINICAL',
    })),
  } as unknown as Pick<ClinicDataService, 'findOne'>;

  beforeEach(async () => {
    findUniqueMock.mockClear();
    updateMock.mockClear();

    clinicSnapshot = {
      tier: ClinicTier.STARTER,
      intelligenceAddon: IntelligenceAddon.NONE,
      features: {},
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        ClinicSettingsService,
        { provide: PrismaService, useValue: prisma },
        { provide: SettingsFactory, useValue: settingsFactory },
        { provide: AuditService, useValue: auditService },
        { provide: ClinicDataService, useValue: clinicDataService },
      ],
    }).compile();

    service = moduleRef.get(ClinicSettingsService);
  });

  it('rejects WhatsApp-related settings when clinic tier is STARTER', async () => {
    await expect(
      service.updateSettings('clinic-1', {
        whatsappAppointmentReminders: true,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(updateMock).not.toHaveBeenCalled();
  });

  it('allows WhatsApp-related settings when clinic tier is ESSENTIAL', async () => {
    clinicSnapshot = {
      tier: ClinicTier.ESSENTIAL,
      intelligenceAddon: IntelligenceAddon.NONE,
      features: {},
    };

    await service.updateSettings('clinic-1', {
      whatsappAppointmentReminders: false,
    });

    expect(updateMock).toHaveBeenCalled();
  });

  it('does not load tier gate when payload has only starter-safe fields', async () => {
    await service.updateSettings('clinic-1', {
      pushNotifications: true,
    });

    expect(findUniqueMock).toHaveBeenCalledTimes(1);
    expect(findUniqueMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'clinic-1' },
        select: { settings: true },
      }),
    );
    expect(updateMock).toHaveBeenCalled();
  });
});
