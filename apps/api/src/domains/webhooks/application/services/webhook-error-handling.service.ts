import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  IWebhookEventRepository,
  WEBHOOK_EVENT_REPOSITORY_TOKEN,
} from '@/domains/webhooks/application/ports/webhook-event.repository.port';

export interface WebhookErrorContext {
  clinicId?: string;
  userId?: string;
  eventType: string;
  providerId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Thin facade — delegates webhook error logging to IWebhookEventRepository.
 */
@Injectable()
export class WebhookErrorHandlingService {
  private readonly logger = new Logger(WebhookErrorHandlingService.name);

  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY_TOKEN)
    private readonly webhookEventRepository: IWebhookEventRepository,
  ) {}

  async logWebhookError(
    error: Error,
    context: WebhookErrorContext,
    isCritical: boolean = false,
  ): Promise<void> {
    try {
      const errorLog = await this.webhookEventRepository.createErrorLog({
        clinicId: context.clinicId,
        userId: context.userId,
        eventType: context.eventType,
        providerId: context.providerId,
        payloadHash: context.payload
          ? JSON.stringify(context.payload).substring(0, 100)
          : null,
        message: error.message,
        stack: error.stack,
        isCritical,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
      });

      this.logger.error(
        `Webhook error logged: ${context.eventType} - ${error.message}`,
        {
          errorLogId: errorLog.id,
          isCritical,
          context,
        },
      );

      if (isCritical) {
        this.logger.error(`CRITICAL WEBHOOK ERROR: ${context.eventType}`, {
          error: error.message,
          context,
        });
      }
    } catch (logError) {
      this.logger.error('Failed to log webhook error to database', {
        originalError: error.message,
        logError: (logError as Error).message,
        context,
      });
    }
  }

  async trackWebhookEvent(
    eventType: string,
    providerId: string,
    status: 'PENDING' | 'SUCCESS' | 'FAILED',
    error?: Error,
  ): Promise<void> {
    try {
      await this.webhookEventRepository.createAuditEvent({
        eventType,
        providerId,
        status,
        errorMessage: error ? error.message : undefined,
      });
    } catch (auditError) {
      this.logger.warn('Failed to track webhook event', {
        eventType,
        providerId,
        status,
        auditError: (auditError as Error).message,
      });
    }
  }

  isCriticalError(error: Error, eventType: string): boolean {
    const criticalKeywords = [
      'payment',
      'transaction',
      'database',
      'transaction timeout',
      'duplicate',
      'constraint',
    ];

    const isCriticalEvent = ['payment_link', 'subscription'].includes(
      eventType,
    );
    const hasKeyword = criticalKeywords.some((keyword) =>
      error.message.toLowerCase().includes(keyword),
    );

    return isCriticalEvent || hasKeyword;
  }
}
