import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { AdminAlertsService } from './admin-alerts.service';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';
import { PlatformHealthAlertsScheduler } from './platform-health-alerts.scheduler';

describe('PlatformHealthAlertsScheduler', () => {
  const queryRawMock = jest.fn<() => Promise<unknown>>();
  const verifyProviderMock = jest.fn<EmailService['verifyProvider']>();
  const isProductionMock = jest.fn<() => boolean>();
  const getEnvironmentMock = jest.fn<AppConfigService['getEnvironment']>();
  const getRazorpayKeyIdMock = jest.fn<() => string>();
  const getRazorpayKeySecretMock = jest.fn<() => string>();
  const getRazorpayWebhookSecretMock = jest.fn<() => string>();
  const sendAdminAlertMock = jest.fn<AdminAlertsService['sendAdminAlert']>();
  const markRecoveredMock = jest.fn<AdminAlertsService['markRecovered']>();

  const prisma = Object.create(PrismaService.prototype) as PrismaService;
  Object.defineProperties(prisma, {
    $queryRaw: { value: queryRawMock, writable: true },
  });

  const emailService = Object.create(EmailService.prototype) as EmailService;
  emailService.verifyProvider = verifyProviderMock;

  const config = Object.create(AppConfigService.prototype) as AppConfigService;
  config.isProduction = isProductionMock;
  config.getEnvironment = getEnvironmentMock;
  config.getRazorpayKeyId = getRazorpayKeyIdMock;
  config.getRazorpayKeySecret = getRazorpayKeySecretMock;
  config.getRazorpayWebhookSecret = getRazorpayWebhookSecretMock;

  const adminAlerts = Object.create(
    AdminAlertsService.prototype,
  ) as AdminAlertsService;
  adminAlerts.sendAdminAlert = sendAdminAlertMock;
  adminAlerts.markRecovered = markRecoveredMock;

  const scheduler = new PlatformHealthAlertsScheduler(
    prisma,
    emailService,
    config,
    adminAlerts,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    isProductionMock.mockReturnValue(true);
    getEnvironmentMock.mockReturnValue('production');
    getRazorpayKeyIdMock.mockReturnValue('rzp_key_id');
    getRazorpayKeySecretMock.mockReturnValue('rzp_key_secret');
    getRazorpayWebhookSecretMock.mockReturnValue('rzp_webhook_secret');
    verifyProviderMock.mockResolvedValue(true);
    queryRawMock.mockResolvedValue(undefined);
    sendAdminAlertMock.mockResolvedValue(false);
    markRecoveredMock.mockResolvedValue(false);
  });

  it('is wired to the every-2-minutes platform health cron expression', () => {
    expect(CRON_SCHEDULES.PLATFORM_HEALTH_ALERTS).toBe('*/2 * * * *');
  });

  it('skips all health checks outside production', async () => {
    isProductionMock.mockReturnValue(false);

    await scheduler.run();

    expect(queryRawMock).not.toHaveBeenCalled();
    expect(verifyProviderMock).not.toHaveBeenCalled();
    expect(sendAdminAlertMock).not.toHaveBeenCalled();
    expect(markRecoveredMock).not.toHaveBeenCalled();
  });

  it('marks all three systems recovered when healthy', async () => {
    await scheduler.run();

    expect(markRecoveredMock).toHaveBeenCalledWith({
      alertKey: 'db_connectivity',
      subject: 'Database connectivity restored',
      text: 'Database connectivity check succeeded again.',
    });
    expect(markRecoveredMock).toHaveBeenCalledWith({
      alertKey: 'email_provider_unhealthy',
      subject: 'Email provider healthy again',
      text: 'Email provider verification succeeded again.',
    });
    expect(markRecoveredMock).toHaveBeenCalledWith({
      alertKey: 'razorpay_config_missing',
      subject: 'Razorpay configuration healthy again',
      text: 'Razorpay secrets are present again.',
    });
    expect(sendAdminAlertMock).not.toHaveBeenCalled();
  });

  it('raises a critical alert on database failure and still runs the other checks', async () => {
    queryRawMock.mockRejectedValueOnce(new Error('connection refused'));

    await scheduler.run();

    expect(sendAdminAlertMock).toHaveBeenCalledWith({
      alertKey: 'db_connectivity',
      severity: 'critical',
      subject: 'Database connectivity failed',
      text: expect.stringContaining('connection refused'),
      dedupeWindowMs: 15 * 60 * 1000,
    });
    // the email and razorpay checks still run after the isolated db failure
    expect(verifyProviderMock).toHaveBeenCalledTimes(1);
    expect(markRecoveredMock).toHaveBeenCalledWith(
      expect.objectContaining({ alertKey: 'razorpay_config_missing' }),
    );
  });

  it('warns when the email provider is not configured', async () => {
    verifyProviderMock.mockResolvedValueOnce(false);

    await scheduler.run();

    expect(sendAdminAlertMock).toHaveBeenCalledWith({
      alertKey: 'email_provider_unhealthy',
      severity: 'warn',
      subject: 'Email provider not configured',
      text: expect.stringContaining('provider not configured or unhealthy'),
      dedupeWindowMs: 60 * 60 * 1000,
    });
    expect(markRecoveredMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ alertKey: 'email_provider_unhealthy' }),
    );
  });

  it('warns when the email provider health check throws', async () => {
    verifyProviderMock.mockRejectedValueOnce(new Error('smtp boom'));

    await scheduler.run();

    expect(sendAdminAlertMock).toHaveBeenCalledWith({
      alertKey: 'email_provider_unhealthy',
      severity: 'warn',
      subject: 'Email provider health check failed',
      text: expect.stringContaining('smtp boom'),
      dedupeWindowMs: 60 * 60 * 1000,
    });
  });

  it('warns listing the missing razorpay secrets', async () => {
    getRazorpayKeyIdMock.mockReturnValue('');
    getRazorpayWebhookSecretMock.mockReturnValue('');

    await scheduler.run();

    expect(sendAdminAlertMock).toHaveBeenCalledWith({
      alertKey: 'razorpay_config_missing',
      severity: 'warn',
      subject: 'Razorpay configuration missing',
      text: expect.stringContaining(
        'RAZORPAY_KEY_ID, RAZORPAY_WEBHOOK_SECRET',
      ),
      dedupeWindowMs: 6 * 60 * 60 * 1000,
    });
    expect(markRecoveredMock).not.toHaveBeenCalledWith(
      expect.objectContaining({ alertKey: 'razorpay_config_missing' }),
    );
  });
});
