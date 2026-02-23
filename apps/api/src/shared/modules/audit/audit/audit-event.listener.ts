import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { DomainEvent } from '../../../../common/events/domain-events';

/**
 * Audit Event Listener
 *
 * Listens to all domain events and logs them for audit purposes.
 * This demonstrates how modules can react to events without direct coupling.
 */
@Injectable()
export class AuditEventListener {
  private readonly logger = new Logger(AuditEventListener.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Listen to all domain events for audit logging
   */
  @OnEvent('domain.*')
  async handleDomainEvent(event: DomainEvent): Promise<void> {
    try {
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        this.logger.debug(
          `[AUDIT] ${event.type} [${event.metadata.correlationId}]`,
          JSON.stringify(event.payload),
        );
      }

      // Skip if no userId (can't create audit log without it)
      if (!event.metadata.userId) {
        this.logger.debug(`Skipping audit log for ${event.type} - no userId`);
        return;
      }

      // Determine action and entity from event type
      const [entity, action] = event.type.split('.');

      // Create audit log entry
      await this.prisma.auditLog.create({
        data: {
          action: action?.toUpperCase() ?? 'UNKNOWN',
          entityType: entity?.toUpperCase() ?? 'UNKNOWN',
          entityId: this.extractEntityId(event) ?? 'unknown',
          userId: event.metadata.userId,
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
    } catch (error) {
      // Don't let audit failures break the main flow
      this.logger.error(
        `Failed to create audit log for ${event.type}`,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Extract entity ID from event payload
   */
  private extractEntityId(event: DomainEvent): string | undefined {
    const payload = event.payload as Record<string, unknown>;

    // Common patterns for entity IDs
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
