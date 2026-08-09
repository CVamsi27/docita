import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaService } from '@/prisma/prisma.service';
import { SendMessageUseCase } from '@/domains/whatsapp/application/use-cases/send-message.use-case';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { WhatsappCampaignDispatchCron } from './whatsapp-campaign-dispatch.cron';

const FIXED_NOW = new Date('2026-06-12T00:00:00.000Z');
const RETRY_DELAY_MS = 5 * 60_000;
const MAX_JOB_ATTEMPTS = 3;

type RecipientRow = {
  id: string;
  phoneNumber: string;
  status: string;
  variables?: unknown;
  patient?: { whatsappConsent: boolean } | null;
};

type JobRow = {
  id: string;
  clinicId?: string;
  status: string;
  attempts: number;
  templateName?: string | null;
  languageCode?: string;
  recipients: RecipientRow[];
};

describe('WhatsappCampaignDispatchCron', () => {
  const queryRawMock = jest.fn<() => Promise<Array<{ id: string }>>>();
  const jobFindUniqueMock =
    jest.fn<(args: unknown) => Promise<JobRow | null>>();
  const jobUpdateMock =
    jest.fn<(args: unknown) => Promise<Record<string, never>>>();
  const recipientUpdateMock =
    jest.fn<(args: unknown) => Promise<Record<string, never>>>();
  const recipientCountMock = jest.fn<(args: unknown) => Promise<number>>();
  const sendMessageExecuteMock = jest.fn<SendMessageUseCase['execute']>();

  const prisma = Object.create(PrismaService.prototype) as PrismaService;
  Object.defineProperties(prisma, {
    $queryRaw: { value: queryRawMock, writable: true },
    whatsAppBroadcastJob: {
      value: { findUnique: jobFindUniqueMock, update: jobUpdateMock },
      writable: true,
    },
    whatsAppBroadcastRecipient: {
      value: { update: recipientUpdateMock, count: recipientCountMock },
      writable: true,
    },
  });

  const sendMessage = Object.create(
    SendMessageUseCase.prototype,
  ) as SendMessageUseCase;
  sendMessage.execute = sendMessageExecuteMock;

  const clock = { now: () => FIXED_NOW };
  const scheduler = new WhatsappCampaignDispatchCron(prisma, sendMessage, clock);

  beforeEach(() => {
    jest.clearAllMocks();
    queryRawMock.mockResolvedValue([]);
    sendMessageExecuteMock.mockResolvedValue({
      messageId: 'm1',
      providerMessageId: 'prov-1',
    });
    jobFindUniqueMock.mockResolvedValue(null);
    recipientCountMock.mockResolvedValue(0);
    jobUpdateMock.mockResolvedValue({});
    recipientUpdateMock.mockResolvedValue({});
  });

  it('is wired to the every-minute campaign dispatch cron expression', () => {
    expect(CRON_SCHEDULES.WHATSAPP_CAMPAIGN_DISPATCH).toBe('*/1 * * * *');
  });

  it('does nothing when no jobs are claimable', async () => {
    await scheduler.run();

    expect(jobFindUniqueMock).not.toHaveBeenCalled();
    expect(sendMessageExecuteMock).not.toHaveBeenCalled();
    expect(jobUpdateMock).not.toHaveBeenCalled();
  });

  it('dispatches a claimed job and completes the broadcast with exact delegate args', async () => {
    queryRawMock.mockResolvedValue([{ id: 'job_1' }]);
    jobFindUniqueMock.mockResolvedValue({
      id: 'job_1',
      clinicId: 'clinic_1',
      status: 'RUNNING',
      attempts: 0,
      templateName: 'appointment_reminder',
      languageCode: 'en',
      recipients: [
        {
          id: 'r1',
          phoneNumber: '+919000000001',
          status: 'PENDING',
          variables: { name: 'Ravi', age: 30 },
          patient: { whatsappConsent: true },
        },
      ],
    });
    recipientCountMock
      .mockResolvedValueOnce(0) // pending
      .mockResolvedValueOnce(1) // sent
      .mockResolvedValueOnce(0); // failed

    await scheduler.run();

    expect(jobFindUniqueMock).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      include: {
        recipients: {
          where: { status: 'PENDING' },
          orderBy: { createdAt: 'asc' },
          include: { patient: { select: { whatsappConsent: true } } },
        },
      },
    });
    expect(sendMessageExecuteMock).toHaveBeenCalledWith({
      clinicId: 'clinic_1',
      recipientPhone: '+919000000001',
      templateName: 'appointment_reminder',
      languageCode: 'en',
      variables: { name: 'Ravi' }, // non-string entries filtered out
    });
    expect(recipientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: {
        status: 'SENT',
        providerMessageId: 'prov-1',
        sentAt: FIXED_NOW,
        attempts: { increment: 1 },
        lastAttemptAt: FIXED_NOW,
        errorMessage: null,
      },
    });
    expect(jobUpdateMock).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: {
        sentCount: 1,
        failedCount: 0,
        status: 'COMPLETED',
        completedAt: FIXED_NOW,
        nextAttemptAt: null,
        leaseExpiresAt: null,
      },
    });
  });

  it('skips recipients without WhatsApp consent at dispatch time', async () => {
    queryRawMock.mockResolvedValue([{ id: 'job_1' }]);
    jobFindUniqueMock.mockResolvedValue({
      id: 'job_1',
      clinicId: 'clinic_1',
      status: 'RUNNING',
      attempts: 0,
      recipients: [
        {
          id: 'r1',
          phoneNumber: '+919000000001',
          status: 'PENDING',
          patient: null,
        },
      ],
    });

    await scheduler.run();

    expect(sendMessageExecuteMock).not.toHaveBeenCalled();
    expect(recipientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: {
        status: 'SKIPPED',
        skipReason: 'WhatsApp consent missing at dispatch',
      },
    });
    // no pending recipients remain -> the job completes with zero sends
    expect(jobUpdateMock).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: {
        sentCount: 0,
        failedCount: 0,
        status: 'COMPLETED',
        completedAt: FIXED_NOW,
        nextAttemptAt: null,
        leaseExpiresAt: null,
      },
    });
  });

  it('passes undefined template and variables when the job/recipient carry none', async () => {
    queryRawMock.mockResolvedValue([{ id: 'job_1' }]);
    jobFindUniqueMock.mockResolvedValue({
      id: 'job_1',
      clinicId: 'clinic_1',
      status: 'RUNNING',
      attempts: 0,
      templateName: null,
      languageCode: 'en',
      recipients: [
        {
          id: 'r1',
          phoneNumber: '+919000000001',
          status: 'PENDING',
          variables: null,
          patient: { whatsappConsent: true },
        },
      ],
    });

    await scheduler.run();

    expect(sendMessageExecuteMock).toHaveBeenCalledWith({
      clinicId: 'clinic_1',
      recipientPhone: '+919000000001',
      templateName: undefined,
      languageCode: 'en',
      variables: undefined,
    });
  });

  it('keeps the job PENDING for retry when a send fails below max attempts', async () => {
    queryRawMock.mockResolvedValue([{ id: 'job_1' }]);
    jobFindUniqueMock.mockResolvedValue({
      id: 'job_1',
      clinicId: 'clinic_1',
      status: 'RUNNING',
      attempts: 1,
      templateName: null,
      languageCode: 'hi',
      recipients: [
        {
          id: 'r1',
          phoneNumber: '+919000000001',
          status: 'PENDING',
          patient: { whatsappConsent: true },
        },
      ],
    });
    sendMessageExecuteMock.mockRejectedValueOnce(new Error('provider down'));
    recipientCountMock
      .mockResolvedValueOnce(1) // pending
      .mockResolvedValueOnce(0) // sent
      .mockResolvedValueOnce(0); // failed

    await scheduler.run();

    expect(recipientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: {
        status: 'PENDING',
        attempts: { increment: 1 },
        lastAttemptAt: FIXED_NOW,
        errorMessage: 'provider down',
      },
    });
    expect(jobUpdateMock).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: {
        sentCount: 0,
        failedCount: 0,
        status: 'PENDING',
        completedAt: null,
        nextAttemptAt: new Date(FIXED_NOW.getTime() + RETRY_DELAY_MS),
        leaseExpiresAt: null,
      },
    });
  });

  it('fails the recipient when the job has exhausted its attempts', async () => {
    queryRawMock.mockResolvedValue([{ id: 'job_1' }]);
    jobFindUniqueMock.mockResolvedValue({
      id: 'job_1',
      clinicId: 'clinic_1',
      status: 'RUNNING',
      attempts: MAX_JOB_ATTEMPTS,
      recipients: [
        {
          id: 'r1',
          phoneNumber: '+919000000001',
          status: 'PENDING',
          patient: { whatsappConsent: true },
        },
      ],
    });
    sendMessageExecuteMock.mockRejectedValueOnce(new Error('provider down'));
    recipientCountMock
      .mockResolvedValueOnce(0) // pending
      .mockResolvedValueOnce(0) // sent
      .mockResolvedValueOnce(1); // failed

    await scheduler.run();

    expect(recipientUpdateMock).toHaveBeenCalledWith({
      where: { id: 'r1' },
      data: {
        status: 'FAILED',
        attempts: { increment: 1 },
        lastAttemptAt: FIXED_NOW,
        errorMessage: 'provider down',
      },
    });
    expect(jobUpdateMock).toHaveBeenCalledWith({
      where: { id: 'job_1' },
      data: {
        sentCount: 0,
        failedCount: 1,
        status: 'COMPLETED',
        completedAt: FIXED_NOW,
        nextAttemptAt: null,
        leaseExpiresAt: null,
      },
    });
  });

  it('skips dispatch for jobs without a clinic or marked CANCELLED', async () => {
    queryRawMock.mockResolvedValue([{ id: 'job_orphan' }, { id: 'job_cancelled' }]);
    jobFindUniqueMock
      .mockResolvedValueOnce({
        id: 'job_orphan',
        status: 'RUNNING',
        attempts: 0,
        recipients: [{ id: 'r1', phoneNumber: '+919000000001', status: 'PENDING' }],
      })
      .mockResolvedValueOnce({
        id: 'job_cancelled',
        clinicId: 'clinic_1',
        status: 'CANCELLED',
        attempts: 0,
        recipients: [{ id: 'r2', phoneNumber: '+919000000002', status: 'PENDING' }],
      });

    await scheduler.run();

    expect(sendMessageExecuteMock).not.toHaveBeenCalled();
    expect(recipientUpdateMock).not.toHaveBeenCalled();
    expect(jobUpdateMock).not.toHaveBeenCalled();
  });

  it('dispatches claimed jobs in parallel and isolates a failing dispatch', async () => {
    queryRawMock.mockResolvedValue([{ id: 'job_a' }, { id: 'job_b' }]);
    jobFindUniqueMock
      .mockResolvedValueOnce({
        id: 'job_a',
        clinicId: 'clinic_1',
        status: 'RUNNING',
        attempts: 0,
        recipients: [],
      })
      .mockRejectedValueOnce(new Error('db boom'));

    await expect(scheduler.run()).resolves.toBeUndefined();

    expect(jobFindUniqueMock).toHaveBeenCalledTimes(2);
  });
});
