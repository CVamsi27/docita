import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { ErrorSeverity } from '@workspace/db';

export interface WebhookErrorContext {
  clinicId?: string;
  userId?: string;
  eventType: string;
  providerId?: string;
  payload?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class WebhookErrorHandlingService {
  private readonly logger = new Logger(WebhookErrorHandlingService.name);

  constructor(private readonly prisma: PrismaService) {}

  async logWebhookError(
    error: Error,
    context: WebhookErrorContext,
    isCritical: boolean = false,
  ): Promise<void> {
    try {
      const errorLog = await this.prisma.errorLog.create({
        data: {
          clinicId: context.clinicId,
          userId: context.userId,
          type: 'WebhookError',
          message: error.message,
          stack: error.stack,
          path: `/webhooks/${context.eventType}`,
          metadata: {
            eventType: context.eventType,
            providerId: context.providerId,
            payloadHash: context.payload
              ? JSON.stringify(context.payload).substring(0, 100)
              : null,
          },
          severity: isCritical ? ErrorSeverity.CRITICAL : ErrorSeverity.ERROR,
          ip: context.ipAddress,
          userAgent: context.userAgent,
        },
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
      await this.prisma.auditLog.create({
        data: {
          clinicId: 'system',
          userId: 'webhook-processor',
          action: `WEBHOOK_${eventType.toUpperCase()}`,
          entityType: 'WEBHOOK_EVENT',
          entityId: providerId,
          status,
          errorMessage: error ? error.message : undefined,
          metadata: {
            eventType,
            timestamp: new Date().toISOString(),
          },
        },
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
