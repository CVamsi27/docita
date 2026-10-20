import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { OnboardingDataService } from './onboarding-data.service';
import { onboardingInitResponseSchema } from '@workspace/types';
import { OnboardingInitResponseDto } from '@/domains/clinics/application/dto/onboarding/onboarding-response.dto';
import { OnboardingStep } from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import type { ClinicPersistencePort } from '@/domains/clinics/application/ports/clinic-persistence.port';
import type { IClock } from '@/shared/common/ports/clock.port';

describe('OnboardingDataService', () => {
  const now = new Date('2026-05-27T10:00:00.000Z');
  const rows = new Map<string, Record<string, unknown>>();
  const clock: IClock = { now: () => now };
  const persistence = {
    onboardingSession: {
      create: jest.fn(async ({ data }: { data: Record<string, unknown> }) => {
        rows.set(String(data.id), {
          ...data,
          createdAt: now,
          updatedAt: now,
        });
        return rows.get(String(data.id));
      }),
      findFirst: jest.fn(
        async ({
          where,
        }: {
          where: { id: string; expiresAt: { gt: Date } };
        }) => {
          const row = rows.get(where.id);
          if (!row) return null;
          const expiresAt = row.expiresAt;
          if (!(expiresAt instanceof Date) || expiresAt <= where.expiresAt.gt) {
            return null;
          }
          return row;
        },
      ),
      update: jest.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string };
          data: Record<string, unknown>;
        }) => {
          const row = rows.get(where.id);
          if (!row) throw new Error('missing');
          rows.set(where.id, { ...row, ...data, updatedAt: now });
          return rows.get(where.id);
        },
      ),
      deleteMany: jest.fn(async ({ where }: { where: { id?: string } }) => {
        if (where.id) {
          const deleted = rows.delete(where.id);
          return { count: deleted ? 1 : 0 };
        }
        return { count: 0 };
      }),
    },
  } as unknown as ClinicPersistencePort;

  let service: OnboardingDataService;

  beforeEach(() => {
    rows.clear();
    jest.clearAllMocks();
    service = new OnboardingDataService(clock, persistence);
  });

  it('parses the real initialization response through the shared HTTP contract and DTO', async () => {
    const response = await service.initializeOnboarding();

    expect(onboardingInitResponseSchema.parse(response)).toEqual(response);
    expect(OnboardingInitResponseDto.schema.parse(response)).toEqual(response);
    expect(OnboardingInitResponseDto.schema).toBe(onboardingInitResponseSchema);
    expect(Object.keys(response)).toEqual(['onboardingId']);
    expect(response.onboardingId).not.toBe('');
  });

  it('persists sessions outside process memory', async () => {
    const { onboardingId } = await service.initializeOnboarding();
    const recreated = new OnboardingDataService(clock, persistence);

    const progress = await recreated.getOnboardingProgress(onboardingId);

    expect(progress.currentStep).toBe(OnboardingStep.CLINIC_DETAILS);
  });

  it('updates step data and completed steps', async () => {
    const { onboardingId } = await service.initializeOnboarding();

    await service.updateOnboardingData(
      onboardingId,
      OnboardingStep.CLINIC_DETAILS,
      {
        name: 'Clinic',
      },
    );
    const progress = await service.getOnboardingProgress(onboardingId);

    expect(progress.completedSteps).toContain(OnboardingStep.CLINIC_DETAILS);
    expect(progress.data?.clinicDetails).toEqual({ name: 'Clinic' });
  });

  it('rejects missing or expired sessions', async () => {
    await expect(service.getSessionData('missing')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
