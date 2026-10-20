import { describe, expect, it, jest } from '@jest/globals';
import { firstValueFrom, of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { onboardingCompletionResponseSchema } from '@workspace/types';
import { OnboardingCompletionResponseDto } from '@/domains/clinics/application/dto/onboarding/onboarding-response.dto';
import { SafeZodSerializerInterceptor } from '@/shared/common/interceptors/safe-zod-serializer.interceptor';
import {
  buildSuccessfulOnboardingResult,
  buildValidationFailureResult,
  handleOnboardingFailure,
} from './onboarding-result.helpers';
import type { OnboardingResult } from './onboarding-result.types';
import type { CompletedOnboardingRecords } from './onboarding.types';

/**
 * Contract parity for `POST /onboarding/:id/complete`.
 *
 * `OnboardingCompletionResponseDto` used to wrap an inline
 * `{accessToken, clinicId, userId, email, name, role}` schema that the service
 * never produced. `SafeZodSerializerInterceptor` therefore logged a
 * `SafeZodSerializer` mismatch warning on every successful clinic registration
 * and passed the raw `OnboardingResult` through untrimmed — a permanently red
 * log line on the highest-value flow in the product, and the exact signal its
 * own doc says should be acted on.
 *
 * These tests run the real result builders through the shared schema and
 * through the real interceptor, so a future change that desynchronises the DTO
 * from the service fails here rather than degrading silently.
 */

const AUTH_USER = {
  id: 'user_1',
  email: 'owner@clinic.test',
  name: 'Asha Rao',
  role: 'ADMIN',
  clinicId: 'clinic_1',
};

function makeAuthService() {
  return {
    login: jest.fn(async () => ({
      access_token: 'jwt-token-123',
      user: AUTH_USER,
    })),
  };
}

const RECORDS = {
  clinic: { id: 'clinic_1' },
  adminUser: {
    id: 'user_1',
    email: 'owner@clinic.test',
    name: 'Asha Rao',
    role: 'ADMIN',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  },
  subscriptionId: 'sub_1',
} as unknown as CompletedOnboardingRecords;

/** Drive the interceptor exactly as Nest would, returning the response body. */
async function serialize(
  body: unknown,
  dto: unknown,
): Promise<{
  body: unknown;
  warnings: string[];
}> {
  const warnings: string[] = [];
  const loggerSpy = jest
    .spyOn((await import('@nestjs/common')).Logger.prototype, 'warn')
    .mockImplementation((message: unknown) => {
      warnings.push(String(message));
    });

  const reflector = {
    getAllAndOverride: () => dto,
  } as unknown as Reflector;
  const interceptor = new SafeZodSerializerInterceptor(reflector);

  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'POST',
        url: '/onboarding/o1/complete',
      }),
    }),
  } as unknown as ExecutionContext;

  const next = { handle: () => of(body) } as CallHandler;
  const emitted = await firstValueFrom(interceptor.intercept(context, next));

  loggerSpy.mockRestore();
  return { body: emitted, warnings };
}

describe('POST /onboarding/:id/complete response contract', () => {
  it('satisfies the shared schema on the success path', async () => {
    const result = await buildSuccessfulOnboardingResult(
      makeAuthService() as never,
      RECORDS,
    );
    expect(() =>
      onboardingCompletionResponseSchema.parse(result),
    ).not.toThrow();
  });

  it('carries the credentials the SPA stores on success', async () => {
    const result = await buildSuccessfulOnboardingResult(
      makeAuthService() as never,
      RECORDS,
    );
    // Assert on the PARSED value, not the raw payload: a field dropped from the
    // schema is silently stripped by `parse`, so only the parse output proves
    // the field is actually part of the contract.
    expect(onboardingCompletionResponseSchema.parse(result)).toMatchObject({
      success: true,
      subscriptionId: 'sub_1',
      access_token: 'jwt-token-123',
      user: AUTH_USER,
    });
  });

  it('satisfies the shared schema on the validation-failure path', async () => {
    const validationService = {
      validateOnboardingCompletion: () => ({
        valid: false,
        errors: ['GSTIN invalid'],
      }),
    };
    const result = buildValidationFailureResult(
      validationService as never,
      {} as never,
    );
    expect(result).not.toBeNull();
    expect(() =>
      onboardingCompletionResponseSchema.parse(result),
    ).not.toThrow();
    expect(onboardingCompletionResponseSchema.parse(result)).toMatchObject({
      success: false,
      errors: ['GSTIN invalid'],
      message: 'Onboarding validation failed',
    });
  });

  it('satisfies the shared schema on the thrown-error path', async () => {
    const complianceService = {
      logOnboardingEvent: jest.fn(async () => undefined),
    };
    const result = await handleOnboardingFailure(
      complianceService as never,
      new Error('razorpay timeout'),
      'o1',
      { clinicId: 'clinic_1', userId: 'user_1' },
    );
    expect(() =>
      onboardingCompletionResponseSchema.parse(result),
    ).not.toThrow();
    expect(result.success).toBe(false);
  });

  it('no longer logs a serializer mismatch on a successful registration', async () => {
    const result = await buildSuccessfulOnboardingResult(
      makeAuthService() as never,
      RECORDS,
    );
    const { body, warnings } = await serialize(
      result,
      OnboardingCompletionResponseDto,
    );
    expect(warnings).toEqual([]);
    // The schema matched, so the body is now trimmed to the contract rather
    // than passed through untouched.
    expect(onboardingCompletionResponseSchema.parse(body)).toMatchObject({
      access_token: 'jwt-token-123',
    });
  });

  it('no longer logs a serializer mismatch on a failed registration', async () => {
    const complianceService = {
      logOnboardingEvent: jest.fn(async () => undefined),
    };
    const result: OnboardingResult = await handleOnboardingFailure(
      complianceService as never,
      new Error('razorpay timeout'),
      'o1',
      {},
    );
    const { warnings } = await serialize(
      result,
      OnboardingCompletionResponseDto,
    );
    expect(warnings).toEqual([]);
  });

  it('still warns and passes the body through when a body does not match', async () => {
    // The fallback is deliberate (see the interceptor's doc): a mismatched
    // schema logs a warning and returns the original rather than 500ing. This
    // test fails if that warning is ever silenced, which is what would hide a
    // future contract drift.
    const { body, warnings } = await serialize(
      { success: true, unexpected: 'shape' },
      OnboardingCompletionResponseDto,
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('mismatch');
    expect(body).toEqual({ success: true, unexpected: 'shape' });
  });

  it('rejects a completion body missing the credential fields', () => {
    // The pre-fix DTO shape. If anyone reintroduces it, this documents why the
    // flat `{accessToken, email, name, role}` contract was wrong.
    expect(() =>
      onboardingCompletionResponseSchema.parse({
        accessToken: 'jwt',
        clinicId: 'clinic_1',
        userId: 'user_1',
        email: 'owner@clinic.test',
        name: 'Asha Rao',
        role: 'ADMIN',
      }),
    ).toThrow();
  });
});
