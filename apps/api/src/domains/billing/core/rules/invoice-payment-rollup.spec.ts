import { InvoiceStatus, PaymentSessionStatus } from '@workspace/db';
import {
  computeInvoicePaidState,
  isSettledPaymentStatus,
  sumSettledPaymentCents,
} from './invoice-payment-rollup';

describe('invoice-payment-rollup', () => {
  describe('isSettledPaymentStatus', () => {
    it('counts CAPTURED and PAID only', () => {
      expect(isSettledPaymentStatus(PaymentSessionStatus.CAPTURED)).toBe(true);
      expect(isSettledPaymentStatus(PaymentSessionStatus.PAID)).toBe(true);
      expect(isSettledPaymentStatus(PaymentSessionStatus.PENDING)).toBe(false);
      expect(isSettledPaymentStatus(PaymentSessionStatus.CREATED)).toBe(false);
      expect(isSettledPaymentStatus(PaymentSessionStatus.FAILED)).toBe(false);
    });
  });

  describe('sumSettledPaymentCents', () => {
    it('sums only settled sessions', () => {
      const total = sumSettledPaymentCents([
        { status: PaymentSessionStatus.CAPTURED, amount: 1000 },
        { status: PaymentSessionStatus.PAID, amount: 500 },
        { status: PaymentSessionStatus.PENDING, amount: 9999 },
        { status: PaymentSessionStatus.FAILED, amount: 9999 },
      ]);
      expect(total).toBe(1500);
    });
  });

  describe('computeInvoicePaidState', () => {
    it('marks PARTIALLY_PAID when some but not all is collected', () => {
      const state = computeInvoicePaidState({
        totalCents: 10000,
        paidCents: 4000,
        currentStatus: InvoiceStatus.PENDING,
      });
      expect(state).toEqual({
        amountPaidCents: 4000,
        balanceDueCents: 6000,
        status: InvoiceStatus.PARTIALLY_PAID,
      });
    });

    it('marks PAID when fully collected', () => {
      const state = computeInvoicePaidState({
        totalCents: 10000,
        paidCents: 10000,
        currentStatus: InvoiceStatus.PARTIALLY_PAID,
      });
      expect(state.status).toBe(InvoiceStatus.PAID);
      expect(state.balanceDueCents).toBe(0);
    });

    it('keeps the open status when nothing is collected', () => {
      const state = computeInvoicePaidState({
        totalCents: 10000,
        paidCents: 0,
        currentStatus: InvoiceStatus.OVERDUE,
      });
      expect(state.status).toBe(InvoiceStatus.OVERDUE);
      expect(state.amountPaidCents).toBe(0);
      expect(state.balanceDueCents).toBe(10000);
    });

    it('never reopens a CANCELLED invoice', () => {
      const state = computeInvoicePaidState({
        totalCents: 10000,
        paidCents: 10000,
        currentStatus: InvoiceStatus.CANCELLED,
      });
      expect(state.status).toBe(InvoiceStatus.CANCELLED);
    });

    it('floors balance at zero on overpayment', () => {
      const state = computeInvoicePaidState({
        totalCents: 10000,
        paidCents: 12000,
        currentStatus: InvoiceStatus.PENDING,
      });
      expect(state.balanceDueCents).toBe(0);
      expect(state.status).toBe(InvoiceStatus.PAID);
    });
  });
});
