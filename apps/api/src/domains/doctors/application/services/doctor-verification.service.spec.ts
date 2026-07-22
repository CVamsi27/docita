import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { Logger } from '@nestjs/common';
import { DoctorVerificationService } from './doctor-verification.service';
import type { IDoctorVerificationRepository } from '@/domains/doctors/core/repositories/doctor-verification.repository.interface';
import type { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import type { IClock } from '@/shared/common/ports/clock.port';
import type { DoctorVerificationHttpClient } from '@/domains/doctors/infrastructure/external/doctor-verification-http.client';

const NOW = new Date('2026-07-05T09:00:00.000Z');

function makeCtx(
  options: {
    doctors: ReadonlyArray<{ id: string }>;
    verify: (id: string) => Promise<unknown>;
  } = { doctors: [], verify: async () => null },
) {
  const findDoctorsForReverification = jest.fn<
    () => Promise<Array<{ id: string }>>
  >(async () => [...options.doctors]);
  const repository = {
    findDoctorsForReverification,
    findDoctorForVerification: jest.fn<(id: string) => Promise<unknown>>(
      async (id: string) => ({
        id,
        name: `Dr ${id}`,
        role: 'DOCTOR',
        registrationNumber: 'MCI-1',
      }),
    ),
    findDoctorLicenseExpiry: jest.fn<(id: string) => Promise<unknown>>(
      async () => null,
    ),
    updateVerificationStatus: jest.fn<
      (id: string, data: unknown) => Promise<void>
    >(async () => undefined),
    findDoctorVerificationRecord: jest.fn<(id: string) => Promise<unknown>>(
      async (id: string) => ({ id }),
    ),
  } as unknown as IDoctorVerificationRepository;

  const configService = {
    getDoctorVerificationConfig: () => ({ apiUrl: null, apiKey: null }),
    getHprVerificationConfig: () => ({ hprApiUrl: null, hprApiKey: null }),
  } as unknown as AppConfigService;

  const clock: IClock = { now: () => NOW };

  const verificationHttp = {} as unknown as DoctorVerificationHttpClient;

  const service = new DoctorVerificationService(
    repository,
    configService,
    clock,
    verificationHttp,
  );

  const verifySpy = jest
    .fn<(id: string) => Promise<unknown>>()
    .mockImplementation(options.verify);

  jest
    .spyOn(service, 'verifyAndPersistDoctorVerification')
    .mockImplementation(verifySpy as never);

  return { service, verifySpy, findDoctorsForReverification };
}

describe('DoctorVerificationService.runDoctorReverificationSweep', () => {
  let ctx: ReturnType<typeof makeCtx>;
  let errorSpy: jest.SpiedFunction<typeof Logger.prototype.error>;

  beforeEach(() => {
    errorSpy = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  it('returns without invoking the worker when no doctors are due', async () => {
    ctx = makeCtx({ doctors: [], verify: async () => null });
    await ctx.service.runDoctorReverificationSweep();
    expect(ctx.verifySpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('verifies every doctor in parallel and surfaces a single error log on partial failure', async () => {
    ctx = makeCtx({
      doctors: [{ id: 'doc-1' }, { id: 'doc-2' }, { id: 'doc-3' }],
      verify: async (id) => {
        if (id === 'doc-2') throw new Error('provider timeout');
        return { id };
      },
    });
    await ctx.service.runDoctorReverificationSweep();
    expect(ctx.verifySpy).toHaveBeenCalledTimes(3);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [message, stack] = errorSpy.mock.calls[0] ?? [];
    expect(String(message)).toContain('1 of 3');
    expect(String(stack)).toContain('provider timeout');
  });

  it('does not throw when every doctor fails so the cron can retry the whole batch next tick', async () => {
    ctx = makeCtx({
      doctors: [{ id: 'doc-1' }, { id: 'doc-2' }],
      verify: async () => {
        throw new Error('upstream down');
      },
    });
    await expect(
      ctx.service.runDoctorReverificationSweep(),
    ).resolves.toBeUndefined();
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(String(errorSpy.mock.calls[0]?.[0])).toContain('2 of 2');
  });
});
