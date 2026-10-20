import { subscriptionBillingCheckoutResponseSchema } from '@workspace/types';
import {
  buildCheckoutPrefill,
  buildCheckoutDescription,
  buildCheckoutOrderNotes,
  buildCompletedWithoutPaymentResponse,
} from './create-checkout.helpers';

describe('buildCheckoutPrefill', () => {
  it('builds prefill with name and email', () => {
    const result = buildCheckoutPrefill({
      name: 'John Doe',
      email: 'john@example.com',
      phone: undefined,
    });
    expect(result).toEqual({ name: 'John Doe', email: 'john@example.com' });
  });

  it('includes phone as contact when present', () => {
    const result = buildCheckoutPrefill({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '9876543210',
    });
    expect(result).toEqual({
      name: 'John Doe',
      email: 'john@example.com',
      contact: '9876543210',
    });
  });

  it('omits contact when phone is empty string', () => {
    const result = buildCheckoutPrefill({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '',
    });
    expect(result).toEqual({ name: 'John Doe', email: 'john@example.com' });
    expect(result).not.toHaveProperty('contact');
  });

  it('omits contact when phone is undefined', () => {
    const result = buildCheckoutPrefill({
      name: 'John Doe',
      email: 'john@example.com',
    });
    expect(result).not.toHaveProperty('contact');
  });
});

describe('buildCheckoutDescription', () => {
  it('combines tier and cycle values', () => {
    const result = buildCheckoutDescription(
      { value: 'PROFESSIONAL' } as any,
      { value: 'monthly' } as any,
    );
    expect(result).toBe('PROFESSIONAL monthly subscription');
  });

  it('works with different tier and cycle combinations', () => {
    expect(
      buildCheckoutDescription(
        { value: 'STARTER' } as any,
        { value: 'yearly' } as any,
      ),
    ).toBe('STARTER yearly subscription');
  });

  it('works with ENTERPRISE tier', () => {
    expect(
      buildCheckoutDescription(
        { value: 'ENTERPRISE' } as any,
        { value: 'monthly' } as any,
      ),
    ).toBe('ENTERPRISE monthly subscription');
  });
});

describe('buildCheckoutOrderNotes', () => {
  it('builds order notes with all fields', () => {
    const result = buildCheckoutOrderNotes({
      clinicId: 'clinic-1',
      tier: 'PROFESSIONAL',
      cycle: 'monthly',
      pricingOfferTitle: '20% off',
    });
    expect(result).toEqual({
      clinicId: 'clinic-1',
      tier: 'PROFESSIONAL',
      cycle: 'monthly',
      pricingOffer: '20% off',
    });
  });

  it('defaults pricingOffer to empty string when not provided', () => {
    const result = buildCheckoutOrderNotes({
      clinicId: 'clinic-1',
      tier: 'STARTER',
      cycle: 'yearly',
    });
    expect(result.pricingOffer).toBe('');
  });

  it('includes all required fields', () => {
    const result = buildCheckoutOrderNotes({
      clinicId: 'clinic-2',
      tier: 'HOSPITAL',
      cycle: 'monthly',
    });
    expect(result.clinicId).toBe('clinic-2');
    expect(result.tier).toBe('HOSPITAL');
    expect(result.cycle).toBe('monthly');
  });
});

describe('buildCompletedWithoutPaymentResponse', () => {
  it('omits the payment fields entirely and flags completedWithoutPayment', () => {
    // The zero-amount path collects no payment, so there is no order and no
    // payment key to send. It used to send `orderId: ''`, `amountCents: 0`
    // and a blank `razorpayKeyId` — sentinels the client had to disambiguate
    // with a truthiness guard. The shared contract is now a discriminated
    // union, so those fields simply are not present.
    const result = buildCompletedWithoutPaymentResponse({
      currency: 'INR',
      prefill: { name: 'Test', email: 'test@example.com' },
    });
    expect(result).toEqual({
      currency: 'INR',
      completedWithoutPayment: true,
      prefill: { name: 'Test', email: 'test@example.com' },
    });
    expect('razorpayKeyId' in result).toBe(false);
    expect('orderId' in result).toBe(false);
    expect('amountCents' in result).toBe(false);
  });

  it('satisfies the no-payment branch of the shared contract', () => {
    const result = buildCompletedWithoutPaymentResponse({
      currency: 'USD',
      prefill: { name: 'Jane', email: 'jane@test.com' },
    });
    expect(() =>
      subscriptionBillingCheckoutResponseSchema.parse(result),
    ).not.toThrow();
  });

  it('preserves prefill data', () => {
    const prefill = {
      name: 'Jane',
      email: 'jane@test.com',
      contact: '1234567890',
    };
    const result = buildCompletedWithoutPaymentResponse({
      currency: 'USD',
      prefill,
    });
    expect(result.prefill).toBe(prefill);
  });
});
