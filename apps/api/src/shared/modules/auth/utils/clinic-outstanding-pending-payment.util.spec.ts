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
    expect(
      clinicHasOutstandingPendingPayment([{ status: 'failed' }]),
    ).toBe(true);
  });

  it('returns false when only paid or expired rows exist', () => {
    expect(
      clinicHasOutstandingPendingPayment([
        { status: 'paid' },
        { status: 'captured' },
      ]),
    ).toBe(false);
    expect(
      clinicHasOutstandingPendingPayment([{ status: 'expired' }]),
    ).toBe(false);
  });
});
