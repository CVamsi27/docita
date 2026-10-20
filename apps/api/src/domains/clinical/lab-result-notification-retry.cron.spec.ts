import { LabResultNotificationRetryCron } from './lab-result-notification-retry.cron';
import type { LabResultReleaseService } from './application/services/lab-result-release.service';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

describe('LabResultNotificationRetryCron', () => {
  const retryPendingNotifications = jest.fn();
  const releaseService = {
    retryPendingNotifications,
  } as unknown as LabResultReleaseService;

  let cron: LabResultNotificationRetryCron;

  beforeEach(() => {
    jest.resetAllMocks();
    retryPendingNotifications.mockResolvedValue({
      attempted: 0,
      notified: 0,
      abandoned: 0,
    });
    cron = new LabResultNotificationRetryCron(releaseService);
  });

  it('uses the LAB_RESULT_NOTIFICATION_RETRY schedule', () => {
    expect(typeof CRON_SCHEDULES.LAB_RESULT_NOTIFICATION_RETRY).toBe('string');
  });

  it('delegates to the pending-notification sweep', async () => {
    await cron.run();

    expect(retryPendingNotifications).toHaveBeenCalledTimes(1);
  });

  it('propagates sweep failures so the heartbeat records them', async () => {
    retryPendingNotifications.mockRejectedValue(new Error('sweep down'));

    await expect(cron.run()).rejects.toThrow('sweep down');
  });
});
