import { Inject, Injectable } from '@nestjs/common';
import { CLOCK_PORT, type IClock } from '@/shared/common/ports/clock.port';
import { ErrorSeverity } from '@workspace/db';
import { PrismaService } from '@/prisma/prisma.service';
import type {
  IWebhookEventRepository,
  WebhookAuditEventInput,
  WebhookErrorLogInput,
} from '@/domains/webhooks/application/ports/webhook-event.repository.port';

@Injectable()
export class PrismaWebhookEventRepository implements IWebhookEventRepository {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK_PORT) private readonly clock: IClock,
  ) {}

  async createErrorLog(input: WebhookErrorLogInput): Promise<{ id: string }> {
    return this.prisma.errorLog.create({
      data: {
        clinicId: input.clinicId,
        userId: input.userId,
        type: 'WebhookError',
        message: input.message,
        stack: input.stack,
        path: `/webhooks/${input.eventType}`,
        metadata: {
          eventType: input.eventType,
          providerId: input.providerId,
          payloadHash: input.payloadHash,
        },
        severity: input.isCritical
          ? ErrorSeverity.CRITICAL
          : ErrorSeverity.ERROR,
        ip: input.ipAddress,
        userAgent: input.userAgent,
      },
    });
  }

  async createAuditEvent(input: WebhookAuditEventInput): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        clinicId: 'system',
        userId: 'webhook-processor',
        action: `WEBHOOK_${input.eventType.toUpperCase()}`,
        entityType: 'WEBHOOK_EVENT',
        entityId: input.providerId,
        status: input.status,
        errorMessage: input.errorMessage,
        metadata: {
          eventType: input.eventType,
          timestamp: this.clock.now().toISOString(),
        },
      },
    });
  }
}
