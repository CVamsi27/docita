import { describe, expect, it } from '@jest/globals';
import { clinicHasOutstandingPendingPayment } from '@/shared/modules/auth/utils/clinic-outstanding-pending-payment.util';

describe('clinicHasOutstandingPendingPayment', () => {
  it('returns true for pending and failed subscription payments', () => {
    expect(
      clinicHasOutstandingPendingPayment([
        { status: 'pending' },
        { status: 'paid' },
      ]),
    ).toBe(true);
    expect(clinicHasOutstandingPendingPayment([{ status: 'failed' }])).toBe(
      true,
    );
  });

  it('returns false when payment history is missing or empty', () => {
    expect(clinicHasOutstandingPendingPayment(undefined)).toBe(false);
    expect(clinicHasOutstandingPendingPayment(null)).toBe(false);
    expect(clinicHasOutstandingPendingPayment([])).toBe(false);
  });

  it('returns false when only paid or expired rows exist', () => {
    expect(
      clinicHasOutstandingPendingPayment([
        { status: 'paid' },
        { status: 'captured' },
      ]),
    ).toBe(false);
    expect(clinicHasOutstandingPendingPayment([{ status: 'expired' }])).toBe(
      false,
    );
  });
});
