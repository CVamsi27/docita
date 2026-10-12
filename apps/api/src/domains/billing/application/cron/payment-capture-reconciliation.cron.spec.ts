import { describe, expect, it, jest } from '@jest/globals';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { getHeartbeatName } from '@/shared/modules/schedule/cron-heartbeat';
import { PaymentCaptureReconciliationService } from '@/domains/billing/application/services/payment-capture-reconciliation.service';
import { PaymentCaptureReconciliationCron } from './payment-capture-reconciliation.cron';

describe('PaymentCaptureReconciliationCron', () => {
  const reconciliation = {
    reconcileRecentCaptures: jest
      .fn<() => Promise<unknown>>()
      .mockResolvedValue({
        scanned: 0,
        captured: 0,
        alreadyCaptured: 0,
        unmatched: 0,
        failed: 0,
      }),
  } as unknown as PaymentCaptureReconciliationService;

  const cron = new PaymentCaptureReconciliationCron(reconciliation);

  it('is wired to the hourly reconciliation schedule', () => {
    expect(CRON_SCHEDULES.PAYMENT_CAPTURE_RECONCILIATION).toBe('20 * * * *');
  });

  it('carries the billing.payment-capture-reconciliation heartbeat name on run()', () => {
    expect(
      getHeartbeatName(PaymentCaptureReconciliationCron.prototype, 'run'),
    ).toBe('billing.payment-capture-reconciliation');
  });

  it('delegates run() to PaymentCaptureReconciliationService', async () => {
    await cron.run();

    expect(reconciliation.reconcileRecentCaptures).toHaveBeenCalledTimes(1);
  });
});
