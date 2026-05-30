import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '@/prisma/prisma.service';
import { DomainEvent } from '@/shared/common/events/domain-events';
import { AppConfigService } from '@/shared/modules/config/app-configuration.service';
import { runOutsideActiveTx } from '@/shared/modules/rls/active-tx.storage';

@Injectable()
export class AuditEventListener {
  private readonly logger = new Logger(AuditEventListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: AppConfigService,
  ) {}

  private toRecord(value: unknown): Record<string, unknown> {
    if (!value || typeof value !== 'object') {
      return {};
    }

    return Object.fromEntries(Object.entries(value));
  }

  @OnEvent('domain.*')
  async handleDomainEvent(event: DomainEvent): Promise<void> {
    try {
      if (this.configService.isDevelopment()) {
        this.logger.debug(
          `[AUDIT] ${event.type} [${event.metadata.correlationId}]`,
          JSON.stringify(event.payload),
        );
      }

      const userId = event.metadata.userId;
      if (!userId) {
        this.logger.debug(`Skipping audit log for ${event.type} - no userId`);
        return;
      }

      const [entity, action] = event.type.split('.');

      await this.prisma.runUnrestricted(async () =>
        runOutsideActiveTx(async () => {
          await this.prisma.auditLog.create({
            data: {
              action: action?.toUpperCase() ?? 'UNKNOWN',
              entityType: entity?.toUpperCase() ?? 'UNKNOWN',
              entityId: this.extractEntityId(event) ?? 'unknown',
              userId,
              clinicId: event.metadata.clinicId,
              metadata: JSON.parse(
                JSON.stringify({
                  correlationId: event.metadata.correlationId,
                  source: event.metadata.source,
                  payload: event.payload,
                  version: event.metadata.version,
                }),
              ),
            },
          });
        }),
      );
    } catch (error) {
      this.logger.error(
        `Failed to create audit log for ${event.type}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  private extractEntityId(event: DomainEvent): string | undefined {
    const payload = this.toRecord(event.payload);

    const idFields = [
      'patientId',
      'appointmentId',
      'prescriptionId',
      'invoiceId',
      'documentId',
      'userId',
      'clinicId',
      'id',
    ];

    for (const field of idFields) {
      if (typeof payload[field] === 'string') {
        return payload[field];
      }
    }

    return undefined;
  }
}
