import { InsuranceClaimSubmissionRetryCron } from './insurance-claim-submission-retry.cron';
import type { InsuranceClaimSubmissionCommandService } from './application/services/insurance-claim-submission.command.service';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

describe('InsuranceClaimSubmissionRetryCron', () => {
  const retryPendingSubmissions = jest.fn();
  const submissionService = {
    retryPendingSubmissions,
  } as unknown as InsuranceClaimSubmissionCommandService;

  let cron: InsuranceClaimSubmissionRetryCron;

  beforeEach(() => {
    jest.resetAllMocks();
    retryPendingSubmissions.mockResolvedValue({
      attempted: 0,
      sent: 0,
      failed: 0,
      abandoned: 0,
    });
    cron = new InsuranceClaimSubmissionRetryCron(submissionService);
  });

  it('uses the CLAIM_SUBMISSION_RETRY schedule', () => {
    expect(typeof CRON_SCHEDULES.CLAIM_SUBMISSION_RETRY).toBe('string');
  });

  it('delegates to the pending-submission sweep', async () => {
    await cron.run();

    expect(retryPendingSubmissions).toHaveBeenCalledTimes(1);
  });

  it('propagates sweep failures so the heartbeat records them', async () => {
    retryPendingSubmissions.mockRejectedValue(new Error('gateway down'));

    await expect(cron.run()).rejects.toThrow('gateway down');
  });
});
