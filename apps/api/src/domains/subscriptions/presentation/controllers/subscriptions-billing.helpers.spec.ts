import { mapSubscriptionBillingPayments } from './subscriptions-billing.helpers';

describe('mapSubscriptionBillingPayments', () => {
  it('maps a paid payment row', () => {
    const result = mapSubscriptionBillingPayments([
      {
        id: 'pay_1',
        amountCents: 150000,
        currency: 'INR',
        status: 'paid',
        paidAt: new Date('2026-07-01'),
        createdAt: new Date('2026-07-01'),
        invoiceUrl: 'https://example.com/invoice.pdf',
        invoiceNumber: 'INV-001',
      },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('pay_1');
    expect(result[0].amount).toBe(1500);
    expect(result[0].status).toBe('paid');
    expect(result[0].receiptUrl).toBe('https://example.com/invoice.pdf');
    expect(result[0].payUrl).toBeUndefined();
    expect(result[0].invoiceNumber).toBe('INV-001');
    expect(result[0].paidAt).toBe('2026-07-01T00:00:00.000Z');
    expect(result[0].createdAt).toBeDefined();
  });

  it('maps an unpaid payment row', () => {
    const result = mapSubscriptionBillingPayments([
      {
        id: 'pay_2',
        amountCents: 50000,
        currency: 'INR',
        status: 'pending',
        createdAt: new Date('2026-07-15'),
        invoiceUrl: 'https://example.com/pay',
      },
    ]);
    expect(result[0].payUrl).toBe('https://example.com/pay');
    expect(result[0].receiptUrl).toBeUndefined();
  });

  it('uses getStatus callback when status is absent', () => {
    const result = mapSubscriptionBillingPayments([
      {
        id: 'pay_3',
        amountCents: 10000,
        currency: 'INR',
        createdAt: new Date('2026-07-01'),
        getStatus: () => 'paid',
        paidAt: new Date('2026-07-01'),
      },
    ]);
    expect(result[0].status).toBe('paid');
  });

  it('maps optional fields', () => {
    const result = mapSubscriptionBillingPayments([
      {
        id: 'pay_4',
        amountCents: 20000,
        subtotalCents: 18000,
        taxCents: 2000,
        grandTotalCents: 20000,
        currency: 'INR',
        status: 'paid',
        createdAt: new Date('2026-07-01'),
        description: 'Monthly subscription',
        invoiceType: 'subscription',
        taxSummary: { cgst: 1000, sgst: 1000 },
      },
    ]);
    expect(result[0].subtotalCents).toBe(18000);
    expect(result[0].taxCents).toBe(2000);
    expect(result[0].grandTotalCents).toBe(20000);
    expect(result[0].description).toBe('Monthly subscription');
    expect(result[0].invoiceType).toBe('subscription');
    expect(result[0].taxSummary).toEqual({ cgst: 1000, sgst: 1000 });
  });

  it('handles empty payments array', () => {
    expect(mapSubscriptionBillingPayments([])).toEqual([]);
  });

  it('defaults status to pending when no status and no getStatus', () => {
    const result = mapSubscriptionBillingPayments([
      {
        id: 'pay_5',
        amountCents: 10000,
        currency: 'INR',
        createdAt: new Date('2026-07-01'),
      },
    ]);
    expect(result[0].status).toBe('pending');
  });

  it('converts undefined optional fields to undefined', () => {
    const result = mapSubscriptionBillingPayments([
      {
        id: 'pay_6',
        amountCents: 10000,
        currency: 'INR',
        createdAt: new Date('2026-07-01'),
      },
    ]);
    expect(result[0].description).toBeUndefined();
    expect(result[0].invoiceUrl).toBeUndefined();
    expect(result[0].invoiceNumber).toBeUndefined();
    expect(result[0].paidAt).toBeUndefined();
  });
});
