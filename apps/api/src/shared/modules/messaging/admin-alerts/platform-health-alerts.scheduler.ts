import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { AdminAlertsService } from './admin-alerts.service';
import { isCronDisabledInThisProcess } from '@/shared/schedule/cron-env';
import { CRON_SCHEDULES } from '@/shared/schedule/cron-schedules';

@Injectable()
export class PlatformHealthAlertsScheduler {
  private readonly logger = new Logger(PlatformHealthAlertsScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly config: AppConfigService,
    private readonly adminAlerts: AdminAlertsService,
  ) {}

  @Cron(CRON_SCHEDULES.PLATFORM_HEALTH_ALERTS, {
    disabled: isCronDisabledInThisProcess(),
  })
  async run(): Promise<void> {
    if (!this.config.isProduction()) {
      return;
    }

    await this.checkDatabase();
    await this.checkEmailProvider();
    await this.checkRazorpayConfig();
  }

  private async checkDatabase(): Promise<void> {
    const alertKey = 'db_connectivity';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
      await this.adminAlerts.markRecovered({
        alertKey,
        subject: 'Database connectivity restored',
        text: 'Database connectivity check succeeded again.',
      });
    } catch (error) {
      this.logger.error('Database connectivity check failed', error);
      await this.adminAlerts.sendAdminAlert({
        alertKey,
        severity: 'critical',
        subject: 'Database connectivity failed',
        text:
          'Docita worker failed a database connectivity check.\n' +
          `Environment: ${this.config.getEnvironment()}\n` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        dedupeWindowMs: 15 * 60 * 1000,
      });
    }
  }

  private async checkEmailProvider(): Promise<void> {
    const alertKey = 'email_provider_unhealthy';

    try {
      const ok = await this.emailService.verifyProvider();
      if (!ok) {
        await this.adminAlerts.sendAdminAlert({
          alertKey,
          severity: 'warn',
          subject: 'Email provider not configured',
          text:
            'Email provider verification failed (provider not configured or unhealthy).\n' +
            `Environment: ${this.config.getEnvironment()}`,
          dedupeWindowMs: 60 * 60 * 1000,
        });
        return;
      }

      await this.adminAlerts.markRecovered({
        alertKey,
        subject: 'Email provider healthy again',
        text: 'Email provider verification succeeded again.',
      });
    } catch (error) {
      this.logger.error('Email provider health check failed', error);
      await this.adminAlerts.sendAdminAlert({
        alertKey,
        severity: 'warn',
        subject: 'Email provider health check failed',
        text:
          'Email provider verification threw an error.\n' +
          `Environment: ${this.config.getEnvironment()}\n` +
          `Error: ${error instanceof Error ? error.message : String(error)}`,
        dedupeWindowMs: 60 * 60 * 1000,
      });
    }
  }

  private async checkRazorpayConfig(): Promise<void> {
    const alertKey = 'razorpay_config_missing';

    const keyId = this.config.getRazorpayKeyId();
    const keySecret = this.config.getRazorpayKeySecret();
    const webhookSecret = this.config.getRazorpayWebhookSecret();

    const missing = [
      !keyId ? 'RAZORPAY_KEY_ID' : null,
      !keySecret ? 'RAZORPAY_KEY_SECRET' : null,
      !webhookSecret ? 'RAZORPAY_WEBHOOK_SECRET' : null,
    ].filter((v): v is string => Boolean(v));

    if (missing.length > 0) {
      await this.adminAlerts.sendAdminAlert({
        alertKey,
        severity: 'warn',
        subject: 'Razorpay configuration missing',
        text:
          'Razorpay configuration is missing required secrets.\n' +
          `Environment: ${this.config.getEnvironment()}\n` +
          `Missing: ${missing.join(', ')}`,
        dedupeWindowMs: 6 * 60 * 60 * 1000,
      });
      return;
    }

    await this.adminAlerts.markRecovered({
      alertKey,
      subject: 'Razorpay configuration healthy again',
      text: 'Razorpay secrets are present again.',
    });
  }
}
