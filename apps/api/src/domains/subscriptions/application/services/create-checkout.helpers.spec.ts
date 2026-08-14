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
  it('returns response with zero amount and completedWithoutPayment flag', () => {
    const result = buildCompletedWithoutPaymentResponse({
      currency: 'INR',
      razorpayKeyId: 'key_123',
      prefill: { name: 'Test', email: 'test@example.com' },
    });
    expect(result).toEqual({
      orderId: '',
      amountCents: 0,
      currency: 'INR',
      razorpayKeyId: 'key_123',
      completedWithoutPayment: true,
      prefill: { name: 'Test', email: 'test@example.com' },
    });
  });

  it('preserves prefill data', () => {
    const prefill = {
      name: 'Jane',
      email: 'jane@test.com',
      contact: '1234567890',
    };
    const result = buildCompletedWithoutPaymentResponse({
      currency: 'USD',
      razorpayKeyId: 'key_456',
      prefill,
    });
    expect(result.prefill).toBe(prefill);
  });

  it('sets amountCents to 0', () => {
    const result = buildCompletedWithoutPaymentResponse({
      currency: 'INR',
      razorpayKeyId: 'key_789',
      prefill: { name: 'Test', email: 'test@test.com' },
    });
    expect(result.amountCents).toBe(0);
  });

  it('sets orderId to empty string', () => {
    const result = buildCompletedWithoutPaymentResponse({
      currency: 'INR',
      razorpayKeyId: 'key_789',
      prefill: { name: 'Test', email: 'test@test.com' },
    });
    expect(result.orderId).toBe('');
  });
});
