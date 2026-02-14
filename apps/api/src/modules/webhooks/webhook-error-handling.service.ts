import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorSeverity } from '@workspace/db';

export interface WebhookErrorContext {
  clinicId?: string;
  userId?: string;
  eventType: string; // 'payment.webhook', 'subscription.webhook', etc.
  providerId?: string; // Payment provider ID, subscription ID, etc.
  payload?: any;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class WebhookErrorHandlingService {
  private readonly logger = new Logger(WebhookErrorHandlingService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log webhook errors for audit trail and debugging
   * Critical errors are logged with CRITICAL severity for alerting
   */
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

      // For critical errors, log to monitoring system
      if (isCritical) {
        this.logger.error(`CRITICAL WEBHOOK ERROR: ${context.eventType}`, {
          error: error.message,
          context,
        });
      }
    } catch (logError) {
      // Fallback: if we can't log to DB, at least log to logger
      this.logger.error('Failed to log webhook error to database', {
        originalError: error.message,
        logError: (logError as Error).message,
        context,
      });
    }
  }

  /**
   * Track webhook event processing for audit trail
   * Status: PENDING → SUCCESS or FAILED
   */
  async trackWebhookEvent(
    eventType: string,
    providerId: string,
    status: 'PENDING' | 'SUCCESS' | 'FAILED',
    error?: Error,
  ): Promise<void> {
    try {
      // Only try to log if we have clinic context (can be null for some webhooks)
      // For production: ensure all webhook events can identify their clinic
      await this.prisma.auditLog.create({
        data: {
          clinicId: 'system', // TODO: Parse from payload when available
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
      // Don't let audit logging failures affect webhook processing
      this.logger.warn('Failed to track webhook event', {
        eventType,
        providerId,
        status,
        auditError: (auditError as Error).message,
      });
    }
  }

  /**
   * Determine if an error is critical enough to alert
   * Critical: Payment failures, subscription failures, data consistency issues
   */
  isCriticalError(error: Error, eventType: string): boolean {
    // Critical keywords that indicate payment/subscription issues
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
