import { describe, expect, it, jest } from '@jest/globals';
import { subscriptionBillingCheckoutResponseSchema } from '@workspace/types';
import { buildCompletedWithoutPaymentResponse } from './create-checkout.helpers';
import { CheckoutPaymentOrderService } from './checkout-payment-order.service';

/**
 * Contract parity for `POST /subscription/billing/checkout`.
 *
 * Three defects met on this endpoint, all invisible at compile time:
 *
 *  1. `razorpayKeyId: z.string()` accepted the `|| ''` the service returned
 *     when `RAZORPAY_KEY_ID` was unset. The order was created, `savePayment`
 *     recorded a `pending` SubscriptionPayment row, and only then did the
 *     response go out with a key that can never open a payment modal — leaving
 *     an orphan gateway order and a pending row on every attempt.
 *  2. The reuse-a-recent-order branch had the same `|| ''`, so a clinic that
 *     was already mid-checkout got an unusable checkout back.
 *  3. The zero-amount branch sent `orderId: ''`, `amountCents: 0` and a blank
 *     key as sentinels for "no payment happened", forcing the client to
 *     disambiguate with a truthiness guard over four fields.
 *
 * The contract is now a discriminated union on `completedWithoutPayment`: the
 * payable branch requires a usable order and key, and the zero-amount branch
 * carries neither.
 */

const REQUEST = {
  clinicId: 'clinic-1',
  tier: 'ESSENTIAL',
  cycle: 'MONTHLY',
} as never;

function buildOrderService(opts: {
  razorpayKeyId?: string;
  reusable?: { razorpayOrderId: string } | null;
  razorpayCustomerId?: string | null;
}) {
  const createOrder = jest.fn(async () => ({
    razorpayOrderId: 'order_new',
    amountCents: 99900,
    currency: 'INR',
  }));
  const createCustomer = jest.fn(async () => 'cust_1');
  const updateCustomer = jest.fn(async () => undefined);
  const savePayment = jest.fn(async () => undefined);
  const expireOtherPendingSubscriptionCheckouts = jest.fn(
    async () => undefined,
  );

  const service = new CheckoutPaymentOrderService(
    {
      savePayment,
      findReusablePendingCheckout: async () => opts.reusable ?? null,
      expireOtherPendingSubscriptionCheckouts,
    } as never,
    {
      updateRazorpayCustomerId: jest.fn(async () => undefined),
    } as never,
    { createOrder, createCustomer, updateCustomer } as never,
    { getRazorpayKeyId: () => opts.razorpayKeyId ?? 'rzp_test_key' } as never,
  );

  return {
    service,
    createOrder,
    createCustomer,
    updateCustomer,
    savePayment,
  };
}

function checkoutInput(amountCents = 99900) {
  return {
    request: REQUEST,
    clinic: { id: 'clinic-1', razorpayCustomerId: 'cust_1' },
    tier: { value: 'ESSENTIAL' } as never,
    cycle: { value: 'MONTHLY' } as never,
    amountCents,
    currencyCode: 'INR',
    razorpayContact: { name: 'Asha Rao', email: 'owner@clinic.test' },
    checkoutPrefill: { name: 'Asha Rao', email: 'owner@clinic.test' },
  } as never;
}

describe('POST /subscription/billing/checkout response contract', () => {
  it('satisfies the shared schema on the payable branch', async () => {
    const { service } = buildOrderService({});
    const result = await service.createPayableCheckout(checkoutInput());
    expect(() =>
      subscriptionBillingCheckoutResponseSchema.parse(result),
    ).not.toThrow();
  });

  it('carries a usable order and key the Razorpay modal needs', async () => {
    // Assert on the PARSED value: `parse` on a `.strict()` union strips
    // nothing but rejects anything unexpected, so only the parse output proves
    // the fields are really part of the contract.
    const { service } = buildOrderService({});
    const result = await service.createPayableCheckout(checkoutInput());
    expect(subscriptionBillingCheckoutResponseSchema.parse(result)).toEqual({
      orderId: 'order_new',
      amountCents: 99900,
      currency: 'INR',
      razorpayKeyId: 'rzp_test_key',
      prefill: { name: 'Asha Rao', email: 'owner@clinic.test' },
    });
  });

  it('rejects a blank key at the contract layer', () => {
    expect(() =>
      subscriptionBillingCheckoutResponseSchema.parse({
        orderId: 'order_new',
        amountCents: 99900,
        currency: 'INR',
        razorpayKeyId: '',
      }),
    ).toThrow();
  });

  it('rejects a blank order id at the contract layer', () => {
    // A blank `order_id` is what the zero-amount path used to send in every
    // response. On the payable branch it is meaningless, so the contract
    // refuses it rather than letting it reach `openCheckout`.
    expect(() =>
      subscriptionBillingCheckoutResponseSchema.parse({
        orderId: '',
        amountCents: 99900,
        currency: 'INR',
        razorpayKeyId: 'rzp_test_key',
      }),
    ).toThrow();
  });

  it('rejects unknown fields rather than passing them onto the wire', () => {
    // Both branches stay `.strict()`. A future field added to the service but
    // not to the contract is a drift signal, not something to forward.
    expect(() =>
      subscriptionBillingCheckoutResponseSchema.parse({
        orderId: 'order_new',
        amountCents: 99900,
        currency: 'INR',
        razorpayKeyId: 'rzp_test_key',
        secretInternalNote: 'do not ship',
      }),
    ).toThrow();
  });

  it('refuses before any gateway call when no key is configured', async () => {
    const {
      service,
      createOrder,
      savePayment,
      createCustomer,
      updateCustomer,
    } = buildOrderService({ razorpayKeyId: '' });
    await expect(
      service.createPayableCheckout(checkoutInput()),
    ).rejects.toThrow('Payments are not configured for this environment');
    // Every side effect must be skipped, and `ensureCustomer` has TWO branches:
    // this clinic already has a customer id so it takes the update path, which
    // is a real Razorpay write. Asserting only `createCustomer` left the update
    // branch uncovered, which is exactly what mutation M6 exploited.
    expect(createOrder).not.toHaveBeenCalled();
    expect(savePayment).not.toHaveBeenCalled();
    expect(createCustomer).not.toHaveBeenCalled();
    expect(updateCustomer).not.toHaveBeenCalled();
  });

  it('refuses before creating a customer for a clinic with none on file', async () => {
    const { service, createCustomer } = buildOrderService({
      razorpayKeyId: '',
    });
    await expect(
      service.createPayableCheckout({
        ...(checkoutInput() as object),
        clinic: { id: 'clinic-1', razorpayCustomerId: null },
      } as never),
    ).rejects.toThrow('Payments are not configured for this environment');
    expect(createCustomer).not.toHaveBeenCalled();
  });

  it('refuses on the reuse branch too', async () => {
    // The reuse path returns an EXISTING order. A blank key here is just as
    // unusable, and it previously had its own independent `|| ''`.
    const { service, savePayment } = buildOrderService({
      razorpayKeyId: '',
      reusable: { razorpayOrderId: 'order_existing' },
    });
    await expect(
      service.createPayableCheckout(checkoutInput()),
    ).rejects.toThrow('Payments are not configured for this environment');
    expect(savePayment).not.toHaveBeenCalled();
  });

  it('reuses a pending order and still returns a usable key', async () => {
    const { service, createOrder, savePayment } = buildOrderService({
      reusable: { razorpayOrderId: 'order_existing' },
    });
    const result = await service.createPayableCheckout(checkoutInput());
    expect(createOrder).not.toHaveBeenCalled();
    expect(savePayment).not.toHaveBeenCalled();
    expect(
      subscriptionBillingCheckoutResponseSchema.parse(result),
    ).toMatchObject({
      orderId: 'order_existing',
      razorpayKeyId: 'rzp_test_key',
    });
  });

  it('satisfies the zero-amount branch without any payment fields', () => {
    const result = buildCompletedWithoutPaymentResponse({
      currency: 'INR',
      prefill: { name: 'Asha Rao', email: 'owner@clinic.test' },
    });
    expect(() =>
      subscriptionBillingCheckoutResponseSchema.parse(result),
    ).not.toThrow();
    expect(subscriptionBillingCheckoutResponseSchema.parse(result)).toEqual({
      currency: 'INR',
      completedWithoutPayment: true,
      prefill: { name: 'Asha Rao', email: 'owner@clinic.test' },
    });
  });

  it('rejects a zero-amount result that still claims a payment', () => {
    // The old sentinel shape. If anything reintroduces `orderId: ''` /
    // `amountCents: 0` / a blank key on this branch, the contract refuses it
    // rather than letting the client re-derive the meaning from falsiness.
    expect(() =>
      subscriptionBillingCheckoutResponseSchema.parse({
        orderId: '',
        amountCents: 0,
        currency: 'INR',
        razorpayKeyId: '',
        completedWithoutPayment: true,
      }),
    ).toThrow();
  });

  it('rejects a payable result whose amount is zero', () => {
    // The payable branch requires a positive amount, so a zero-amount order can
    // never be presented to Razorpay as a payable one.
    expect(() =>
      subscriptionBillingCheckoutResponseSchema.parse({
        orderId: 'order_new',
        amountCents: 0,
        currency: 'INR',
        razorpayKeyId: 'rzp_test_key',
      }),
    ).toThrow();
  });
});
