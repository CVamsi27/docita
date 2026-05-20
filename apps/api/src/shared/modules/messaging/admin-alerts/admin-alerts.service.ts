import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  CLOCK_PORT,
  type IClock,
} from '@/shared/common/ports/clock.port';
import { EmailService } from '@/shared/modules/messaging/email/email.service';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { PrismaService } from '@/prisma/prisma.service';

export type AdminAlertSeverity = 'info' | 'warn' | 'critical';

export interface AdminAlertOptions {
  alertKey: string;
  severity: AdminAlertSeverity;
  subject: string;
  text: string;
  html?: string;
  /**
   * Minimum interval between notifications for the same alert key.
   * Defaults to 30 minutes.
   */
  dedupeWindowMs?: number;
}

@Injectable()
export class AdminAlertsService {
  private readonly logger = new Logger(AdminAlertsService.name);

  private readonly primaryAdminEmail = 'admin@docita.work';
  private readonly ceoEmail = 'vkc@docita.work';
  private readonly defaultDedupeWindowMs = 30 * 60 * 1000;

  constructor(
    private readonly emailService: EmailService,
    private readonly config: AppConfigService,
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  private async shouldSend(
    alertKey: string,
    dedupeWindowMs: number,
  ): Promise<boolean> {
    const now = this.clock.now();
    const environment = this.config.getEnvironment();

    const existing = await this.prisma.platformAlert.findUnique({
      where: {
        alertKey_environment: {
          alertKey,
          environment,
        },
      },
      select: {
        lastNotifiedAt: true,
      },
    });

    const lastNotifiedAt = existing?.lastNotifiedAt ?? null;
    if (
      lastNotifiedAt &&
      now.getTime() - lastNotifiedAt.getTime() < dedupeWindowMs
    ) {
      return false;
    }

    await this.prisma.platformAlert.upsert({
      where: {
        alertKey_environment: {
          alertKey,
          environment,
        },
      },
      create: {
        alertKey,
        environment,
        status: 'OPEN',
        firstSeenAt: now,
        lastSeenAt: now,
        lastNotifiedAt: now,
      },
      update: {
        status: 'OPEN',
        lastSeenAt: now,
        lastNotifiedAt: now,
        recoveredAt: null,
      },
    });

    return true;
  }

  private resolveRecipients(severity: AdminAlertSeverity): string[] {
    if (severity === 'critical') {
      return [this.primaryAdminEmail, this.ceoEmail];
    }
    return [this.primaryAdminEmail];
  }

  async sendAdminAlert(options: AdminAlertOptions): Promise<boolean> {
    if (!this.config.isProduction()) {
      return false;
    }

    const dedupeWindowMs = options.dedupeWindowMs ?? this.defaultDedupeWindowMs;
    if (!(await this.shouldSend(options.alertKey, dedupeWindowMs))) {
      return false;
    }

    const to = this.resolveRecipients(options.severity);
    const subjectPrefix =
      options.severity === 'critical'
        ? '[DOCITA CRITICAL]'
        : options.severity === 'warn'
          ? '[DOCITA WARN]'
          : '[DOCITA]';
    const subject = `${subjectPrefix} ${options.subject}`;

    try {
      const result = await this.emailService.send({
        to,
        subject,
        text: options.text,
        html: options.html,
        from: this.config.getEmailFrom(),
        replyTo: 'support@docita.work',
      });

      if (!result.success) {
        this.logger.error('Failed to send admin alert email', result.error);
      }
      return result.success;
    } catch (error) {
      this.logger.error('Admin alert send threw an error', error);
      return false;
    }
  }

  async markRecovered(options: {
    alertKey: string;
    subject: string;
    text: string;
    html?: string;
  }): Promise<boolean> {
    if (!this.config.isProduction()) {
      return false;
    }

    const now = this.clock.now();
    const environment = this.config.getEnvironment();

    const existing = await this.prisma.platformAlert.findUnique({
      where: {
        alertKey_environment: {
          alertKey: options.alertKey,
          environment,
        },
      },
      select: {
        status: true,
        recoveredAt: true,
      },
    });

    // Only send a recovery email if we previously had an OPEN alert.
    if (!existing || existing.status !== 'OPEN') {
      return false;
    }

    await this.prisma.platformAlert.update({
      where: {
        alertKey_environment: {
          alertKey: options.alertKey,
          environment,
        },
      },
      data: {
        status: 'RECOVERED',
        recoveredAt: now,
        lastSeenAt: now,
        lastNotifiedAt: now,
      },
    });

    try {
      const result = await this.emailService.send({
        to: [this.primaryAdminEmail],
        subject: `[DOCITA RECOVERED] ${options.subject}`,
        text: options.text,
        html: options.html,
        from: this.config.getEmailFrom(),
        replyTo: 'support@docita.work',
      });

      if (!result.success) {
        this.logger.error('Failed to send admin recovery email', result.error);
      }
      return result.success;
    } catch (error) {
      this.logger.error('Recovery alert send threw an error', error);
      return false;
    }
  }
}
