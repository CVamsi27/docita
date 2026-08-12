import { WhatsappReconciliationCron } from './whatsapp-reconciliation.cron';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

describe('WhatsappReconciliationCron', () => {
  const mockReconciliationService = {
    runStaleDeliverySweep: jest.fn(),
  } as any;

  let cron: WhatsappReconciliationCron;

  beforeEach(() => {
    jest.resetAllMocks();
    cron = new WhatsappReconciliationCron(mockReconciliationService);
  });

  describe('CRON_SCHEDULES wiring', () => {
    it('uses the WHATSAPP_DELIVERY_RECONCILIATION schedule', () => {
      expect(CRON_SCHEDULES.WHATSAPP_DELIVERY_RECONCILIATION).toBeDefined();
      expect(typeof CRON_SCHEDULES.WHATSAPP_DELIVERY_RECONCILIATION).toBe(
        'string',
      );
    });
  });

  describe('run', () => {
    it('delegates to reconciliationService.runStaleDeliverySweep', async () => {
      await cron.run();
      expect(
        mockReconciliationService.runStaleDeliverySweep,
      ).toHaveBeenCalledTimes(1);
    });

    it('propagates errors from the service', async () => {
      mockReconciliationService.runStaleDeliverySweep.mockRejectedValue(
        new Error('WhatsApp API unavailable'),
      );
      await expect(cron.run()).rejects.toThrow('WhatsApp API unavailable');
    });

    it('calls the service with no arguments', async () => {
      await cron.run();
      expect(
        mockReconciliationService.runStaleDeliverySweep,
      ).toHaveBeenCalledWith();
    });
  });
});
