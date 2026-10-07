import { describe, expect, it, jest } from '@jest/globals';
import { firstValueFrom, of } from 'rxjs';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { onboardingCheckoutResponseSchema } from '@workspace/types';
import { OnboardingCheckoutResponseDto } from '@/domains/clinics/application/dto/onboarding/create-clinic-onboarding.dto';
import { SafeZodSerializerInterceptor } from '@/shared/common/interceptors/safe-zod-serializer.interceptor';
import { OnboardingPaymentService } from './onboarding-payment.service';

/**
 * Contract parity for `POST /onboarding/:id/checkout`.
 *
 * The DTO used to declare an inline four-field schema inside an API DTO file,
 * which the SPA mirrored with a second hand-written `OnboardingCheckoutResponse`
 * interface. Two sources of truth for the same wire format (AGENTS §3.2), with
 * nothing on either side checking the other.
 *
 * Worse, `razorpayKeyId` was `z.string()`, which accepts the `|| ''` the
 * service returned when `RAZORPAY_KEY_ID` was unset. The SPA passed that empty
 * key straight to `new Razorpay({ key: '' })`: a payment modal that can never
 * complete, sitting behind an order the API had already created. These tests
 * pin both the shape and the "never hand back an unusable checkout" invariant.
 *
 * The real service is instantiated and driven through the real interceptor, so
 * a change that desynchronises the DTO from the service fails here instead of
 * degrading into a log warning.
 */

const CHECKOUT_DTO = {
  tier: 'PROFESSIONAL',
  billingCycle: 'MONTHLY',
  planMode: 'FULL',
  currency: 'INR',
  customerEmail: 'owner@clinic.test',
  customerName: 'Asha Rao',
} as never;

function buildService(
  overrides: {
    razorpayKeyId?: string;
    orderId?: string;
    amountCents?: number;
  } = {},
) {
  const createOrder = jest.fn(async () => ({
    razorpayOrderId: overrides.orderId ?? 'order_1',
    amountCents: overrides.amountCents ?? 499900,
    currency: 'INR',
  }));

  const service = new OnboardingPaymentService(
    { getSessionData: async () => ({ onboardingId: 'o1' }) } as never,
    { getTierPricing: () => 499900 } as never,
    {
      getRazorpayKeyId: () => overrides.razorpayKeyId ?? 'rzp_test_key',
      getCurrencyCode: () => 'INR',
    } as never,
    { createOrder } as never,
  );

  return { service, createOrder };
}

/** Drive the interceptor exactly as Nest would, returning body + warnings. */
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

  const reflector = { getAllAndOverride: () => dto } as unknown as Reflector;
  const interceptor = new SafeZodSerializerInterceptor(reflector);

  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({
      getRequest: () => ({ method: 'POST', url: '/onboarding/o1/checkout' }),
    }),
  } as unknown as ExecutionContext;

  const emitted = await firstValueFrom(
    interceptor.intercept(context, { handle: () => of(body) } as CallHandler),
  );

  loggerSpy.mockRestore();
  return { body: emitted, warnings };
}

describe('POST /onboarding/:id/checkout response contract', () => {
  it('satisfies the shared schema', async () => {
    const { service } = buildService();
    const result = await service.createCheckout('o1', CHECKOUT_DTO);
    expect(() => onboardingCheckoutResponseSchema.parse(result)).not.toThrow();
  });

  it('carries every field the Razorpay modal needs', async () => {
    // Assert on the PARSED value: `parse` strips unknown keys, so only the
    // parse output proves a field is really part of the contract.
    const { service } = buildService();
    const result = await service.createCheckout('o1', CHECKOUT_DTO);
    expect(onboardingCheckoutResponseSchema.parse(result)).toEqual({
      orderId: 'order_1',
      amountCents: 499900,
      currency: 'INR',
      razorpayKeyId: 'rzp_test_key',
    });
  });

  it('does not log a serializer mismatch', async () => {
    const { service } = buildService();
    const result = await service.createCheckout('o1', CHECKOUT_DTO);
    const { warnings } = await serialize(result, OnboardingCheckoutResponseDto);
    expect(warnings).toEqual([]);
  });

  it('refuses to create an order when no Razorpay key is configured', async () => {
    // The guard must run BEFORE `createOrder`, otherwise a deployment missing
    // RAZORPAY_KEY_ID still mints an order on every checkout attempt.
    const { service, createOrder } = buildService({ razorpayKeyId: '' });
    await expect(service.createCheckout('o1', CHECKOUT_DTO)).rejects.toThrow(
      'Payments are not configured for this environment',
    );
    expect(createOrder).not.toHaveBeenCalled();
  });

  it('rejects a blank key at the contract layer too', () => {
    // Defence in depth: if the service guard is ever removed, the shared
    // schema still refuses the response instead of shipping an unusable one.
    expect(() =>
      onboardingCheckoutResponseSchema.parse({
        orderId: 'order_1',
        amountCents: 499900,
        currency: 'INR',
        razorpayKeyId: '',
      }),
    ).toThrow();
  });

  it.each(['orderId', 'amountCents', 'currency', 'razorpayKeyId'])(
    'requires %s: the modal breaks without it',
    (field) => {
      // Guards the opposite failure too: relaxing a field to `.optional()`
      // leaves a passing suite while the Razorpay modal silently receives
      // `undefined`. A mutation-verified run caught exactly that.
      const complete = {
        orderId: 'order_1',
        amountCents: 499900,
        currency: 'INR',
        razorpayKeyId: 'rzp_test_key',
      } as Record<string, unknown>;
      const { [field]: _omitted, ...incomplete } = complete;
      expect(() =>
        onboardingCheckoutResponseSchema.parse(incomplete),
      ).toThrow();
    },
  );

  it('still warns and passes the body through when it does not match', async () => {
    // The interceptor's fallback is deliberate (see its doc): a mismatch logs
    // and returns the original rather than 500ing. This fails if that warning
    // is ever silenced, which is what would hide future contract drift.
    const { body, warnings } = await serialize(
      { unexpected: 'shape' },
      OnboardingCheckoutResponseDto,
    );
    expect(warnings).toHaveLength(1);
    expect(warnings[0]).toContain('mismatch');
    expect(body).toEqual({ unexpected: 'shape' });
  });

  it('still refuses a plan that cannot be checked out directly', async () => {
    const service = new OnboardingPaymentService(
      { getSessionData: async () => ({ onboardingId: 'o1' }) } as never,
      { getTierPricing: () => 0 } as never,
      {
        getRazorpayKeyId: () => 'rzp_test_key',
        getCurrencyCode: () => 'INR',
      } as never,
      { createOrder: jest.fn() } as never,
    );
    await expect(service.createCheckout('o1', CHECKOUT_DTO)).rejects.toThrow(
      'Selected plan does not support direct checkout',
    );
  });

  it('still refuses an unknown session', async () => {
    const service = new OnboardingPaymentService(
      { getSessionData: async () => null } as never,
      { getTierPricing: () => 499900 } as never,
      {
        getRazorpayKeyId: () => 'rzp_test_key',
        getCurrencyCode: () => 'INR',
      } as never,
      { createOrder: jest.fn() } as never,
    );
    await expect(service.createCheckout('o1', CHECKOUT_DTO)).rejects.toThrow(
      'Onboarding session not found or expired',
    );
  });
});
