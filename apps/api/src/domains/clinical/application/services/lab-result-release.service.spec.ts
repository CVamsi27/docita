import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { ForbiddenException } from '@nestjs/common';
import { LabResultNotificationService } from './lab-result-notification.service';
import { LabResultReleaseService } from './lab-result-release.service';
import { StorageProvider } from '@/domains/documents/application/ports/storage-provider.port';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { CLOCK_PORT } from '@/shared/common/ports/clock.port';
import type { LabWorkflowRepository } from '@/domains/clinical/core/repositories/lab-workflow.repository.interface';

const NOW = new Date('2026-10-03T12:00:00.000Z');

describe('LabResultReleaseService', () => {
  let service: LabResultReleaseService;

  const context = (
    overrides: Partial<{
      phoneNumber: string | null;
      resultUrl: string | null;
      status: string;
      attempts: number;
    }> = {},
  ) => ({
    id: 'order-1',
    clinicId: 'clinic-1',
    status: overrides.status ?? 'COMPLETED',
    resultUrl:
      overrides.resultUrl === undefined
        ? 'lab-results/order-1.pdf'
        : overrides.resultUrl,
    paidAt: new Date('2026-10-03T10:00:00.000Z'),
    testName: 'CBC',
    clinicName: 'Docita Clinic',
    releasedAt: NOW,
    resultNotificationStatus: 'NOT_ATTEMPTED',
    resultNotificationAttempts: overrides.attempts ?? 0,
    patient: {
      id: 'patient-1',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phoneNumber:
        overrides.phoneNumber === undefined
          ? '+919999999999'
          : overrides.phoneNumber,
    },
  });

  const workflowRepository = {
    claimRelease: jest.fn<(claim: unknown) => Promise<boolean>>(
      async () => true,
    ),
    claimResultNotification: jest.fn<
      (claim: unknown, leaseExpiredBefore: Date) => Promise<boolean>
    >(async () => true),
    completeResultNotification: jest.fn<
      (
        id: string,
        clinicId: string,
        token: string,
        outcome: unknown,
      ) => Promise<void>
    >(async () => undefined),
    findReleaseContext: jest.fn<
      (id: string, clinicId: string) => Promise<unknown>
    >(async () => context()),
    findPendingResultNotifications: jest.fn<
      (
        before: Date,
        limit: number,
      ) => Promise<Array<{ id: string; clinicId: string }>>
    >(async () => []),
  };

  const sendMessage = {
    execute: jest.fn<(req: unknown) => Promise<unknown>>(async () => ({
      messageId: 'm1',
    })),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    workflowRepository.claimRelease.mockResolvedValue(true);
    workflowRepository.claimResultNotification.mockResolvedValue(true);
    workflowRepository.completeResultNotification.mockResolvedValue(undefined);
    workflowRepository.findReleaseContext.mockResolvedValue(context());
    workflowRepository.findPendingResultNotifications.mockResolvedValue([]);
    sendMessage.execute.mockResolvedValue({ messageId: 'm1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabResultReleaseService,
        LabResultNotificationService,
        { provide: 'LabWorkflowRepository', useValue: workflowRepository },
        {
          provide: StorageProvider,
          useValue: {
            supportsSignedUrls: false,
            generateSignedUrl: jest.fn(async () => 'signed-url'),
          },
        },
        { provide: SendMessageUseCase, useValue: sendMessage },
        { provide: CLOCK_PORT, useValue: { now: () => NOW } },
      ],
    }).compile();

    service = module.get(LabResultReleaseService);
  });

  describe('release claim', () => {
    it('claims the release before sending anything', async () => {
      await service.releaseResult({
        orderId: 'order-1',
        clinicId: 'clinic-1',
        releasedBy: 'user-1',
      });

      expect(workflowRepository.claimRelease).toHaveBeenCalledWith({
        id: 'order-1',
        clinicId: 'clinic-1',
        claimToken: expect.any(String),
        now: NOW,
        releasedBy: 'user-1',
      });
      // The claim must land before the notification, or a second caller could
      // slip a send in between.
      expect(
        workflowRepository.claimRelease.mock.invocationCallOrder[0],
      ).toBeLessThan(
        workflowRepository.claimResultNotification.mock.invocationCallOrder[0]!,
      );
      expect(sendMessage.execute).toHaveBeenCalledTimes(1);
    });

    /**
     * The defect: two callers (a manual release and the auto-release triggered by
     * a concurrent payment verification) both passed the old status check and
     * both messaged the patient.
     */
    it('does not notify when another caller won the release claim', async () => {
      workflowRepository.claimRelease.mockResolvedValue(false);
      workflowRepository.findReleaseContext.mockResolvedValue({
        ...context({ status: 'COMPLETED' }),
      });

      const outcome = await service.releaseResult({
        orderId: 'order-1',
        clinicId: 'clinic-1',
        releasedBy: 'user-2',
      });

      expect(outcome).toBe('ALREADY_RELEASED');
      expect(sendMessage.execute).not.toHaveBeenCalled();
      expect(workflowRepository.claimResultNotification).not.toHaveBeenCalled();
    });

    it('still 404s when the order does not exist', async () => {
      workflowRepository.claimRelease.mockResolvedValue(false);
      workflowRepository.findReleaseContext.mockResolvedValue(null);

      await expect(
        service.releaseResult({
          orderId: 'missing',
          clinicId: 'clinic-1',
          releasedBy: 'user-1',
        }),
      ).rejects.toThrow('Lab order not found');
    });

    it('does not notify when another worker holds a live notification claim', async () => {
      workflowRepository.claimResultNotification.mockResolvedValue(false);

      const outcome = await service.releaseResult({
        orderId: 'order-1',
        clinicId: 'clinic-1',
        releasedBy: 'user-1',
      });

      expect(outcome).toBe('RELEASED_NOTIFICATION_PENDING');
      expect(sendMessage.execute).not.toHaveBeenCalled();
    });
  });

  describe('notification delivery', () => {
    it('records SENT with the notification instant', async () => {
      await service.releaseResult({
        orderId: 'order-1',
        clinicId: 'clinic-1',
        releasedBy: 'user-1',
      });

      const call = workflowRepository.completeResultNotification.mock
        .calls[0] as unknown as [string, string, string, { status: string }];
      expect(call[0]).toBe('order-1');
      expect(call[1]).toBe('clinic-1');
      expect(call[3].status).toBe('SENT');
      // The claim token fences the write: a stale worker cannot settle a
      // notification that another worker has since taken over.
      expect(
        workflowRepository.claimResultNotification.mock.calls[0]?.[0],
      ).toMatchObject({
        claimToken: call[2],
      });
    });

    /**
     * The second defect: a WhatsApp failure was logged and the release still
     * completed, so the order read as handled while the patient was never told.
     */
    it('records FAILED and stays retryable when the send throws', async () => {
      sendMessage.execute.mockRejectedValue(new Error('provider timeout'));

      const outcome = await service.releaseResult({
        orderId: 'order-1',
        clinicId: 'clinic-1',
        releasedBy: 'user-1',
      });

      // The release stands, but the caller is told delivery did not happen.
      expect(outcome).toBe('RELEASED_NOTIFICATION_PENDING');
      const call = workflowRepository.completeResultNotification.mock
        .calls[0] as unknown as [
        string,
        string,
        string,
        { status: string; error?: string },
      ];
      expect(call[3].status).toBe('FAILED');
      expect(call[3].error).toContain('provider timeout');
    });

    it('records SKIPPED_NO_CONTACT when the patient has no phone number', async () => {
      workflowRepository.findReleaseContext.mockResolvedValue(
        context({ phoneNumber: null }),
      );

      await service.releaseResult({
        orderId: 'order-1',
        clinicId: 'clinic-1',
        releasedBy: 'user-1',
      });

      expect(sendMessage.execute).not.toHaveBeenCalled();
      const call = workflowRepository.completeResultNotification.mock
        .calls[0] as unknown as [string, string, string, { status: string }];
      expect(call[3].status).toBe('SKIPPED_NO_CONTACT');
    });

    it('treats a missing WhatsApp feature as skipped, not retryable forever', async () => {
      sendMessage.execute.mockRejectedValue(
        new ForbiddenException('WhatsApp messaging is not enabled'),
      );

      await service.releaseResult({
        orderId: 'order-1',
        clinicId: 'clinic-1',
        releasedBy: 'user-1',
      });

      const call = workflowRepository.completeResultNotification.mock
        .calls[0] as unknown as [string, string, string, { status: string }];
      expect(call[3].status).toBe('SKIPPED_NO_CONTACT');
    });

    it('records FAILED when the result file disappeared after release', async () => {
      workflowRepository.findReleaseContext.mockResolvedValue(
        context({ resultUrl: null }),
      );

      await service.releaseResult({
        orderId: 'order-1',
        clinicId: 'clinic-1',
        releasedBy: 'user-1',
      });

      expect(sendMessage.execute).not.toHaveBeenCalled();
      const call = workflowRepository.completeResultNotification.mock
        .calls[0] as unknown as [string, string, string, { status: string }];
      expect(call[3].status).toBe('FAILED');
    });

    it('does not throw when the outcome write fails after a successful send', async () => {
      // The patient was reached; losing the bookkeeping must not surface as a
      // failed release, but it must not be silent either.
      workflowRepository.completeResultNotification.mockRejectedValue(
        new Error('connection lost'),
      );

      const outcome = await service.releaseResult({
        orderId: 'order-1',
        clinicId: 'clinic-1',
        releasedBy: 'user-1',
      });

      expect(outcome).toBe('RELEASED_AND_NOTIFIED');
    });
  });

  describe('retry sweep', () => {
    it('re-attempts only outstanding notifications and reports counts', async () => {
      workflowRepository.findPendingResultNotifications.mockResolvedValue([
        { id: 'order-1', clinicId: 'clinic-1' },
        { id: 'order-2', clinicId: 'clinic-1' },
      ]);
      // order-2 is claimed by another worker and is skipped.
      workflowRepository.claimResultNotification
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);
      workflowRepository.findReleaseContext
        .mockResolvedValueOnce(context())
        .mockResolvedValueOnce(context());

      const result = await service.retryPendingNotifications();

      expect(result.attempted).toBe(2);
      expect(result.notified).toBe(1);
      expect(sendMessage.execute).toHaveBeenCalledTimes(1);
    });

    it('does nothing when no notification is outstanding', async () => {
      const result = await service.retryPendingNotifications();

      expect(result).toEqual({ attempted: 0, notified: 0, abandoned: 0 });
      expect(sendMessage.execute).not.toHaveBeenCalled();
    });

    it('reports an abandoned notification once attempts are exhausted', async () => {
      workflowRepository.findPendingResultNotifications.mockResolvedValue([
        { id: 'order-1', clinicId: 'clinic-1' },
      ]);
      workflowRepository.claimResultNotification.mockResolvedValue(true);
      sendMessage.execute.mockRejectedValue(new Error('template rejected'));
      workflowRepository.findReleaseContext.mockResolvedValue(
        context({ attempts: 5 }),
      );

      const result = await service.retryPendingNotifications();

      expect(result.abandoned).toBe(1);
      expect(result.notified).toBe(0);
    });

    it('does not count a failed send as abandoned below the attempt ceiling', async () => {
      workflowRepository.findPendingResultNotifications.mockResolvedValue([
        { id: 'order-1', clinicId: 'clinic-1' },
      ]);
      workflowRepository.claimResultNotification.mockResolvedValue(true);
      sendMessage.execute.mockRejectedValue(new Error('provider timeout'));
      workflowRepository.findReleaseContext.mockResolvedValue(
        context({ attempts: 2 }),
      );

      const result = await service.retryPendingNotifications();

      expect(result.abandoned).toBe(0);
      // Still retryable on the next sweep.
      const call = workflowRepository.completeResultNotification.mock
        .calls[0] as unknown as [string, string, string, { status: string }];
      expect(call[0]).toBe('order-1');
      expect(call[1]).toBe('clinic-1');
      expect(call[3].status).toBe('FAILED');
    });
  });
});
